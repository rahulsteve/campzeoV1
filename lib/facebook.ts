import { getSocialMediaUrl, validateMediaUrl, isVideoUrl } from './media-utils';

interface FacebookCredentials {
    accessToken: string;
    pageId: string;
}

interface FacebookPostOptions {
    message: string;
    mediaUrls?: string | string[] | null;
    isReel?: boolean; // For Facebook Reels
}

export async function postToFacebook(
    credentials: FacebookCredentials,
    message: string,
    mediaUrls?: string | string[] | null,
    options?: { isReel?: boolean }
) {
    const { accessToken, pageId } = credentials;

    // Normalize mediaUrls to array
    const mediaList = Array.isArray(mediaUrls) ? mediaUrls : (mediaUrls ? [mediaUrls] : []);

    console.log(`[Facebook] Posting to page: ${pageId}, Media Count: ${mediaList.length}, Is Reel: ${options?.isReel || false}`);

    try {
        let postId: string;

        if (mediaList.length === 0) {
            // Text-only post
            const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    access_token: accessToken,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Facebook API error: ${JSON.stringify(error)}`);
            }

            const data = await response.json();
            postId = data.id;

        } else if (mediaList.length === 1) {
            // Single photo/video post
            const mediaUrl = mediaList[0];

            // Validate and convert URL
            const validation = validateMediaUrl(mediaUrl);

            if (!validation.valid) {
                console.warn(`[Facebook] ${validation.message} Posting as text-only.`);
                // Fall back to text-only post
                const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: message + '\n\n(Media not posted: URL not publicly accessible)',
                        access_token: accessToken,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(`Facebook API error: ${JSON.stringify(error)}`);
                }

                const data = await response.json();
                postId = data.id;
            } else {
                const publicUrl = validation.url;
                const isVideo = isVideoUrl(publicUrl);

                // Check if it's a Reel (short video)
                if (options?.isReel && isVideo) {
                    console.log(`[Facebook] Posting as Reel with URL: ${publicUrl}`);

                    // Post as Facebook Reel
                    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/video_reels`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            description: message,
                            video_url: publicUrl,
                            access_token: accessToken,
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        console.error('[Facebook] Reel API Error:', error);
                        throw new Error(`Facebook Reel API error: ${JSON.stringify(error)}`);
                    }

                    const data = await response.json();
                    postId = data.id;

                } else {
                    // Regular photo or video post
                    const endpoint = isVideo ? 'videos' : 'photos';
                    console.log(`[Facebook] Posting ${endpoint} with URL: ${publicUrl}`);

                    const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message,
                            [isVideo ? 'file_url' : 'url']: publicUrl,
                            access_token: accessToken,
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        console.error('[Facebook] API Error:', error);
                        throw new Error(`Facebook API error: ${JSON.stringify(error)}`);
                    }

                    const data = await response.json();
                    postId = data.id;
                }
            }

        } else {
            // Multiple photos - use batch upload
            const photoIds: string[] = [];

            for (const mediaUrl of mediaList) {
                const validation = validateMediaUrl(mediaUrl);

                if (!validation.valid) {
                    console.warn(`[Facebook] Skipping invalid URL: ${mediaUrl}`);
                    continue;
                }

                const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/photos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: validation.url,
                        published: false, // Don't publish yet
                        access_token: accessToken,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error(`Failed to upload photo: ${error}`);
                    continue;
                }

                const data = await response.json();
                photoIds.push(data.id);
            }

            if (photoIds.length === 0) {
                throw new Error('No valid photos could be uploaded');
            }

            // Create album post with all photos
            const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    attached_media: photoIds.map(id => ({ media_fbid: id })),
                    access_token: accessToken,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`Facebook API error: ${JSON.stringify(error)}`);
            }

            const data = await response.json();
            postId = data.id;
        }

        console.log(`[Facebook] Post created successfully: ${postId}`);
        return { id: postId };

    } catch (error) {
        console.error('Facebook posting error:', error);
        throw error;
    }
}
