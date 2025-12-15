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

        const { id } = await params;
        const transactionId = parseInt(id);

        if (isNaN(transactionId)) {
            return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
        }

        // Get user's organisation and tokens
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: {
                organisationId: true,
                facebookAccessToken: true,
                facebookPageAccessToken: true,
                instagramAccessToken: true,
                linkedInAccessToken: true,
                youtubeAccessToken: true,
                pinterestAccessToken: true
            }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        const transaction = await prisma.postTransaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Verify ownership
        const campaignPost = await prisma.campaignPost.findUnique({
            where: { id: transaction.refId },
            include: {
                campaign: true
            }
        });

        if (!campaignPost || !campaignPost.campaign || campaignPost.campaign.organisationId !== dbUser.organisationId) {
            return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
        }

        // Fetch db insight
        const dbInsight = await prisma.postInsight.findFirst({
            where: { postId: transaction.postId }
        });

        const searchParams = request.nextUrl.searchParams;
        const forceRefresh = searchParams.get('fresh') === 'true';

        // Check freshness
        const ONE_HOUR = 60 * 60 * 1000;
        const isStale = !dbInsight || (Date.now() - new Date(dbInsight.lastUpdated).getTime() > ONE_HOUR);

        // Use 'any' cast for dbInsight to access isDeleted if types are stale
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

            let insights: {
                likes: number;
                comments: number;
                reach: number;
                impressions: number;
                engagementRate: number;
                isDeleted?: boolean;
            } = {
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
                            const fbInsights = await getFacebookPostInsights(transaction.postId, token);
                            insights = { ...fbInsights };
                        }
                        break;
                    case 'INSTAGRAM':
                        token = dbUser.instagramAccessToken;
                        if (token) {
                            const igInsights = await getInstagramPostInsights(transaction.postId, token);
                            insights = { ...igInsights };
                        }
                        break;
                    case 'LINKEDIN':
                        token = dbUser.linkedInAccessToken;
                        if (token) {
                            const liInsights = await getLinkedInPostInsights(transaction.postId, token);
                            insights = { ...liInsights };
                        }
                        break;
                    case 'YOUTUBE':
                        token = dbUser.youtubeAccessToken;
                        if (token) {
                            const videoInsights = await getYouTubeVideoInsights(transaction.postId, token);
                            insights = {
                                likes: videoInsights.likes,
                                comments: videoInsights.comments,
                                reach: videoInsights.reach,
                                impressions: videoInsights.impressions,
                                engagementRate: videoInsights.engagementRate,
                                isDeleted: videoInsights.isDeleted
                            };
                        }
                        break;
                    case 'PINTEREST':
                        token = dbUser.pinterestAccessToken;
                        if (token) {
                            const pinInsights = await getPinterestPostInsights(transaction.postId, token);
                            insights = {
                                likes: pinInsights.likes,
                                comments: pinInsights.comments,
                                reach: pinInsights.reach,
                                impressions: pinInsights.impressions,
                                engagementRate: pinInsights.engagementRate,
                                isDeleted: pinInsights.isDeleted
                            };
                        }
                        break;
                }

                // Update DB
                const isDeleted = insights.isDeleted ?? false;

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
                        } as any // Cast to any to avoid type errors if schema is stale in editor
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
                        } as any // Cast to any
                    });
                }

                finalInsight = {
                    ...insights,
                    lastUpdated: new Date()
                };

            } catch (err) {
                console.error(`[Analytics Details] Failed to refresh insights:`, err);
            }
        }

        // Mock historical data (remains mock for now)
        // Mock historical data (remains mock for now, but dynamic relative to today)
        const today = new Date();
        const historicalData = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];

            // Generate some plausible progression leading up to current values
            const progress = (i + 1) / 7; // 0.14 to 1.0
            // logic: start at ~20% of final, grow to 100%
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
            demographics: null // Demographics (Age/Location) are typically Page-level, not Post-level, so we omit them.
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
