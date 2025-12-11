import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { logError, logWarning, logInfo } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER' || user.organisationId) {
            await logWarning("Forbidden access attempt to send notification", { userId });
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

        await logInfo("System broadcast sent", { message, sentBy: userId });
        return NextResponse.json({ isSuccess: true, message: 'Notification sent' });
    } catch (error: any) {
        await logError("Failed to send notification", { userId: "Unknown" }, error);
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}
