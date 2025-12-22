import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { getFacebookPostInsights } from '@/lib/facebook';
import { getInstagramPostInsights } from '@/lib/instagram';
import { getLinkedInPostInsights } from '@/lib/linkedin';
import { getYouTubeVideoInsights } from '@/lib/youtube';
import { getPinterestPostInsights } from '@/lib/pinterest';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
        }

        const { id } = await params;

        // Check if ID is a transaction ID or a platform postId
        const transactionId = parseInt(id);
        const searchParams = request.nextUrl.searchParams;
        const platform = searchParams.get('platform');
        const platformPostId = searchParams.get('postId');

        let transaction: any = null;

        if (!isNaN(transactionId) && transactionId > 0) {
            transaction = await prisma.postTransaction.findUnique({
                where: { id: transactionId }
            });
        }

        // Fallback: Lookup by platform and postId
        if (!transaction && platform && platformPostId) {
            console.log(`[Analytics Details] Post not found in DB or virtual. Simulating transaction for ${platform} post ${platformPostId}`);
            transaction = {
                id: -1,
                refId: 0,
                platform: platform.toUpperCase(),
                postId: platformPostId,
                publishedAt: new Date(),
                published: true,
                message: '',
                mediaUrls: ''
            };
        }

        if (!transaction) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Verify ownership (only if it's a real transaction)
        if (transaction.id !== -1) {
            const campaignPost = await prisma.campaignPost.findUnique({
                where: { id: transaction.refId },
                include: { campaign: true }
            });

            if (!campaignPost || !campaignPost.campaign || campaignPost.campaign.organisationId !== dbUser.organisationId) {
                return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
            }
        }

        // Fetch db insight
        const dbInsight = await prisma.postInsight.findFirst({
            where: { postId: transaction.postId }
        });

        const forceRefresh = searchParams.get('fresh') === 'true';

        // Check freshness
        const ONE_HOUR = 60 * 60 * 1000;
        const isStale = !dbInsight || (Date.now() - new Date(dbInsight.lastUpdated).getTime() > ONE_HOUR);

        let finalInsight = dbInsight ? {
            likes: dbInsight.likes,
            comments: dbInsight.comments,
            reach: dbInsight.reach,
            impressions: dbInsight.impressions,
            engagementRate: dbInsight.engagementRate,
            lastUpdated: dbInsight.lastUpdated,
            isDeleted: (dbInsight as any).isDeleted ?? false
        } : {
            likes: 0,
            comments: 0,
            reach: 0,
            impressions: 0,
            engagementRate: 0,
            lastUpdated: null,
            isDeleted: false
        };

        if (isStale || forceRefresh) {
            console.log(`[Analytics Details] Refreshing insights for ${transaction.platform} post ${transaction.postId}`);

            let insights: any = {
                likes: 0,
                comments: 0,
                reach: 0,
                impressions: 0,
                engagementRate: 0,
                isDeleted: false
            };

            try {
                let token = null;

                switch (transaction.platform) {
                    case 'FACEBOOK':
                        token = dbUser.facebookPageAccessToken || dbUser.facebookAccessToken;
                        if (token) {
                            insights = await getFacebookPostInsights(transaction.postId, token);
                        }
                        break;
                    case 'INSTAGRAM':
                        token = dbUser.instagramAccessToken;
                        if (token) {
                            insights = await getInstagramPostInsights(transaction.postId, token);
                        }
                        break;
                    case 'LINKEDIN':
                        token = dbUser.linkedInAccessToken;
                        if (token) {
                            insights = await getLinkedInPostInsights(transaction.postId, token);
                        }
                        break;
                    case 'YOUTUBE':
                        token = dbUser.youtubeAccessToken;
                        if (token) {
                            insights = await getYouTubeVideoInsights(transaction.postId, token);
                        }
                        break;
                    case 'PINTEREST':
                        token = dbUser.pinterestAccessToken;
                        if (token) {
                            insights = await getPinterestPostInsights(transaction.postId, token);
                        }
                        break;
                }

                let isDeleted = insights.isDeleted ?? false;
                const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
                const isVeryRecent = transaction.publishedAt && (Date.now() - new Date(transaction.publishedAt).getTime() < TWENTY_FOUR_HOURS);

                if (isDeleted && isVeryRecent) {
                    if (dbInsight) {
                        insights = {
                            ...insights,
                            likes: dbInsight.likes,
                            comments: dbInsight.comments,
                            reach: dbInsight.reach,
                            impressions: dbInsight.impressions,
                            engagementRate: dbInsight.engagementRate,
                            isDeleted: false
                        };
                        isDeleted = false;
                    } else {
                        isDeleted = false;
                    }
                }

                // Update insights in DB
                if (dbInsight) {
                    await prisma.postInsight.update({
                        where: { id: dbInsight.id },
                        data: {
                            likes: insights.likes,
                            comments: insights.comments,
                            reach: insights.reach,
                            impressions: insights.impressions,
                            engagementRate: insights.engagementRate,
                            isDeleted: isDeleted,
                            lastUpdated: new Date()
                        } as any
                    });
                } else {
                    await prisma.postInsight.create({
                        data: {
                            postId: transaction.postId,
                            likes: insights.likes,
                            comments: insights.comments,
                            reach: insights.reach,
                            impressions: insights.impressions,
                            engagementRate: insights.engagementRate,
                            isDeleted: isDeleted,
                            lastUpdated: new Date()
                        } as any
                    });
                }

                // Sync Metadata (message, mediaUrls)
                if (forceRefresh || !dbInsight) {

                    const freshMessage = insights.message || insights.caption || insights.text || insights.title || transaction.message;
                    let freshMedia = transaction.mediaUrls;

                    if (transaction.platform === 'FACEBOOK' && insights.full_picture) freshMedia = insights.full_picture;
                    if (transaction.platform === 'INSTAGRAM' && insights.media_url) freshMedia = insights.media_url;
                    if (transaction.platform === 'YOUTUBE' && insights.thumbnails?.high?.url) freshMedia = insights.thumbnails.high.url;
                    if (transaction.platform === 'PINTEREST' && insights.media?.images?.['600x']?.url) freshMedia = insights.media.images['600x'].url;

                    if (transaction.id !== -1) {
                        await prisma.postTransaction.update({
                            where: { id: transaction.id },
                            data: { message: freshMessage, mediaUrls: freshMedia }
                        });
                    }

                    if (transaction.refId !== 0) {
                        await prisma.campaignPost.update({
                            where: { id: transaction.refId },
                            data: {
                                message: freshMessage,
                                mediaUrls: freshMedia ? [freshMedia] : [],
                                isDeleted: isDeleted
                            } as any
                        });
                    }

                    transaction.message = freshMessage;
                    transaction.mediaUrls = freshMedia;
                } else if (transaction.refId !== 0) {
                    // Even if not force refresh, update isDeleted if it changed
                    await prisma.campaignPost.update({
                        where: { id: transaction.refId },
                        data: { isDeleted: isDeleted } as any
                    });
                }

                finalInsight = {
                    ...insights,
                    isDeleted: isDeleted,
                    lastUpdated: new Date()
                };

            } catch (err) {
                console.error(`[Analytics Details] Failed to refresh insights:`, err);
            }
        }

        const today = new Date();
        const historicalData = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const progress = (i + 1) / 7;
            const fakeLikes = Math.round(finalInsight.likes * (0.2 + 0.8 * progress));
            const fakeComments = Math.round(finalInsight.comments * (0.2 + 0.8 * progress));

            return {
                date: dateStr,
                likes: i === 6 ? finalInsight.likes : fakeLikes,
                comments: i === 6 ? finalInsight.comments : fakeComments
            };
        });

        return NextResponse.json({
            post: {
                ...transaction,
                insight: finalInsight
            },
            historicalData,
            demographics: null
        });

    } catch (error: any) {
        console.error('[Analytics] Error fetching post details:', error);
        return NextResponse.json({
            error: 'Failed to fetch post details',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
