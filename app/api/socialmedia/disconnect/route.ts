import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { platform } = body;

        if (!platform) {
            return NextResponse.json({ error: "Platform is required" }, { status: 400 });
        }

        const updateData: any = {};
        if (platform === "FACEBOOK") {
            updateData.facebookAccessToken = null;
            updateData.facebookPageAccessToken = null;
            updateData.facebookPageId = null;
            updateData.facebookUserId = null;
        } else if (platform === "INSTAGRAM") {
            updateData.instagramAccessToken = null;
            updateData.instagramUserId = null;
        } else if (platform === "LINKEDIN") {
            updateData.linkedInAccessToken = null;
            updateData.linkedInAuthUrn = null;
        } else if (platform === "YOUTUBE") {
            updateData.youtubeAccessToken = null;
            updateData.youtubeAuthUrn = null;
        } else if (platform === "PINTEREST") {
            updateData.pinterestAccessToken = null;
            updateData.pinterestAuthUrn = null;
        }

        await prisma.user.update({
            where: { clerkId: userId },
            data: updateData
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error disconnecting platform:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
