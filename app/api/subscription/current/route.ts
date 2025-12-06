import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getImpersonatedOrganisationId } from "@/lib/admin-impersonation";

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

        // Handle Admin Impersonation
        let organisation = dbUser?.organisation;

        if (dbUser?.role === 'ADMIN_USER') {
            const impersonatedId = await getImpersonatedOrganisationId();
            if (impersonatedId) {
                const impersonatedOrg = await prisma.organisation.findUnique({
                    where: { id: impersonatedId }
                });
                if (impersonatedOrg) {
                    organisation = impersonatedOrg;
                }
            }
        }

        if (!organisation) {
            return NextResponse.json(
                { error: "Organisation not found" },
                { status: 404 }
            );
        }

        // Get the active subscription (latest with status ACTIVE or CANCELING)
        const subscription = await prisma.subscription.findFirst({
            where: {
                organisationId: organisation.id,
                status: { in: ["ACTIVE", "CANCELING"] },
            },
            include: {
                plan: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Calculate trial information
        let trialInfo = null;
        if (organisation.isTrial && organisation.trialStartDate && organisation.trialEndDate) {
            const now = new Date();
            const trialEnd = new Date(organisation.trialEndDate);
            const trialStart = new Date(organisation.trialStartDate);
            const daysRemaining = Math.ceil(
                (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            trialInfo = {
                isActive: organisation.isTrial && now < trialEnd,
                daysRemaining: Math.max(0, daysRemaining),
                startDate: trialStart.toISOString(),
                endDate: trialEnd.toISOString(),
                isExpired: now >= trialEnd,
            };
        }

        // Parse plan features and limits
        let planData = null;
        if (subscription?.plan) {
            const features = subscription.plan.features
                ? JSON.parse(subscription.plan.features)
                : [];
            const usageLimits = subscription.plan.usageLimits
                ? JSON.parse(subscription.plan.usageLimits)
                : null;

            planData = {
                id: subscription.plan.id,
                name: subscription.plan.name,
                price: Number(subscription.plan.price),
                billingCycle: subscription.plan.billingCycle,
                features,
                usageLimits,
            };
        }

        // Build subscription response
        const subscriptionData = subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                startDate: subscription.startDate?.toISOString() || null,
                endDate: subscription.endDate?.toISOString() || null,
                renewalDate: subscription.renewalDate?.toISOString() || null,
                autoRenew: subscription.autoRenew,
                plan: planData,
            }
            : null;

        return NextResponse.json({
            subscription: subscriptionData,
            trial: trialInfo,
            organisation: {
                id: organisation.id,
                name: organisation.name,
                isApproved: organisation.isApproved,
            },
        });
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }
}
