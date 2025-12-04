import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Get a single template
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const templateId = parseInt(id);

        if (isNaN(templateId)) {
            return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
        }

        const template = await prisma.messageTemplate.findFirst({
            where: {
                id: templateId,
                organisationId: dbUser.organisationId
            }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: template
        });

    } catch (error) {
        console.error("Error fetching template:", error);
        return NextResponse.json(
            { error: "Failed to fetch template" },
            { status: 500 }
        );
    }
}

// PUT: Update a template
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const templateId = parseInt(id);

        if (isNaN(templateId)) {
            return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
        }

        // Verify template belongs to user's organization
        const existingTemplate = await prisma.messageTemplate.findFirst({
            where: {
                id: templateId,
                organisationId: dbUser.organisationId
            }
        });

        if (!existingTemplate) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        const body = await req.json();
        const { name, description, content, subject, platform, category, variables, isActive } = body;

        const template = await prisma.messageTemplate.update({
            where: { id: templateId },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(content !== undefined && { content }),
                ...(subject !== undefined && { subject }),
                ...(platform !== undefined && { platform }),
                ...(category !== undefined && { category }),
                ...(variables !== undefined && { variables }),
                ...(isActive !== undefined && { isActive })
            }
        });

        return NextResponse.json({
            success: true,
            data: template,
            message: "Template updated successfully"
        });

    } catch (error) {
        console.error("Error updating template:", error);
        return NextResponse.json(
            { error: "Failed to update template" },
            { status: 500 }
        );
    }
}

// DELETE: Delete a template
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const templateId = parseInt(id);

        if (isNaN(templateId)) {
            return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: "Organisation not found" }, { status: 404 });
        }

        // Verify template belongs to user's organization
        const existingTemplate = await prisma.messageTemplate.findFirst({
            where: {
                id: templateId,
                organisationId: dbUser.organisationId
            }
        });

        if (!existingTemplate) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        await prisma.messageTemplate.delete({
            where: { id: templateId }
        });

        return NextResponse.json({
            success: true,
            message: "Template deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting template:", error);
        return NextResponse.json(
            { error: "Failed to delete template" },
            { status: 500 }
        );
    }
}
