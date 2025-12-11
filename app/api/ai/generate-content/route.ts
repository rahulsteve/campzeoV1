import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateContent, refineContent } from '@/lib/ai-horde';

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { prompt, context, mode } = body;

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        let result;

        // Handle different modes
        if (mode === 'refine' && context?.existingContent) {
            result = await refineContent(
                context.existingContent,
                prompt,
                context.platform
            );
        } else {
            result = await generateContent(prompt, context);
        }

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to generate content' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            content: result.content,
        });
    } catch (error: any) {
        console.error('Generate content API error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
