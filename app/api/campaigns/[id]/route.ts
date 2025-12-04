import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

// GET - Fetch a single campaign
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

        // Fetch campaign
        const campaign = await prisma.campaign.findFirst({
            where: {
                id: campaignId,
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
            include: {
                contacts: {
                    select: {
                        id: true,
                        contactName: true,
                        contactEmail: true,
                        contactMobile: true,
                    },
                },
                _count: {
                    select: {
                        posts: true,
                        contacts: true,
                    },
                },
            },
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 });
    }
}

// PUT - Update a campaign
export async function PUT(
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
        const body = await request.json();
        const { name, description, startDate, endDate, contactIds } = body;

        // Validation
        if (!name || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'Name, start date, and end date are required' },
                { status: 400 }
            );
        }

        // Check if campaign exists and belongs to organisation
        const existingCampaign = await prisma.campaign.findFirst({
            where: {
                id: campaignId,
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
        });

        if (!existingCampaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Update campaign
        const campaign = await prisma.campaign.update({
            where: { id: campaignId },
            data: {
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                contacts: {
                    set: [], // Clear existing contacts
                    connect: contactIds && contactIds.length > 0
                        ? contactIds.map((id: number) => ({ id }))
                        : [],
                },
            },
            include: {
                contacts: true,
                _count: {
                    select: {
                        posts: true,
                        contacts: true,
                    },
                },
            },
        });

        return NextResponse.json({ campaign });
    } catch (error) {
        console.error('Error updating campaign:', error);
        return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
    }
}

// DELETE - Soft delete a campaign
export async function DELETE(
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

        // Check if campaign exists and belongs to organisation
        const existingCampaign = await prisma.campaign.findFirst({
            where: {
                id: campaignId,
                organisationId: dbUser.organisationId,
                isDeleted: false,
            },
        });

        if (!existingCampaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        // Soft delete campaign
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { isDeleted: true },
        });

        return NextResponse.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
    }
}
