import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { organisation: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            id: dbUser.id,
            clerkId: dbUser.clerkId,
            email: dbUser.email,
            firstName: dbUser.firstName,
            lastName: dbUser.lastName,
            mobile: dbUser.mobile,
            // imageUrl: dbUser.imageUrl, // imageUrl is not in the schema I saw, checking schema again... it's not there. Clerk handles it.
            // But we can return what we have.
            role: dbUser.role,
            organisationId: dbUser.organisationId,
            organisation: dbUser.organisation,

            // Social tokens status
            facebookConnected: !!dbUser.facebookAccessToken,
            instagramConnected: !!dbUser.instagramAccessToken,
            linkedInConnected: !!dbUser.linkedInAccessToken,
            youtubeConnected: !!dbUser.youtubeAccessToken,
            pinterestConnected: !!dbUser.pinterestAccessToken,

            createdAt: dbUser.createdAt,
            updatedAt: dbUser.updatedAt,
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { firstName, lastName, mobile } = body;

        const updatedUser = await prisma.user.update({
            where: { clerkId: user.id },
            data: {
                firstName,
                lastName,
                mobile,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
