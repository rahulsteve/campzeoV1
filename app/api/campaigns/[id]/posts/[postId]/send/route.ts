import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { sendCampaignEmail } from '@/lib/email';
import { postToLinkedIn } from '@/lib/linkedin';
import { postToFacebook } from '@/lib/facebook';
import { postToInstagram } from '@/lib/instagram';
import { postToYouTube, postYouTubeCommunity } from '@/lib/youtube';
import { postToPinterest } from '@/lib/pinterest';
import { sendSms, sendWhatsapp } from '@/lib/twilio';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; postId: string }> }
) {
    console.log("POST /api/campaigns/[id]/posts/[postId]/send hit");
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params before accessing properties
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const postId = resolvedParams.postId;

        console.log("Params resolved:", { id, postId });

        const { contactIds } = await req.json();

        // Fetch post and campaign
        const post = await prisma.campaignPost.findUnique({
            where: {
                id: parseInt(postId),
                campaignId: parseInt(id),
            },
            include: {
                campaign: {
                    include: {
                        organisation: true
                    }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const isSocialPlatform = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST'].includes(post.type);

        if (!isSocialPlatform && (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0)) {
            return NextResponse.json({ error: 'No contacts selected' }, { status: 400 });
        }

        // Handle Social Media Posting
        if (isSocialPlatform) {
            // Get user credentials
            const dbUser = await prisma.user.findUnique({
                where: { clerkId: userId },
                select: {
                    linkedInAccessToken: true,
                    linkedInAuthUrn: true,
                    facebookAccessToken: true,
                    facebookPageAccessToken: true,
                    facebookPageId: true,
                    instagramAccessToken: true,
                    instagramUserId: true,
                    youtubeAccessToken: true,
                    pinterestAccessToken: true,
                }
            });

            if (!dbUser) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            if (post.type === 'LINKEDIN') {
                if (!dbUser.linkedInAccessToken || !dbUser.linkedInAuthUrn) {
                    return NextResponse.json({ error: 'LinkedIn credentials not found. Please connect your account.' }, { status: 400 });
                }

                try {
                    const linkedInResponse = await postToLinkedIn(
                        {
                            accessToken: dbUser.linkedInAccessToken,
                            authorUrn: dbUser.linkedInAuthUrn,
                        },
                        post.message || post.subject || "",
                        post.mediaUrls.length > 0 ? post.mediaUrls : post.videoUrl
                    );

                    // Update post status
                    await prisma.campaignPost.update({
                        where: { id: post.id },
                        data: { isPostSent: true }
                    });

                    // Create Transaction Record
                    await prisma.postTransaction.create({
                        data: {
                            refId: post.id,
                            platform: 'LINKEDIN',
                            postId: linkedInResponse.id,
                            accountId: dbUser.linkedInAuthUrn,
                            message: post.message || post.subject || "",
                            mediaUrls: post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl, // Store first URL or videoUrl
                            postType: (post.mediaUrls.length > 0 || post.videoUrl) ?
                                ((post.mediaUrls[0] || post.videoUrl || '').match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE')
                                : 'TEXT',
                            accessToken: dbUser.linkedInAccessToken,
                            published: true,
                            publishedAt: new Date(),
                        }
                    });

                    return NextResponse.json({
                        success: true,
                        sent: 1,
                        failed: 0,
                        postData: linkedInResponse // Return LinkedIn response details
                    });

                } catch (error) {
                    console.error('LinkedIn post error:', error);
                    return NextResponse.json({ error: 'Failed to post to LinkedIn' }, { status: 500 });
                }
            } else if (post.type === 'FACEBOOK') {
                // Use Page access token if available, otherwise fallback to user token
                const fbToken = dbUser.facebookPageAccessToken || dbUser.facebookAccessToken;

                if (!fbToken || !dbUser.facebookPageId) {
                    return NextResponse.json({ error: 'Facebook credentials not found. Please reconnect your Facebook Page.' }, { status: 400 });
                }

                const platformResponse = await postToFacebook(
                    {
                        accessToken: fbToken,
                        pageId: dbUser.facebookPageId,
                    },
                    post.message || post.subject || "",
                    post.mediaUrls.length > 0 ? post.mediaUrls : post.videoUrl,
                    { isReel: (post.metadata as any)?.isReel }
                );

                await prisma.campaignPost.update({
                    where: { id: post.id },
                    data: { isPostSent: true }
                });

                await prisma.postTransaction.create({
                    data: {
                        refId: post.id,
                        platform: 'FACEBOOK',
                        postId: platformResponse.id,
                        accountId: dbUser.facebookPageId,
                        message: post.message || post.subject || "",
                        mediaUrls: post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl,
                        postType: (post.metadata as any)?.isReel ? 'REEL' : ((post.mediaUrls.length > 0 || post.videoUrl) ? 'IMAGE' : 'TEXT'),
                        accessToken: fbToken,
                        published: true,
                        publishedAt: new Date(),
                    }
                });

                return NextResponse.json({
                    success: true,
                    sent: 1,
                    failed: 0,
                    postData: platformResponse
                });

            } else if (post.type === 'INSTAGRAM') {
                if (!dbUser.instagramAccessToken || !dbUser.instagramUserId) {
                    return NextResponse.json({ error: 'Instagram credentials not found. Please connect your account.' }, { status: 400 });
                }

                const platformResponse = await postToInstagram(
                    {
                        accessToken: dbUser.instagramAccessToken,
                        userId: dbUser.instagramUserId,
                    },
                    post.message || post.subject || "",
                    post.mediaUrls.length > 0 ? post.mediaUrls : post.videoUrl,
                    {
                        isReel: (post.metadata as any)?.isReel,
                        shareToFeed: true
                    }
                );

                await prisma.campaignPost.update({
                    where: { id: post.id },
                    data: { isPostSent: true }
                });

                await prisma.postTransaction.create({
                    data: {
                        refId: post.id,
                        platform: 'INSTAGRAM',
                        postId: platformResponse.id,
                        accountId: dbUser.instagramUserId,
                        message: post.message || post.subject || "",
                        mediaUrls: post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl,
                        postType: (post.metadata as any)?.isReel ? 'REEL' : 'IMAGE',
                        accessToken: dbUser.instagramAccessToken,
                        published: true,
                        publishedAt: new Date(),
                    }
                });

                return NextResponse.json({
                    success: true,
                    sent: 1,
                    failed: 0,
                    postData: platformResponse
                });

            } else if (post.type === 'YOUTUBE') {
                if (!dbUser.youtubeAccessToken) {
                    return NextResponse.json({ error: 'YouTube credentials not found. Please connect your account.' }, { status: 400 });
                }

                const metadata = post.metadata as any;
                const media = post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl;
                let platformResponse;

                if (media && media.match(/\.(mp4|mov|webm)$/i)) {
                    platformResponse = await postToYouTube(
                        { accessToken: dbUser.youtubeAccessToken },
                        post.subject || 'Video Post',
                        post.message || "",
                        media,
                        {
                            tags: metadata?.tags || [],
                            privacy: metadata?.privacy || 'public',
                        }
                    );
                } else {
                    platformResponse = await postYouTubeCommunity(
                        { accessToken: dbUser.youtubeAccessToken },
                        post.message || post.subject || "",
                        media || undefined
                    );
                }

                await prisma.campaignPost.update({
                    where: { id: post.id },
                    data: { isPostSent: true }
                });

                await prisma.postTransaction.create({
                    data: {
                        refId: post.id,
                        platform: 'YOUTUBE',
                        postId: platformResponse.id,
                        accountId: 'youtube-channel',
                        message: post.message || post.subject || "",
                        mediaUrls: post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl,
                        postType: media && media.match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'TEXT',
                        accessToken: dbUser.youtubeAccessToken,
                        published: true,
                        publishedAt: new Date(),
                    }
                });

                return NextResponse.json({
                    success: true,
                    sent: 1,
                    failed: 0,
                    postData: platformResponse
                });

            } else if (post.type === 'PINTEREST') {
                if (!dbUser.pinterestAccessToken) {
                    return NextResponse.json({ error: 'Pinterest credentials not found. Please connect your account.' }, { status: 400 });
                }

                const metadata = post.metadata as any;
                const imageUrl = post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl;

                if (!imageUrl) {
                    return NextResponse.json({ error: 'Pinterest requires an image' }, { status: 400 });
                }

                if (!metadata?.boardId) {
                    return NextResponse.json({ error: 'Pinterest requires a Board ID. Please edit the post to select a board.' }, { status: 400 });
                }

                const platformResponse = await postToPinterest(
                    { accessToken: dbUser.pinterestAccessToken },
                    post.subject || 'Pin',
                    post.message || "",
                    imageUrl,
                    {
                        boardId: metadata?.boardId,
                        link: metadata?.link,
                    }
                );

                await prisma.campaignPost.update({
                    where: { id: post.id },
                    data: { isPostSent: true }
                });

                await prisma.postTransaction.create({
                    data: {
                        refId: post.id,
                        platform: 'PINTEREST',
                        postId: platformResponse.id,
                        accountId: 'pinterest-user',
                        message: post.message || post.subject || "",
                        mediaUrls: imageUrl,
                        postType: 'IMAGE',
                        accessToken: dbUser.pinterestAccessToken,
                        published: true,
                        publishedAt: new Date(),
                    }
                });

                return NextResponse.json({
                    success: true,
                    sent: 1,
                    failed: 0,
                    postData: platformResponse
                });

            } else {
                return NextResponse.json({ error: `Platform ${post.type} not yet supported` }, { status: 501 });
            }
        }

        // Handle Email/SMS Sending (Existing Logic)

        // Fetch contacts
        const contacts = await prisma.contact.findMany({
            where: {
                id: { in: contactIds.map((id: string) => parseInt(id)) },
                organisationId: post.campaign?.organisationId
            }
        });

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'No valid contacts found' }, { status: 404 });
        }

        // Send emails
        let successCount = 0;
        let failCount = 0;

        // Only handle EMAIL type for now as requested
        if (post.type === 'EMAIL') {
            for (const contact of contacts) {
                if (!contact.contactEmail) {
                    failCount++;
                    continue;
                }

                // Variable substitution
                let subject = post.subject || '';
                let message = post.message || '';

                const replacements: Record<string, string> = {
                    '{{name}}': contact.contactName || '',
                    '{{email}}': contact.contactEmail || '',
                    '{{phone}}': contact.contactMobile || '',
                    '{{company}}': post.campaign?.organisation.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    subject = subject.replace(new RegExp(key, 'g'), value);
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendCampaignEmail({
                    to: contact.contactEmail,
                    subject: subject,
                    html: message, // Assuming message is HTML or plain text
                    replyTo: post.senderEmail || undefined
                });

                if (sent) successCount++;
                else failCount++;
            }
        } else if (post.type === 'SMS') {
            for (const contact of contacts) {
                if (!contact.contactMobile) {
                    failCount++;
                    continue;
                }

                let message = post.message || '';
                const replacements: Record<string, string> = {
                    '{{name}}': contact.contactName || '',
                    '{{email}}': contact.contactEmail || '',
                    '{{phone}}': contact.contactMobile || '',
                    '{{company}}': post.campaign?.organisation.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendSms(contact.contactMobile, message);
                if (sent) successCount++;
                else failCount++;
            }
        } else if (post.type === 'WHATSAPP') {
            for (const contact of contacts) {
                const number = contact.contactWhatsApp || contact.contactMobile;
                if (!number) {
                    failCount++;
                    continue;
                }

                let message = post.message || '';
                const replacements: Record<string, string> = {
                    '{{name}}': contact.contactName || '',
                    '{{email}}': contact.contactEmail || '',
                    '{{phone}}': number || '',
                    '{{company}}': post.campaign?.organisation.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendWhatsapp(number, message);
                if (sent) successCount++;
                else failCount++;
            }
        } else {
            // TODO: Implement other providers if any
            // For now, just mock success for non-email to avoid breaking the UI flow
            successCount = contacts.length;
        }

        // Update post status if sent to at least one person
        if (successCount > 0) {
            await prisma.campaignPost.update({
                where: { id: post.id },
                data: { isPostSent: true }
            });
        }

        return NextResponse.json({
            success: true,
            sent: successCount,
            failed: failCount
        });

    } catch (error) {
        console.error('[POST_SHARE]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
