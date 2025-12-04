import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getPinterestBoards } from '@/lib/pinterest';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { pinterestAccessToken: true }
        });

        if (!user || !user.pinterestAccessToken) {
            return new NextResponse('Pinterest not connected', { status: 400 });
        }

        const boards = await getPinterestBoards(user.pinterestAccessToken);

        return NextResponse.json({ boards });
    } catch (error) {
        console.error('Error fetching Pinterest boards:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
