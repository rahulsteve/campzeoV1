import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER' || user.organisationId) {
            return NextResponse.json({ isSuccess: false, message: 'Forbidden' }, { status: 403 });
        }

        const logs = await prisma.logEvents.findMany({
            orderBy: { timeStamp: 'desc' },
            take: 100,
        });

        return NextResponse.json({ isSuccess: true, data: logs });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}
