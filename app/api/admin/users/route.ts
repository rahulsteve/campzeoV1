import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/users
 * Create or update a user and link to organisation
 */
export async function POST(req: Request) {
    try {
        const user = await currentUser();

        // Verify admin user
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            select: { role: true }
        });

        if (!dbUser || dbUser.role !== 'ADMIN_USER') {
            return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
        }

        const body = await req.json();
        const { clerkId, email, firstName, lastName, mobile, organisationId, isApproved } = body;

        if (!clerkId || !email) {
            return NextResponse.json(
                { error: "clerkId and email are required" },
                { status: 400 }
            );
        }

        // Create or update user with organisation link
        const createdUser = await prisma.user.upsert({
            where: { clerkId },
            update: {
                email,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                mobile: mobile || undefined,
                organisationId: organisationId || undefined,
                isApproved: isApproved !== undefined ? isApproved : true,
            },
            create: {
                clerkId,
                email,
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                mobile: mobile || undefined,
                organisationId: organisationId || undefined,
                isApproved: isApproved !== undefined ? isApproved : false,
                role: 'ORGANISATION_USER',
            },
        });

        // Log the action
        await prisma.logEvents.create({
            data: {
                message: `User ${email} linked to organisation ${organisationId}`,
                level: 'Info',
                timeStamp: new Date(),
                properties: JSON.stringify({
                    userId: createdUser.id,
                    organisationId,
                    clerkId,
                })
            }
        });

        return NextResponse.json({
            isSuccess: true,
            data: createdUser,
            message: "User created/updated successfully"
        });
    } catch (error) {
        console.error("Error creating/updating user:", error);
        return NextResponse.json(
            {
                isSuccess: false,
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
