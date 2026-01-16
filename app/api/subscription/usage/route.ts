import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logError, logWarning } from "@/lib/audit-logger";

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            await logWarning("Unauthorized access attempt to fetch usage metrics", { action: "fetch-usage-metrics" });
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { organisation: true },
        });

        if (!dbUser || !dbUser.organisationId) {
            return NextResponse.json(
                { error: "User not found or no organisation" },
                { status: 404 }
            );
        }

        const organisationId = dbUser.organisationId;
        const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        console.log(`[Usage API] Fetching usage for Org: ${organisationId}, Period: ${periodStart.toISOString()}`);
        const subscription = await prisma.subscription.findFirst({
            where: {
                organisationId,
                status: { in: ["ACTIVE", "CANCELING"] },
            },
            include: {
                plan: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // Parse usage limits from plan
        // Parse usage limits from plan
        let usageLimits;
        const defaultLimits = {
            campaigns: 999999,
            contacts: 999999,
            users: 999999,
            platforms: 999999,
            postsPerMonth: 999999,
        };

        try {
            usageLimits = subscription?.plan?.usageLimits
                ? JSON.parse(subscription.plan.usageLimits as string)
                : defaultLimits;

            // Validate it's an object
            if (typeof usageLimits !== 'object' || usageLimits === null) {
                usageLimits = defaultLimits;
            }
        } catch (e) {
            usageLimits = defaultLimits;
        }

        // Count current usage
        const [campaignsCount, contactsCount, usersCount, platformsCount, postsThisMonthCount, smsUsage, whatsappUsage] =
            await Promise.all([
                // Count active campaigns (not deleted)
                prisma.campaign.count({
                    where: {
                        organisationId,
                        isDeleted: false,
                    },
                }),
                // Count contacts
                prisma.contact.count({
                    where: {
                        organisationId,
                    },
                }),
                // Count users
                prisma.user.count({
                    where: {
                        organisationId,
                    },
                }),
                // Count organisation platforms
                prisma.organisationPlatform.count({
                    where: {
                        organisationId,
                    },
                }),
                // Count campaign posts created this month
                prisma.campaignPost.count({
                    where: {
                        campaign: {
                            organisationId,
                        },
                        createdAt: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                }),
                // Count SMS usage for current period
                prisma.messageUsage.findUnique({
                    where: {
                        organisationId_channel_periodStart: {
                            organisationId,
                            channel: 'SMS',
                            periodStart,
                        },
                    },
                }),
                // Count WhatsApp usage for current period
                prisma.messageUsage.findUnique({
                    where: {
                        organisationId_channel_periodStart: {
                            organisationId,
                            channel: 'WHATSAPP',
                            periodStart,
                        },
                    },
                }),
            ]);

        // Calculate usage metrics
        const calculateMetric = (current: number, limit: number | null | undefined) => {
            const actualLimit = limit || 0;
            const percentage = actualLimit > 0 ? (current / actualLimit) * 100 : 0;
            return {
                current,
                limit: actualLimit,
                percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
                isNearLimit: actualLimit > 0 && percentage >= 80,
            };
        };

        const usage = {
            campaigns: calculateMetric(campaignsCount, usageLimits.campaigns),
            contacts: calculateMetric(contactsCount, usageLimits.contacts),
            users: calculateMetric(usersCount, usageLimits.users),
            platforms: calculateMetric(platformsCount, usageLimits.platforms),
            postsThisMonth: calculateMetric(postsThisMonthCount, usageLimits.postsPerMonth),
            sms: calculateMetric(smsUsage?.count || 0, subscription?.plan?.smsLimit),
            whatsapp: calculateMetric(whatsappUsage?.count || 0, subscription?.plan?.whatsappLimit),
        };

        return NextResponse.json({ usage });
    } catch (error: any) {
        console.error("Error calculating usage:", error);
        await logError("Failed to calculate usage metrics", { userId: "unknown" }, error);
        return NextResponse.json(
            { error: "Failed to calculate usage metrics" },
            { status: 500 }
        );
    }
}
