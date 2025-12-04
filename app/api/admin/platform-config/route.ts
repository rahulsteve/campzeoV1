import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER') {
            return NextResponse.json({ isSuccess: false, message: 'Forbidden' }, { status: 403 });
        }

        const configs = await prisma.adminPlatformConfiguration.findMany();
        return NextResponse.json({ isSuccess: true, data: configs });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ isSuccess: false, message: 'Unauthorized' }, { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user || user.role !== 'ADMIN_USER') {
            return NextResponse.json({ isSuccess: false, message: 'Forbidden' }, { status: 403 });
        }

        const { key, value, platform } = await request.json();

        // We need to handle the upsert logic carefully since 'key' is not unique in the schema
        // The schema has: id (PK), key, value, platform
        // We probably want to find by key AND platform, or just key if key is unique enough.
        // Looking at schema: key String?, value String?, platform PlatformType
        // No unique constraint on key.
        // But usually config is key-value.
        // Let's assume for now we want to update if exists by key, or create.
        // Since there is no unique constraint, upsert won't work with 'key' alone if it's not @unique.
        // We should check if it exists first.

        const existingConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key }
        });

        let config;
        if (existingConfig) {
            config = await prisma.adminPlatformConfiguration.update({
                where: { id: existingConfig.id },
                data: { value, platform }
            });
        } else {
            config = await prisma.adminPlatformConfiguration.create({
                data: { key, value, platform }
            });
        }

        return NextResponse.json({ isSuccess: true, data: config });
    } catch (error: any) {
        return NextResponse.json({ isSuccess: false, message: error.message }, { status: 500 });
    }
}
