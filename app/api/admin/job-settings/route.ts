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

        const settings = await prisma.jobSetting.findMany();
        return NextResponse.json({ isSuccess: true, data: settings });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER' || user.organisationId) {
            return NextResponse.json({ isSuccess: false, message: 'Forbidden' }, { status: 403 });
        }

        const { jobId, cronExpression, isEnabled } = await request.json();

        const existing = await prisma.jobSetting.findFirst({
            where: { jobId }
        });

        let setting;
        if (existing) {
            setting = await prisma.jobSetting.update({
                where: { id: existing.id },
                data: { cronExpression, isEnabled }
            });
        } else {
            setting = await prisma.jobSetting.create({
                data: { jobId, cronExpression, isEnabled }
            });
        }

        return NextResponse.json({ isSuccess: true, data: setting });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}
