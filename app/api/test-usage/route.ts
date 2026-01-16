import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkMessageLimit, incrementMessageUsage } from '@/lib/usage';

export async function GET() {
    try {
        const results: any[] = [];
        results.push('--- Starting Message Usage Verification ---');

        // 1. Find or create a test organization
        let org = await prisma.organisation.findFirst({
            where: { name: 'Test Org' }
        });

        if (!org) {
            org = await prisma.organisation.create({
                data: { name: 'Test Org' }
            });
        }
        results.push(`Using Organisation: ${org.name} (ID: ${org.id})`);

        // 2. Ensure it has a TRIAL plan
        let trialPlan = await prisma.plan.findUnique({ where: { name: 'FREE_TRIAL' } });
        if (!trialPlan) {
            trialPlan = await prisma.plan.create({
                data: {
                    name: 'FREE_TRIAL',
                    price: 0,
                    billingCycle: 'MONTHLY',
                    features: '[]',
                    smsLimit: 5,
                    whatsappLimit: 2
                }
            });
        } else {
            await prisma.plan.update({
                where: { id: trialPlan.id },
                data: { smsLimit: 5, whatsappLimit: 2 }
            });
        }

        let sub = await prisma.subscription.findFirst({
            where: { organisationId: org.id, status: 'ACTIVE' }
        });

        if (!sub) {
            sub = await prisma.subscription.create({
                data: {
                    organisationId: org.id,
                    planId: trialPlan.id,
                    status: 'ACTIVE',
                    startDate: new Date()
                }
            });
        } else {
            await prisma.subscription.update({
                where: { id: sub.id },
                data: { planId: trialPlan.id }
            });
        }

        // 3. Clear existing usage
        const now = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        await prisma.messageUsage.deleteMany({
            where: { organisationId: org.id, periodStart }
        });

        // 4. Test Check Limit
        let allowed = await checkMessageLimit(org.id, 'SMS');
        results.push(`SMS Allowed (initially): ${allowed}`);

        // 5. Increment until limit
        for (let i = 0; i < 5; i++) {
            await incrementMessageUsage(org.id, 'SMS');
            results.push(`Incremented SMS usage: ${i + 1}`);
        }

        // 6. Test Check Limit
        allowed = await checkMessageLimit(org.id, 'SMS');
        results.push(`SMS Allowed (after 5): ${allowed}`);

        // 7. Test WhatsApp
        for (let i = 0; i < 2; i++) {
            await incrementMessageUsage(org.id, 'WHATSAPP');
            results.push(`Incremented WhatsApp usage: ${i + 1}`);
        }
        allowed = await checkMessageLimit(org.id, 'WHATSAPP');
        results.push(`WhatsApp Allowed (after 2): ${allowed}`);

        results.push('--- Verification Complete ---');

        return NextResponse.json({ results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
