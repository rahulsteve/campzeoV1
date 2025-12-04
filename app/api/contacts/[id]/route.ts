import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@clerk/nextjs/server';

// GET - Fetch single contact
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        const contact = await prisma.contact.findFirst({
            where: {
                id: parseInt(id),
                organisationId: dbUser.organisationId
            },
            include: {
                campaigns: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        endDate: true,
                    }
                }
            }
        });

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json(contact);
    } catch (error) {
        console.error('Error fetching contact:', error);
        return NextResponse.json({ error: 'Failed to fetch contact' }, { status: 500 });
    }
}

// PATCH - Update contact
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        // Verify contact belongs to organisation
        const existingContact = await prisma.contact.findFirst({
            where: {
                id: parseInt(id),
                organisationId: dbUser.organisationId
            }
        });

        if (!existingContact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        const body = await request.json();
        const { contactName, contactEmail, contactMobile, contactWhatsApp, campaignIds } = body;

        // Update contact
        const contact = await prisma.contact.update({
            where: { id: parseInt(id) },
            data: {
                ...(contactName !== undefined && { contactName }),
                ...(contactEmail !== undefined && { contactEmail }),
                ...(contactMobile !== undefined && { contactMobile }),
                ...(contactWhatsApp !== undefined && { contactWhatsApp }),
                ...(campaignIds !== undefined && {
                    campaigns: {
                        set: campaignIds.map((id: number) => ({ id }))
                    }
                })
            },
            include: {
                campaigns: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json(contact);
    } catch (error) {
        console.error('Error updating contact:', error);
        return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
    }
}

// DELETE - Delete single contact
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { organisationId: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: 'Organisation not found' }, { status: 404 });
        }

        // Delete contact (only if it belongs to the organisation)
        const contact = await prisma.contact.deleteMany({
            where: {
                id: parseInt(id),
                organisationId: dbUser.organisationId
            }
        });

        if (contact.count === 0) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
    }
}
