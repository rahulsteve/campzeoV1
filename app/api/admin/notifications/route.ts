import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER' || user.organisationId) {
            return NextResponse.json({ isSuccess: false, message: 'Forbidden' }, { status: 403 });
        }

        const { message } = await request.json();

        await prisma.notification.create({
            data: {
                message,
                type: 'SYSTEM_BROADCAST',
                isRead: false,
            }
        });

        return NextResponse.json({ isSuccess: true, message: 'Notification sent' });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}
