import { prisma } from '@/lib/prisma';
import { sendCampaignEmail } from '@/lib/email';
import { postToLinkedIn } from '@/lib/linkedin';
import { postToFacebook } from '@/lib/facebook';
import { postToInstagram } from '@/lib/instagram';
import { postToYouTube, postYouTubeCommunity } from '@/lib/youtube';
import { postToPinterest } from '@/lib/pinterest';
import { sendSms, sendWhatsapp } from '@/lib/twilio';

/**
 * Send a campaign post to contacts or social media
 * This is the shared logic used by both the manual send endpoint and the scheduler
 */
export async function sendCampaignPost(
    post: any,
    contactIds?: number[]
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
    try {
        const isSocialPlatform = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST'].includes(post.type);

        // Handle Social Media Posting
        if (isSocialPlatform) {
            // Get the first user from the organisation with the required credentials
            const dbUser = await prisma.user.findFirst({
                where: {
                    organisationId: post.campaign.organisationId,
                },
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
                throw new Error('User not found for organisation');
            }

            // LinkedIn
            if (post.type === 'LINKEDIN') {
                if (!dbUser.linkedInAccessToken || !dbUser.linkedInAuthUrn) {
                    throw new Error('LinkedIn credentials not found');
                }

                const linkedInResponse = await postToLinkedIn(
                    {
                        accessToken: dbUser.linkedInAccessToken,
                        authorUrn: dbUser.linkedInAuthUrn,
                    },
                    post.message || post.subject || "",
                    post.mediaUrls.length > 0 ? post.mediaUrls : post.videoUrl
                );

                await prisma.campaignPost.update({
                    where: { id: post.id },
                    data: { isPostSent: true }
                });

                await prisma.postTransaction.create({
                    data: {
                        refId: post.id,
                        platform: 'LINKEDIN',
                        postId: linkedInResponse.id,
                        accountId: dbUser.linkedInAuthUrn,
                        message: post.message || post.subject || "",
                        mediaUrls: post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl,
                        postType: (post.mediaUrls.length > 0 || post.videoUrl) ?
                            ((post.mediaUrls[0] || post.videoUrl || '').match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE')
                            : 'TEXT',
                        accessToken: dbUser.linkedInAccessToken,
                        published: true,
                        publishedAt: new Date(),
                    }
                });

                return { success: true, sent: 1, failed: 0 };
            }

            // Facebook
            if (post.type === 'FACEBOOK') {
                const fbToken = dbUser.facebookPageAccessToken || dbUser.facebookAccessToken;

                if (!fbToken || !dbUser.facebookPageId) {
                    throw new Error('Facebook credentials not found');
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

                return { success: true, sent: 1, failed: 0 };
            }

            // Instagram
            if (post.type === 'INSTAGRAM') {
                if (!dbUser.instagramAccessToken || !dbUser.instagramUserId) {
                    throw new Error('Instagram credentials not found');
                }

                if (dbUser.instagramUserId === 'no-business-account') {
                    throw new Error('No Instagram Business Account found');
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

                return { success: true, sent: 1, failed: 0 };
            }

            // YouTube
            if (post.type === 'YOUTUBE') {
                if (!dbUser.youtubeAccessToken) {
                    throw new Error('YouTube credentials not found');
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

                return { success: true, sent: 1, failed: 0 };
            }

            // Pinterest
            if (post.type === 'PINTEREST') {
                if (!dbUser.pinterestAccessToken) {
                    throw new Error('Pinterest credentials not found');
                }

                const metadata = post.metadata as any;
                const imageUrl = post.mediaUrls.length > 0 ? post.mediaUrls[0] : post.videoUrl;

                if (!imageUrl) {
                    throw new Error('Pinterest requires an image');
                }

                if (!metadata?.boardId) {
                    throw new Error('Pinterest requires a Board ID');
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

                return { success: true, sent: 1, failed: 0 };
            }

            throw new Error(`Platform ${post.type} not yet supported`);
        }

        // Handle Email/SMS/WhatsApp
        // Get contacts
        let contacts;
        if (contactIds && contactIds.length > 0) {
            contacts = await prisma.contact.findMany({
                where: {
                    id: { in: contactIds },
                    organisationId: post.campaign?.organisationId
                }
            });
        } else {
            // Get all campaign contacts
            contacts = post.campaign?.contacts || [];
        }

        if (contacts.length === 0) {
            throw new Error('No contacts found');
        }

        let successCount = 0;
        let failCount = 0;

        // Email
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
                    '{{company}}': post.campaign?.organisation?.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    subject = subject.replace(new RegExp(key, 'g'), value);
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendCampaignEmail({
                    to: contact.contactEmail,
                    subject: subject,
                    html: message,
                    replyTo: post.senderEmail || undefined
                });

                if (sent) successCount++;
                else failCount++;
            }
        }

        // SMS
        else if (post.type === 'SMS') {
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
                    '{{company}}': post.campaign?.organisation?.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendSms(contact.contactMobile, message);
                if (sent) successCount++;
                else failCount++;
            }
        }

        // WhatsApp
        else if (post.type === 'WHATSAPP') {
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
                    '{{company}}': post.campaign?.organisation?.name || '',
                };

                Object.entries(replacements).forEach(([key, value]) => {
                    message = message.replace(new RegExp(key, 'g'), value);
                });

                const sent = await sendWhatsapp(number, message);
                if (sent) successCount++;
                else failCount++;
            }
        }

        // Update post status if sent to at least one person
        if (successCount > 0) {
            await prisma.campaignPost.update({
                where: { id: post.id },
                data: { isPostSent: true }
            });
        }

        return {
            success: successCount > 0,
            sent: successCount,
            failed: failCount
        };

    } catch (error) {
        console.error('[sendCampaignPost] Error:', error);
        return {
            success: false,
            sent: 0,
            failed: 1,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
