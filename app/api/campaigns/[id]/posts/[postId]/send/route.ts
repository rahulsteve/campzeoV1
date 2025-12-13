import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { sendCampaignPost } from '@/lib/send-campaign-post';
import { logError, logWarning } from '@/lib/audit-logger';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; postId: string }> }
) {
    console.log("POST /api/campaigns/[id]/posts/[postId]/send hit");
    try {
        const { userId } = await auth();
        if (!userId) {
            await logWarning("Unauthorized access attempt to send campaign post", { action: "send-campaign-post" });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Await params before accessing properties
        const resolvedParams = await params;
        const id = resolvedParams.id;
        const postId = resolvedParams.postId;

        console.log("Params resolved:", { id, postId });

        const { contactIds } = await req.json();

        // Fetch post and campaign
        const post = await prisma.campaignPost.findFirst({
            where: {
                id: parseInt(postId),
                campaignId: parseInt(id),
            },
            include: {
                campaign: {
                    include: {
                        organisation: true,
                        contacts: true,
                    }
                }
            }
        });

        if (!post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        const isSocialPlatform = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST'].includes(post.type);

        if (!isSocialPlatform && (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0)) {
            return NextResponse.json({ error: 'No contacts selected' }, { status: 400 });
        }

        // Use the shared sendCampaignPost function
        const result = await sendCampaignPost(
            post,
            contactIds ? contactIds.map((id: string) => parseInt(id)) : undefined
        );

        if (!result.success && result.error) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            sent: result.sent,
            failed: result.failed
        });

    } catch (error: any) {
        console.error('[POST_SHARE]', error);
        await logError("Failed to send campaign post", { userId: "unknown" }, error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}
