import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const platform = searchParams.get('platform');

        if (!platform) {
            return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
        }

        // Get user's organisation
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // 4. Fetch insights for these transactions
        const postsWithInsights = await Promise.all(transactions.map(async (tx) => {
            const insight = await prisma.postInsight.findFirst({
                where: { postId: tx.postId }
            });

            return {
                ...tx,
                insight: insight || {
                    likes: 0,
                    comments: 0,
                    reach: 0,
                    impressions: 0,
                    engagementRate: 0,
                    lastUpdated: null
                }
            };
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
