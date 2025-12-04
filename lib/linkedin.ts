import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

interface LinkedInCredentials {
    accessToken: string;
    authorUrn: string;
}

export async function postToLinkedIn(
    credentials: LinkedInCredentials,
    text: string,
    mediaUrls?: string | string[] | null
) {
    const { accessToken, authorUrn } = credentials;

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
            const isVideo = !!mediaUrl.match(/\.(mp4|mov|webm)$/i);

            // 1. Register Upload
            console.log(`[LinkedIn] Registering upload for ${mediaUrl}...`);
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
                console.error(`[LinkedIn] Register Upload Failed: ${registerResponse.status} ${registerResponse.statusText}`, errorText);
                throw new Error(`Failed to register upload: ${errorText}`);
            }

            const registerData = await registerResponse.json();
            const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
            const assetUrn = registerData.value.asset;

            console.log(`[LinkedIn] Upload registered. Asset URN: ${assetUrn}`);

            // 2. Upload File
            const publicDir = path.join(process.cwd(), "public");
            const filePath = path.join(publicDir, mediaUrl);

            console.log(`[LinkedIn] Reading file from: ${filePath}`);
            const fileBuffer = await fs.readFile(filePath);

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
