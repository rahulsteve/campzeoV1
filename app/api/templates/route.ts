import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logError, logWarning, logInfo } from '@/lib/audit-logger';

// GET: List all templates for the organization
export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { organisation: true }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const platform = searchParams.get("platform");
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const isActive = searchParams.get("isActive");

        const whereClause: any = {
            organisationId: dbUser.organisationId
        };

        if (platform) {
            whereClause.platform = platform;
        }

        if (category) {
            whereClause.category = category;
        }

        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { content: { contains: search, mode: "insensitive" } }
            ];
        }

        if (isActive !== null && isActive !== undefined) {
            whereClause.isActive = isActive === "true";
        }

        const templates = await prisma.messageTemplate.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({
            success: true,
            data: templates
        });

    } catch (error: any) {
        console.error("Error fetching templates:", error);
        await logError("Failed to fetch templates", { userId: "unknown" }, error);
        return NextResponse.json(
            { error: "Failed to fetch templates" },
            { status: 500 }
        );
    }
}

// POST: Create a new template
export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id }
        });

        if (!dbUser?.organisationId) {
            return NextResponse.json({ error: "No organization found" }, { status: 404 });
        }

        const body = await req.json();
        const { name, description, content, subject, platform, category, variables, isActive } = body;

        if (!name || !content || !platform) {
            return NextResponse.json(
                { error: "Name, content, and platform are required" },
                { status: 400 }
            );
        }

        const template = await prisma.messageTemplate.create({
            data: {
                name,
                description,
                content,
                subject,
                platform,
                category: category || "CUSTOM",
                variables: variables || {},
                isActive: isActive !== undefined ? isActive : true,
                organisationId: dbUser.organisationId,
                createdBy: user.id
            }
        });

        await logInfo("Template created", { templateId: template.id, name: template.name, createdBy: user.id });
        return NextResponse.json({
            success: true,
            data: template,
            message: "Template created successfully"
        });

    } catch (error: any) {
        console.error("Error creating template:", error);
        await logError("Failed to create template", { userId: "unknown" }, error);
        return NextResponse.json(
            { error: "Failed to create template" },
            { status: 500 }
        );
    }
}
