import { getSocialMediaUrl, validateMediaUrl, isVideoUrl } from './media-utils';

interface InstagramCredentials {
    accessToken: string;
    userId: string;
}

interface InstagramPostOptions {
    caption: string;
    mediaUrls?: string | string[] | null;
    isReel?: boolean; // For Instagram Reels
    shareToFeed?: boolean; // Share Reel to feed as well
}

export async function postToInstagram(
    credentials: InstagramCredentials,
    caption: string,
    mediaUrls?: string | string[] | null,
    options?: { isReel?: boolean; shareToFeed?: boolean }
) {
    const { accessToken, userId } = credentials;

    // Normalize mediaUrls to array
    const mediaList = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);

    if (mediaList.length === 0) {
        throw new Error('Instagram requires at least one image or video');
    }

    console.log(`[Instagram] Posting to user: ${userId}, Media Count: ${mediaList.length}, Is Reel: ${options?.isReel || false}`);

    try {
        // Validate and convert URLs
        const validatedUrls = mediaList.map(url => {
            const validation = validateMediaUrl(url);
            if (!validation.valid) {
                throw new Error(`Invalid media URL: ${validation.message}`);
            }
            return validation.url;
        });

        const firstMediaUrl = validatedUrls[0];
        const isVideo = isVideoUrl(firstMediaUrl);

        // Check if it's a Reel
        if (options?.isReel && isVideo) {
            return await postInstagramReel(credentials, caption, firstMediaUrl, options.shareToFeed);
        }

        if (validatedUrls.length === 1) {
            // Single media post
            const mediaType = isVideo ? 'VIDEO' : 'IMAGE';

            // Step 1: Create media container
            const containerResponse = await fetch(
                `https://graph.facebook.com/v18.0/${userId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [isVideo ? 'video_url' : 'image_url']: firstMediaUrl,
                        caption,
                        media_type: mediaType,
                        access_token: accessToken,
                    }),
                }
            );

            if (!containerResponse.ok) {
                const error = await containerResponse.json();
                throw new Error(`Instagram container creation error: ${JSON.stringify(error)}`);
            }

            const containerData = await containerResponse.json();
            const creationId = containerData.id;

            // For videos, we might need to wait for processing
            if (isVideo) {
                console.log('[Instagram] Waiting for video processing...');
                await waitForVideoProcessing(userId, creationId, accessToken);
            }

            // Step 2: Publish the container
            const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/${userId}/media_publish`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        creation_id: creationId,
                        access_token: accessToken,
                    }),
                }
            );

            if (!publishResponse.ok) {
                const error = await publishResponse.json();
                throw new Error(`Instagram publish error: ${JSON.stringify(error)}`);
            }

            const publishData = await publishResponse.json();
            console.log(`[Instagram] Post created successfully: ${publishData.id}`);
            return { id: publishData.id };

        } else {
            // Carousel post (multiple images/videos)
            const containerIds: string[] = [];
            const failedItems: string[] = [];

            // Create containers for each media item
            for (let i = 0; i < validatedUrls.length; i++) {
                const mediaUrl = validatedUrls[i];
                const mediaIsVideo = isVideoUrl(mediaUrl);
                
                console.log(`[Instagram] Creating carousel item ${i + 1}/${validatedUrls.length}, Type: ${mediaIsVideo ? 'VIDEO' : 'IMAGE'}`);

                try {
                    const containerResponse = await fetch(
                        `https://graph.facebook.com/v18.0/${userId}/media`,
                        {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                [mediaIsVideo ? 'video_url' : 'image_url']: mediaUrl,
                                is_carousel_item: true,
                                access_token: accessToken,
                            }),
                        }
                    );

                    if (!containerResponse.ok) {
                        const error = await containerResponse.json();
                        console.error(`[Instagram] Failed to create carousel item ${i + 1}: ${JSON.stringify(error)}`);
                        failedItems.push(`Item ${i + 1}: ${error.error?.message || 'Unknown error'}`);
                        continue;
                    }

                    const containerData = await containerResponse.json();
                    containerIds.push(containerData.id);
                } catch (err) {
                    console.error(`[Instagram] Exception creating carousel item ${i + 1}:`, err);
                    failedItems.push(`Item ${i + 1}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }

            if (containerIds.length === 0) {
                throw new Error(`Carousel upload failed: No valid media items could be uploaded. Failed: ${failedItems.join('; ')}`);
            }
            
            if (failedItems.length > 0) {
                console.warn(`[Instagram] Some carousel items failed: ${failedItems.join('; ')}. Continuing with ${containerIds.length} items.`);
            }

            // Create carousel container
            const carouselResponse = await fetch(
                `https://graph.facebook.com/v18.0/${userId}/media`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        media_type: 'CAROUSEL',
                        caption,
                        children: containerIds,
                        access_token: accessToken,
                    }),
                }
            );

            if (!carouselResponse.ok) {
                const error = await carouselResponse.json();
                throw new Error(`Instagram carousel creation error: ${JSON.stringify(error)}`);
            }

            const carouselData = await carouselResponse.json();

            // Publish carousel
            const publishResponse = await fetch(
                `https://graph.facebook.com/v18.0/${userId}/media_publish`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        creation_id: carouselData.id,
                        access_token: accessToken,
                    }),
                }
            );

            if (!publishResponse.ok) {
                const error = await publishResponse.json();
                throw new Error(`Instagram publish error: ${JSON.stringify(error)}`);
            }

            const publishData = await publishResponse.json();
            console.log(`[Instagram] Carousel post created successfully: ${publishData.id}`);
            return { id: publishData.id };
        }

    } catch (error) {
        console.error('Instagram posting error:', error);
        throw error;
    }
}

/**
 * Post an Instagram Reel
 */
async function postInstagramReel(
    credentials: InstagramCredentials,
    caption: string,
    videoUrl: string,
    shareToFeed: boolean = true
) {
    const { accessToken, userId } = credentials;

    console.log(`[Instagram] Creating Reel with video: ${videoUrl}`);

    try {
        // Step 1: Create Reel container
        const containerResponse = await fetch(
            `https://graph.facebook.com/v18.0/${userId}/media`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    media_type: 'REELS',
                    video_url: videoUrl,
                    caption,
                    share_to_feed: shareToFeed,
                    access_token: accessToken,
                }),
            }
        );

        if (!containerResponse.ok) {
            const error = await containerResponse.json();
            throw new Error(`Instagram Reel container error: ${JSON.stringify(error)}`);
        }

        const containerData = await containerResponse.json();
        const creationId = containerData.id;

        // Step 2: Wait for video processing
        console.log('[Instagram] Waiting for Reel video processing...');
        await waitForVideoProcessing(userId, creationId, accessToken, 60000); // 60 second timeout

        // Step 3: Publish the Reel
        const publishResponse = await fetch(
            `https://graph.facebook.com/v18.0/${userId}/media_publish`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: accessToken,
                }),
            }
        );

        if (!publishResponse.ok) {
            const error = await publishResponse.json();
            throw new Error(`Instagram Reel publish error: ${JSON.stringify(error)}`);
        }

        const publishData = await publishResponse.json();
        console.log(`[Instagram] Reel created successfully: ${publishData.id}`);
        return { id: publishData.id };

    } catch (error) {
        console.error('Instagram Reel posting error:', error);
        throw error;
    }
}

/**
 * Wait for Instagram video processing to complete
 */
async function waitForVideoProcessing(
    userId: string,
    containerId: string,
    accessToken: string,
    timeout: number = 30000
): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 2000; // Check every 2 seconds

    while (Date.now() - startTime < timeout) {
        const statusResponse = await fetch(
            `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${accessToken}`
        );

        if (statusResponse.ok) {
            const statusData = await statusResponse.json();

            if (statusData.status_code === 'FINISHED') {
                console.log('[Instagram] Video processing complete');
                return;
            } else if (statusData.status_code === 'ERROR') {
                throw new Error('Video processing failed');
            }

            console.log(`[Instagram] Video status: ${statusData.status_code}, waiting...`);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Video processing timeout');
}
