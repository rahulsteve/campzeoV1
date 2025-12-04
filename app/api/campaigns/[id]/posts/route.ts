import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { postToLinkedIn } from '@/lib/linkedin';

// GET - Fetch all posts for a campaign
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from database to check organisation
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        const { id } = await params;
        const campaignId = parseInt(id);

        // Verify campaign belongs to organisation
        const campaign = await prisma.campaign.findFirst({
            where: {
                id: campaignId,
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Fetch posts
        const posts = await prisma.campaignPost.findMany({
            where: {
                campaignId,
                isAttachedToCampaign: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({ posts });
    } catch (error) {
        console.error('Error fetching campaign posts:', error);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
}

// POST - Create a new post for a campaign
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from database to check organisation and credentials
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: {
                organisationId: true,
                linkedInAccessToken: true,
                linkedInAuthUrn: true
            }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        const { id } = await params;
        const campaignId = parseInt(id);

        // Verify campaign belongs to organisation
        const campaign = await prisma.campaign.findFirst({
            where: {
                id: campaignId,
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        const body = await request.json();
        const {
            subject,
            message,
            type, // Reverted to single type
            scheduledPostTime,
            senderEmail,
            mediaUrls,
            youtubeTags,
            youtubePrivacy,
            pinterestBoardId,
            pinterestLink,
            isReel
        } = body;

        // Validation
        if (!type) {
            return NextResponse.json({ error: 'Platform type is required' }, { status: 400 });
        }

        if (!message && !subject && !mediaUrls?.length) {
            return NextResponse.json({ error: 'Message, subject or media is required' }, { status: 400 });
        }

        // Prepare metadata
        let metadata: any = {};
        if (type === 'YOUTUBE') {
            metadata = { tags: youtubeTags, privacy: youtubePrivacy };
        } else if (type === 'PINTEREST') {
            metadata = { boardId: pinterestBoardId, link: pinterestLink };
        } else if (type === 'FACEBOOK' || type === 'INSTAGRAM') {
            metadata = { isReel: !!isReel };
        }

        // Create post
        const post = await prisma.campaignPost.create({
            data: {
                campaignId,
                subject,
                message,
                type,
                senderEmail: type === 'EMAIL' ? senderEmail : null,
                scheduledPostTime: scheduledPostTime ? new Date(scheduledPostTime) : null,
                isAttachedToCampaign: true,
                videoUrl: mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null, // Legacy support
                mediaUrls: mediaUrls || [],
                metadata,
            },
        });

        // If it's a LinkedIn post and not scheduled, send it immediately
        if (type === 'LINKEDIN' && !scheduledPostTime) {
            if (!dbUser.linkedInAccessToken || !dbUser.linkedInAuthUrn) {
                console.warn("Missing LinkedIn credentials for user", user.id);
            } else {
                try {
                    const linkedInResponse = await postToLinkedIn(
                        {
                            accessToken: dbUser.linkedInAccessToken,
                            authorUrn: dbUser.linkedInAuthUrn,
                        },
                        message || subject || "",
                        mediaUrls
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
                            message: message || subject || "",
                            mediaUrls: mediaUrls && mediaUrls.length > 0 ? mediaUrls[0] : null,
                            postType: mediaUrls && mediaUrls.length > 0 ? (mediaUrls[0].match(/\.(mp4|mov|webm)$/i) ? 'VIDEO' : 'IMAGE') : 'TEXT',
                            accessToken: dbUser.linkedInAccessToken,
                            published: true,
                            publishedAt: new Date(),
                        }
                    });

                } catch (postError) {
                    console.error("Failed to post to LinkedIn:", postError);
                }
            }
        }

        return NextResponse.json({ post }, { status: 201 });
    } catch (error) {
        console.error('Error creating campaign post:', error);
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }
}
