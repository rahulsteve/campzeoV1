import { prisma } from "@/lib/prisma";
import { Buffer } from 'buffer';

interface LinkedInCredentials {
    accessToken: string;
    authorUrn: string;
}

export async function postToLinkedIn(
    credentials: LinkedInCredentials,
    text: string,
    mediaUrls?: string | string[] | null
) {
    let { accessToken, authorUrn } = credentials;

    // Ensure authorUrn is a valid URN
    if (authorUrn && !authorUrn.startsWith("urn:li:")) {
        authorUrn = `urn:li:person:${authorUrn}`;
    }

    // Normalize mediaUrls to array
    const mediaList = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);

    console.log(`[LinkedIn] Posting with Author URN: ${authorUrn}, Media Count: ${mediaList.length}`);

    const commonHeaders = {
        "Authorization": `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202401",
    };

    try {
        const assets: { urn: string, isVideo: boolean }[] = [];

        // Upload all media files
        for (const mediaUrl of mediaList) {
            // Determine if image or video
            // Improved regex to handle URLs with query parameters (e.g. ?token=...)
            const isVideo = !!mediaUrl.match(/\.(mp4|mov|webm)(\?.*)?$/i);

            // 1. Register Upload
            console.log(`[LinkedIn] Registering upload for ${mediaUrl} (Is Video: ${isVideo})...`);
            const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
                method: "POST",
                headers: {
                    ...commonHeaders,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    registerUploadRequest: {
                        recipes: [isVideo ? "urn:li:digitalmediaRecipe:feedshare-video" : "urn:li:digitalmediaRecipe:feedshare-image"],
                        owner: authorUrn,
                        serviceRelationships: [
                            {
                                relationshipType: "OWNER",
                                identifier: "urn:li:userGeneratedContent",
                            },
                        ],
                    },
                }),
            });

            if (!registerResponse.ok) {
                const errorText = await registerResponse.text();
                console.error(`[LinkedIn] Register Upload Failed: ${registerResponse.status} ${registerResponse.statusText}`);
                console.error(`[LinkedIn] Error Body: ${errorText}`);
                throw new Error(`Failed to register upload (${registerResponse.status}): ${errorText}`);
            }

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
            const assetUrn = registerData.value.asset;

            console.log(`[LinkedIn] Upload registered. Asset URN: ${assetUrn}`);

            // 2. Upload File
            // Fetch the media file from the URL (works with both Vercel Blob and local URLs)
            console.log(`[LinkedIn] Fetching media from: ${mediaUrl}`);

            // Determine the full URL
            let fetchUrl = mediaUrl;
            if (!mediaUrl.startsWith('http://') && !mediaUrl.startsWith('https://')) {
                // Relative URL - convert to absolute
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
                fetchUrl = `${baseUrl}${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`;
            }

            console.log(`[LinkedIn] Fetching from URL: ${fetchUrl}`);

            const fetchOptions: RequestInit = {};
            // If fetching from Vercel Blob and token is available, include it (User request)
            if (process.env.BLOB_READ_WRITE_TOKEN && fetchUrl.includes('vercel-storage.com')) {
                fetchOptions.headers = { 'Authorization': `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` };
            }

            const mediaResponse = await fetch(fetchUrl, fetchOptions);

            if (!mediaResponse.ok) {
                throw new Error(`Failed to fetch media file: ${mediaResponse.status} ${mediaResponse.statusText}`);
            }

            const fileBuffer = Buffer.from(await mediaResponse.arrayBuffer());

            console.log("[LinkedIn] Uploading file...");
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/octet-stream",
                },
                body: fileBuffer,
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error(`[LinkedIn] File Upload Failed: ${uploadResponse.status} ${uploadResponse.statusText}`, errorText);
                throw new Error(`Failed to upload file: ${errorText}`);
            }
            console.log("[LinkedIn] File uploaded successfully.");

            assets.push({ urn: assetUrn, isVideo });
        }

        // 3. Create Post
        console.log("[LinkedIn] Creating UGC post...");
        const shareBody: any = {
            author: authorUrn,
            lifecycleState: "PUBLISHED",
            specificContent: {
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: text,
                    },
                    shareMediaCategory: "NONE",
                },
            },
            visibility: {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
        };

        if (assets.length > 0) {
            // If any video, treat as VIDEO (LinkedIn only supports single video usually, or mixed? 
            // Standard API supports single video OR multiple images. Not mixed usually.)
            // If multiple assets and one is video, we might have an issue if we try to send all.
            // For now, if there's a video, we take the first video and ignore others, or assume user knows what they are doing.
            // If all images, we send all.

            const hasVideo = assets.some(a => a.isVideo);

            if (hasVideo) {
                shareBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "VIDEO";
                // Only take the first video
                const videoAsset = assets.find(a => a.isVideo);
                shareBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
                    {
                        status: "READY",
                        description: { text: "Video content" },
                        media: videoAsset?.urn,
                        title: { text: "Video content" },
                    }
                ];
            } else {
                shareBody.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory = "IMAGE";
                shareBody.specificContent["com.linkedin.ugc.ShareContent"].media = assets.map(asset => ({
                    status: "READY",
                    description: { text: "Image content" },
                    media: asset.urn,
                    title: { text: "Image content" },
                }));
            }
        }

        const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
            method: "POST",
            headers: {
                ...commonHeaders,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(shareBody),
        });

        if (!postResponse.ok) {
            const errorText = await postResponse.text();
            console.error(`[LinkedIn] Create Post Failed: ${postResponse.status} ${postResponse.statusText}`, errorText);
            throw new Error(`Failed to create post: ${errorText}`);
        }

        const postData = await postResponse.json();
        console.log("[LinkedIn] Post created successfully:", postData.id);
        return postData;

    } catch (error) {
        console.error("LinkedIn posting error:", error);
        throw error;
    }
}
