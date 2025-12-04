import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { urn } = body;

        if (!urn) {
            return NextResponse.json({ error: "URN is required" }, { status: 400 });
        }

        await prisma.user.update({
            where: { clerkId: userId },
            data: { linkedInAuthUrn: urn }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating LinkedIn page:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
