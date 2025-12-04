import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

        if (!dbUser || !dbUser.organisationId) {
            return NextResponse.json({ error: "User not found or no tenant" }, { status: 404 });
        }

        const payments = await prisma.payment.findMany({
            where: { organisationId: dbUser.organisationId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({ payments });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "Failed to fetch payments" },
            { status: 500 }
        );
    }
}
