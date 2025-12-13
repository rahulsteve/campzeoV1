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
    isVideo?: boolean; // Explicitly specify if media is video (bypass URL check)
}

export async function postToInstagram(
    credentials: InstagramCredentials,
    caption: string,
    mediaUrls?: string | string[] | null,
    options?: { isReel?: boolean; shareToFeed?: boolean; isVideo?: boolean }
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
                console.warn(`[Instagram] Media URL validation warning: ${validation.message} (Proceeding, but strictly public URLs are required)`);
                // throw new Error(`Invalid media URL: ${validation.message}`);
                // Only warn instead of throw to allow testing if user knows what they are doing or for some edge cases
                return validation.url;
            }
            return validation.url;
        });

        const firstMediaUrl = validatedUrls[0];
        // Determine isVideo: Explicit option > isReel > URL Check
        const isVideo = options?.isVideo ?? (options?.isReel || isVideoUrl(firstMediaUrl));

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

            // Always wait for processing, even for images if they are large
            console.log(`[Instagram] Waiting for media processing: ${creationId}`);
            await waitForMediaProcessing(creationId, accessToken);

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
                    const itemId = containerData.id;

                    // Wait for item processing
                    await waitForMediaProcessing(itemId, accessToken);

                    containerIds.push(itemId);
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

            // Wait for carousel container processing
            await waitForMediaProcessing(carouselData.id, accessToken);

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
        await waitForMediaProcessing(creationId, accessToken, 60000); // 60 second timeout

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
 * Wait for Instagram media processing to complete (works for Video and Image)
 */
async function waitForMediaProcessing(
    creationId: string,
    accessToken: string,
    timeout: number = 60000 // Increased default timeout to 60s
): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 3000; // Check every 3 seconds

    console.log(`[Instagram] Waiting for media processing: ${creationId}`);

    while (Date.now() - startTime < timeout) {
        try {
            const statusResponse = await fetch(
                `https://graph.facebook.com/v18.0/${creationId}?fields=status_code,status&access_token=${accessToken}`
            );

            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                const statusCode = statusData.status_code;

                // FINISHED is for Video, READY can be for Image or Carousel containers? 
                // Documentation says: 
                //   - Images: usually READY immediately
                //   - Videos: FINISHED when done
                //   - Carousel Container: FINISHED when done
                // If status_code is missing, it might be an image which is ready immediately, but let's check carefully.

                console.log(`[Instagram] Media ${creationId} status: ${statusCode}`);

                if (statusCode === 'FINISHED' || statusCode === 'READY') {
                    console.log(`[Instagram] Media processing complete: ${creationId}`);
                    return;
                } else if (statusCode === 'ERROR') {
                    throw new Error(`Media processing failed for ${creationId}`);
                }

                // If status is IN_PROGRESS or PUBLISHED (already?), wait.
            } else {
                // If fetch failed, might be transient API error
                console.warn(`[Instagram] Status check failed for ${creationId}: ${statusResponse.status}`);
            }
        } catch (e) {
            console.error(`[Instagram] Error checking status for ${creationId}`, e);
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Media processing timeout for ${creationId}`);
}
