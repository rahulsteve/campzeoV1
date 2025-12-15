import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';
import { getFacebookPostInsights } from '@/lib/facebook';
import { getInstagramPostInsights } from '@/lib/instagram';
import { getLinkedInPostInsights } from '@/lib/linkedin';
import { getYouTubeVideoInsights } from '@/lib/youtube';
import { getPinterestPostInsights } from '@/lib/pinterest';
import { getMailgunAnalytics } from '@/lib/email';

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const platform = searchParams.get('platform');
        const forceRefresh = searchParams.get('fresh') === 'true';

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        // Get user's organisation and TOKENS
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

        // 1. Get all campaigns for the organisation
        const campaigns = await prisma.campaign.findMany({
            where: {
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
            select: { id: true }
        });

        const campaignIds = campaigns.map(c => c.id);

        if (campaignIds.length === 0) {
            return NextResponse.json({ posts: [] });
        }

        // 2. Get all campaign posts
        const campaignPosts = await prisma.campaignPost.findMany({
            where: {
                campaignId: { in: campaignIds }
            },
            select: { id: true }
        });

        const campaignPostIds = campaignPosts.map(p => p.id);

        if (campaignPostIds.length === 0) {
            return NextResponse.json({ posts: [] });
        }

        // 3. Get PostTransactions for these posts and the specified platform
        const transactions = await prisma.postTransaction.findMany({
            where: {
                refId: { in: campaignPostIds },
                platform: platform.toUpperCase(),
                published: true, // Only show published posts
                postId: { not: '' } // Ensure there is a platform post ID
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 4. Fetch insights for these transactions (and update if stale)
        const postsWithInsights = await Promise.all(transactions.map(async (tx) => {
            // Check if insights exist and are fresh (e.g., < 1 hour old)
            // Or if we should force refresh
            const dbInsight = await prisma.postInsight.findFirst({
                where: { postId: tx.postId }
            });

            const ONE_HOUR = 60 * 60 * 1000;
            const isStale = !dbInsight || (Date.now() - new Date(dbInsight.lastUpdated).getTime() > ONE_HOUR);

            // If not stale, return cached data
            if (!isStale && dbInsight && !forceRefresh) {
                return {
                    ...tx,
                    insight: dbInsight
                };
            }

            // If stale, fetch fresh data from Platform API
            console.log(`[Analytics] Refreshing insights for ${tx.platform} post ${tx.postId}`);

            // Explicitly type the result object
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
                // Determine which token to use and check if it exists
                let token = null;

                switch (tx.platform) {
                    case 'FACEBOOK':
                        token = dbUser.facebookPageAccessToken || dbUser.facebookAccessToken;
                        if (token) {
                            insights = await getFacebookPostInsights(tx.postId, token);
                        } else {
                            console.warn('[Analytics] No Facebook access token found for user');
                        }
                        break;
                    case 'INSTAGRAM':
                        token = dbUser.instagramAccessToken;
                        if (token) {
                            const igInsights = await getInstagramPostInsights(tx.postId, token);
                            insights = { ...igInsights };
                        }
                        break;
                    case 'EMAIL':
                        // Fetch real analytics from Mailgun using the tag (tx.postId)
                        // Only fetch if forceRefresh is true or we want live data
                        if (tx.postId.startsWith('campaign-')) {
                            const emailStats = await getMailgunAnalytics(tx.postId);
                            insights = {
                                likes: 0,
                                comments: 0,
                                reach: emailStats.delivered, // Delivered count
                                impressions: emailStats.opened, // Opens
                                engagementRate: 0,
                                isDeleted: false
                            };
                        } else if (dbInsight) {
                            insights = { ...dbInsight, isDeleted: false };
                        }
                        break;
                    case 'SMS':
                    case 'WHATSAPP':
                        // These are internal logs, just return what's in DB (or Mock external API)
                        if (dbInsight) {
                            insights = {
                                likes: dbInsight.likes,
                                comments: dbInsight.comments,
                                reach: dbInsight.reach,
                                impressions: dbInsight.impressions,
                                engagementRate: dbInsight.engagementRate,
                                isDeleted: false
                            };
                        }
                        break;
                    case 'LINKEDIN':
                        token = dbUser.linkedInAccessToken;
                        if (token) {
                            insights = await getLinkedInPostInsights(tx.postId, token);
                        } else {
                            console.warn('[Analytics] No LinkedIn access token found for user');
                        }
                        break;
                    case 'YOUTUBE':
                        token = dbUser.youtubeAccessToken;
                        if (token) {
                            const videoInsights = await getYouTubeVideoInsights(tx.postId, token);
                            insights = {
                                likes: videoInsights.likes,
                                comments: videoInsights.comments,
                                reach: videoInsights.reach,
                                impressions: videoInsights.impressions,
                                engagementRate: videoInsights.engagementRate,
                                isDeleted: videoInsights.isDeleted
                            };
                        } else {
                            console.warn('[Analytics] No YouTube access token found for user');
                        }
                        break;
                    case 'PINTEREST':
                        token = dbUser.pinterestAccessToken;
                        if (token) {
                            const pinInsights = await getPinterestPostInsights(tx.postId, token);
                            insights = {
                                likes: pinInsights.likes,
                                comments: pinInsights.comments,
                                reach: pinInsights.reach,
                                impressions: pinInsights.impressions,
                                engagementRate: pinInsights.engagementRate,
                                isDeleted: pinInsights.isDeleted
                            };
                        } else {
                            console.warn('[Analytics] No Pinterest access token found for user');
                        }
                        break;
                }

                // Update or Create PostInsight in DB
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
                        }
                    });
                } else {
                    await prisma.postInsight.create({
                        data: {
                            postId: tx.postId,
                            likes: insights.likes,
                            comments: insights.comments,
                            reach: insights.reach,
                            impressions: insights.impressions,
                            engagementRate: insights.engagementRate,
                            isDeleted: isDeleted,
                            lastUpdated: new Date()
                        }
                    });
                }

                // Return with fresh insights
                return {
                    ...tx,
                    insight: {
                        ...insights,
                        isDeleted: isDeleted,
                        lastUpdated: new Date()
                    }
                };

            } catch (err) {
                console.error(`[Analytics] Failed to update insights for ${tx.postId}:`, err);
                // Return cached (stale) or zeros
                return {
                    ...tx,
                    insight: dbInsight || {
                        likes: 0,
                        comments: 0,
                        reach: 0,
                        impressions: 0,
                        engagementRate: 0,
                        isDeleted: false,
                        lastUpdated: null
                    }
                };
            }
        }));

        return NextResponse.json({ posts: postsWithInsights });

    } catch (error: any) {
        console.error('Error fetching analytics posts:', error);
        return NextResponse.json({
            error: 'Failed to fetch posts',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
