import { NextRequest, NextResponse } from "next/server";
import { put } from '@vercel/blob';
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

// File size limits (in bytes)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB for images
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Validate file type
        const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
        const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

        if (!isImage && !isVideo) {
            return NextResponse.json({
                error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP, MP4, MOV, WebM"
            }, { status: 400 });
        }

        // Validate file size
        const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            return NextResponse.json({
                error: `File too large. Maximum size: ${maxSizeMB}MB`
            }, { status: 400 });
        }

        // Generate unique filename
        const fileExtension = file.name.split('.').pop();
        const filename = `${crypto.randomUUID()}.${fileExtension}`;

        // Check if we're in production (Vercel) or development (localhost)
        const isProduction = process.env.VERCEL === '1' || process.env.BLOB_READ_WRITE_TOKEN;

        let url: string;

        if (isProduction && process.env.BLOB_READ_WRITE_TOKEN) {
            // Production: Use Vercel Blob
            console.log('[Upload] Using Vercel Blob storage');

            const blob = await put(filename, file, {
                access: 'public',
                addRandomSuffix: false,
            });

            url = blob.url;
            console.log('[Upload] File uploaded to Vercel Blob:', url);

        } else {
            // Development: Use local filesystem
            console.log('[Upload] Using local filesystem storage');

            const buffer = Buffer.from(await file.arrayBuffer());
            const uploadDir = path.join(process.cwd(), "public", "uploads");

            try {
                await mkdir(uploadDir, { recursive: true });
            } catch (e) {
                // Directory already exists
            }

            const filepath = path.join(uploadDir, filename);
            await writeFile(filepath, buffer);

            // Return relative URL for localhost
            url = `/uploads/${filename}`;
            console.log('[Upload] File uploaded to local storage:', url);
        }

        return NextResponse.json({
            url,
            filename,
            size: file.size,
            type: file.type,
            isImage,
            isVideo
        });

    } catch (error) {
        console.error("Error uploading file:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : "Upload failed"
        }, { status: 500 });
    }
}

// Optional: Add GET endpoint to retrieve upload info
export async function GET() {
    return NextResponse.json({
        maxImageSize: MAX_IMAGE_SIZE,
        maxVideoSize: MAX_VIDEO_SIZE,
        allowedImageTypes: ALLOWED_IMAGE_TYPES,
        allowedVideoTypes: ALLOWED_VIDEO_TYPES,
        storage: process.env.BLOB_READ_WRITE_TOKEN ? 'vercel-blob' : 'local-filesystem'
    });
}
