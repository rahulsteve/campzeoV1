import { NextResponse } from 'next/server';

export async function GET() {
    return new NextResponse('24741287', {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
