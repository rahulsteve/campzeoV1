import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'ACe508f85acf71a2242bad0c01b47278c2';
const authToken = process.env.TWILIO_AUTH_TOKEN || '7f9b45017ac134920d6f6f1dd75d4ed2';
const twilioNumber = process.env.TWILIO_PHONE_NUMBER || '+13093160811';

const client = twilio(accountSid, authToken);

export async function sendSms(to: string, body: string) {
    try {
        const message = await client.messages.create({
            body: body,
            from: twilioNumber,
            to: to,
        });
        console.log(`SMS sent to ${to}: ${message.sid}`);
        return message;
    } catch (error) {
        console.error('Error sending SMS:', error);
        // Don't throw error to prevent blocking the flow, just log it
        return null;
    }
}

export async function sendWhatsapp(to: string, body: string) {
    try {
        const message = await client.messages.create({
            body: body,
            from: `whatsapp:${twilioNumber}`,
            to: `whatsapp:${to}`,
        });
        console.log(`WhatsApp sent to ${to}: ${message.sid}`);
        return message;
    } catch (error) {
        console.error('Error sending WhatsApp:', error);
        return null;
    }
}
