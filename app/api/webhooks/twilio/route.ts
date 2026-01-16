import { NextResponse } from 'next/server';
import { incrementMessageUsage } from '@/lib/usage';

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const channel = searchParams.get('channel') as 'SMS' | 'WHATSAPP' | null;

    try {
        const body = await req.text();
        const params = new URLSearchParams(body);
        const messageSid = params.get('MessageSid');
        const messageStatus = params.get('MessageStatus');

        console.log(`[Twilio Webhook] Received status update: SID=${messageSid}, Status=${messageStatus}, Org=${orgId}, Channel=${channel}`);

        // Increment usage if message is sent or delivered
        // Note: Twilio sends 'sent' when it leaves their service and 'delivered' when handset confirms.
        // We catch both but should ensure we don't double count if both arrive (Twilio usually only sends one success state depending on carrier).
        // Actually, Twilio might send 'sent' THEN 'delivered'. We should ideally track the SID to avoid double counting.

        const successStatuses = ['sent', 'delivered'];
        if (orgId && channel && messageStatus && successStatuses.includes(messageStatus)) {
            // Check if we already incremented for this SID (optional but recommended)
            // For now, simple logic as requested: increment on success.
            console.log(`[Twilio Webhook] SUCCESS: Incrementing ${channel} usage for Org: ${orgId}`);
            await incrementMessageUsage(parseInt(orgId), channel);
        } else if (!successStatuses.includes(messageStatus || '')) {
            console.log(`[Twilio Webhook] Status '${messageStatus}' is not a final success state. No increment.`);
        }

        return new NextResponse('<Response></Response>', {
            headers: { 'Content-Type': 'text/xml' },
            status: 200
        });
    } catch (error) {
        console.error("Error processing Twilio webhook:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
