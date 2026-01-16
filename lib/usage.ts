import { prisma } from './prisma';

export type MessageChannel = 'SMS' | 'WHATSAPP';

export async function checkMessageLimit(organisationId: number, channel: MessageChannel): Promise<boolean> {
    try {
        // Get active subscription and its plan
        const subscription = await prisma.subscription.findFirst({
            where: {
                organisationId,
                status: { in: ['ACTIVE', 'CANCELING'] },
            },
            include: {
                plan: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!subscription || !subscription.plan) {
            console.warn(`No active subscription found for organisation ${organisationId}`);
            return false;
        }

        const plan = subscription.plan;
        const limit = channel === 'SMS' ? plan.smsLimit : plan.whatsappLimit;

        // If limit is 0, it means unlimited (Custom/Enterprise)
        if (limit === 0 || limit === null) {
            return true;
        }

        // Get current month's usage
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const usage = await prisma.messageUsage.findUnique({
            where: {
                organisationId_channel_periodStart: {
                    organisationId,
                    channel,
                    periodStart,
                },
            },
        });

        const currentCount = usage ? usage.count : 0;
        return currentCount < limit;
    } catch (error) {
        console.error(`Error checking message limit for organisation ${organisationId}:`, error);
        return false; // Fail safe: block if error occurs
    }
}

export async function incrementMessageUsage(organisationId: number, channel: MessageChannel): Promise<void> {
    try {
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const id = `${organisationId}-${channel}-${periodStart.getTime()}`;

        await prisma.messageUsage.upsert({
            where: {
                organisationId_channel_periodStart: {
                    organisationId,
                    channel,
                    periodStart,
                },
            },
            update: {
                count: {
                    increment: 1,
                },
                updatedAt: new Date(),
            },
            create: {
                id,
                organisationId,
                channel,
                count: 1,
                periodStart,
                periodEnd,
                updatedAt: new Date(),
            },
        });
    } catch (error) {
        console.error(`Error incrementing message usage for organisation ${organisationId}:`, error);
    }
}
