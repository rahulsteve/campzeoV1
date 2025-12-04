import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

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

        // Get user's organisation
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        // Fetch transaction and verify ownership
        // Since we can't easily include deep relations with raw query or complex prisma include if relations aren't defined,
        // we'll fetch the transaction first, then check the campaign post.

        const transaction = await prisma.postTransaction.findUnique({
            where: { id: transactionId }
        });

        if (!transaction) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Verify ownership via CampaignPost -> Campaign -> Organisation
        const campaignPost = await prisma.campaignPost.findUnique({
            where: { id: transaction.refId },
            include: {
                campaign: true
            }
        });

        if (!campaignPost || !campaignPost.campaign || campaignPost.campaign.organisationId !== dbUser.organisationId) {
            return NextResponse.json({ error: 'Post not found or unauthorized' }, { status: 404 });
        }

        // Fetch insights
        const insight = await prisma.postInsight.findFirst({
            where: { postId: transaction.postId }
        });

        // Mock historical data for charts (since we don't have a separate table for history yet)
        const historicalData = [
            { date: '2024-01-01', likes: 10, comments: 2 },
            { date: '2024-01-02', likes: 15, comments: 5 },
            { date: '2024-01-03', likes: 25, comments: 8 },
            { date: '2024-01-04', likes: 40, comments: 12 },
            { date: '2024-01-05', likes: 45, comments: 15 },
            { date: '2024-01-06', likes: 55, comments: 20 },
            { date: '2024-01-07', likes: insight?.likes || 60, comments: insight?.comments || 25 },
        ];

        // Mock demographics
        const demographics = {
            age: [
                { name: '18-24', value: 20 },
                { name: '25-34', value: 45 },
                { name: '35-44', value: 25 },
                { name: '45+', value: 10 },
            ],
            gender: [
                { name: 'Male', value: 40 },
                { name: 'Female', value: 55 },
                { name: 'Other', value: 5 },
            ],
            locations: [
                { name: 'USA', value: 40 },
                { name: 'UK', value: 20 },
                { name: 'India', value: 15 },
                { name: 'Canada', value: 10 },
                { name: 'Other', value: 15 },
            ]
        };

        return NextResponse.json({
            post: {
                ...transaction,
                insight: insight || {
                    likes: 0,
                    comments: 0,
                    reach: 0,
                    impressions: 0,
                    engagementRate: 0,
                    lastUpdated: null
                }
            },
            historicalData,
            demographics
        });

    } catch (error) {
        console.error('Error fetching post details:', error);
        return NextResponse.json({ error: 'Failed to fetch post details' }, { status: 500 });
    }
}
