import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
        const user = await currentUser();
        if (!user) {
            throw new Error("Unauthorized");
        }

        const jsonResponse = await handleUpload({
            body,
            request,
            onBeforeGenerateToken: async (pathname, clientPayload) => {
                // Authenticate user here
                return {
                    // Allowed content types are commented out to allow ANY file type
                    // allowedContentTypes: [ ... ], 
                    tokenPayload: JSON.stringify({
                        userId: user.id,
                    }),
                };
            },
            onUploadCompleted: async ({ blob, tokenPayload }) => {
                console.log('Blob uploaded successfully:', blob.url);
            },
        });

        return NextResponse.json(jsonResponse);
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 400 },
        );
    }
}
