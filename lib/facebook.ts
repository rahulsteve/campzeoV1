import { getSocialMediaUrl, validateMediaUrl, isVideoUrl } from './media-utils';
import { Buffer } from 'buffer';

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
            // Multiple media items (mix of photos and videos)
            const mediaIds: string[] = [];

            for (const mediaUrl of mediaList) {
                const validation = validateMediaUrl(mediaUrl);

                if (!validation.valid) {
                    console.warn(`[Facebook] Skipping invalid URL: ${mediaUrl}`);
                    continue;
                }

                const isVideo = isVideoUrl(validation.url);
                const endpoint = isVideo ? 'videos' : 'photos';
                const urlKey = isVideo ? 'file_url' : 'url';

                console.log(`[Facebook] Uploading ${endpoint}: ${validation.url}`);

                const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        [urlKey]: validation.url,
                        published: false, // Don't publish yet
                        access_token: accessToken,
                    }),
                });

                if (!response.ok) {
                    const error = await response.json();
                    console.error(`Failed to upload ${endpoint}: ${error}`);
                    continue;
                }

                const data = await response.json();
                mediaIds.push(data.id);
            }

            if (mediaIds.length === 0) {
                throw new Error('No valid media could be uploaded');
            }

            // Create post with all media (photos and videos)
            const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    attached_media: mediaIds.map(id => ({ media_fbid: id })),
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

// Create a Facebook Video Collection/Playlist
export async function createFacebookVideoCollection(
    credentials: FacebookCredentials,
    title: string,
    description: string
) {
    const { accessToken, pageId } = credentials;

    console.log(`[Facebook] Creating video collection: ${title}`);

    try {
        // Facebook uses "video_collections" endpoint for organizing videos
        const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/video_collections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                access_token: accessToken,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Facebook] Video collection creation error:', error);
            throw new Error(`Facebook video collection creation failed: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        console.log(`[Facebook] Video collection created successfully: ${data.id}`);
        return { id: data.id };

    } catch (error) {
        console.error('Facebook video collection error:', error);
        throw error;
    }
}

// Add video to Facebook Video Collection
export async function addVideoToFacebookCollection(
    credentials: FacebookCredentials,
    collectionId: string,
    videoId: string,
    metadata?: {
        title?: string;
        description?: string;
        thumbnailUrl?: string;
    }
) {
    const { accessToken } = credentials;

    console.log(`[Facebook] Adding video ${videoId} to collection ${collectionId}`);

    try {
        const body: any = {
            video_id: videoId,
            access_token: accessToken,
        };

        // Add optional metadata if provided
        if (metadata?.title) {
            body.title = metadata.title;
        }
        if (metadata?.description) {
            body.description = metadata.description;
        }

        const response = await fetch(`https://graph.facebook.com/v18.0/${collectionId}/videos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[Facebook] Failed to add video to collection:', error);
            throw new Error(`Failed to add video to collection: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        console.log(`[Facebook] Video added to collection successfully`);

        // Update video thumbnail if provided
        if (metadata?.thumbnailUrl) {
            try {
                await setFacebookVideoThumbnail(accessToken, videoId, metadata.thumbnailUrl);
                console.log(`[Facebook] Thumbnail updated for video in collection`);
            } catch (err) {
                console.warn(`[Facebook] Failed to update thumbnail (non-blocking):`, err);
            }
        }

        return { success: true, itemId: data.id };

    } catch (error) {
        console.error('Facebook add to collection error:', error);
        throw error;
    }
}

// Update Facebook video thumbnail
async function setFacebookVideoThumbnail(
    accessToken: string,
    videoId: string,
    thumbnailUrl: string
): Promise<void> {
    try {
        // Fetch thumbnail from URL
        const thumbnailResponse = await fetch(thumbnailUrl);
        if (!thumbnailResponse.ok) {
            throw new Error(`Failed to fetch thumbnail: ${thumbnailResponse.statusText}`);
        }

        const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
        const contentType = thumbnailResponse.headers.get('content-type') || 'image/jpeg';

        // Upload thumbnail to Facebook
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${videoId}/picture?access_token=${accessToken}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': contentType,
                },
                body: thumbnailBuffer,
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Thumbnail upload failed: ${error}`);
        }

        console.log(`[Facebook] Thumbnail set for video ${videoId}`);
    } catch (error) {
        console.error('Facebook thumbnail upload error:', error);
        throw error;
    }
}

export interface FacebookPost {
    id: string;
    message?: string;
    created_time: string;
    full_picture?: string;
    permalink_url: string;
    likes?: { summary: { total_count: number } };
    comments?: { summary: { total_count: number } };
}

export async function getFacebookPagePosts(
    credentials: FacebookCredentials,
    limit: number = 5
): Promise<FacebookPost[]> {
    const { accessToken, pageId } = credentials;

    try {
        const fields = 'id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true)';
        const response = await fetch(
            `https://graph.facebook.com/v18.0/${pageId}/feed?fields=${fields}&limit=${limit}&access_token=${accessToken}`,
            { method: 'GET' }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to fetch posts: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error('Facebook fetch posts error:', error);
        throw error;
    }
}

export interface FacebookPostInsights {
    likes: number;
    comments: number;
    impressions: number;
    reach: number;
    engagementRate: number;
    isDeleted?: boolean;
}

export async function getFacebookPostInsights(
    postId: string,
    accessToken: string
): Promise<FacebookPostInsights> {
    try {
        // 1. Get basic interaction counts (likes, comments)
        const fields = 'likes.summary(true),comments.summary(true),shares';
        const postResponse = await fetch(
            `https://graph.facebook.com/v18.0/${postId}?fields=${fields}&access_token=${accessToken}`
        );

        if (!postResponse.ok) {
            const error = await postResponse.json();
            // Check for specific error codes or status
            // Code 100 with subcode 33: "Object with ID '...' does not exist" -> Deleted
            // Code 803: "Some of the aliases you requested do not exist" -> Deleted
            // Status 400 or 404 often implies it's gone if the ID format is correct.
            const errorCode = error.error?.code;
            const errorSubcode = error.error?.error_subcode;

            if (errorCode === 100 || errorCode === 803 || errorCode === 210) {
                console.warn(`[Facebook] Post ${postId} marked as deleted. Error code: ${errorCode}, Subcode: ${errorSubcode}`);
                return {
                    likes: 0,
                    comments: 0,
                    impressions: 0,
                    reach: 0,
                    engagementRate: 0,
                    isDeleted: true
                };
            }

            throw new Error(`Failed to fetch post details: ${JSON.stringify(error)}`);
        }

        const postData = await postResponse.json();
        const likes = postData.likes?.summary?.total_count || 0;
        const comments = postData.comments?.summary?.total_count || 0;
        const shares = postData.shares?.count || 0;

        // 2. Get Insights (Reach, Impressions)
        // Note: Insights might not be available for all posts (e.g. personal profile posts vs page posts)
        // We try to fetch them, but handle failure gracefully
        let impressions = 0;
        let reach = 0;

        try {
            const metrics = 'post_impressions,post_impressions_unique,post_engaged_users';
            const insightsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${postId}/insights?metric=${metrics}&access_token=${accessToken}`
            );

            if (insightsResponse.ok) {
                const insightsData = await insightsResponse.json();
                const data = insightsData.data || [];

                const impressionsMetric = data.find((m: any) => m.name === 'post_impressions');
                const reachMetric = data.find((m: any) => m.name === 'post_impressions_unique');

                if (impressionsMetric) {
                    impressions = impressionsMetric.values[0]?.value || 0;
                }
                if (reachMetric) {
                    reach = reachMetric.values[0]?.value || 0;
                }
            }
        } catch (insightError) {
            console.warn(`[Facebook] Could not fetch (deep) insights for post ${postId}`, insightError);
        }

        // Calculate engagement rate
        // (Likes + Comments + Shares) / Reach * 100
        // If reach is 0, use impressions. If both 0, rate is 0.
        const totalEngagements = likes + comments + shares;
        const base = reach > 0 ? reach : impressions;
        const engagementRate = base > 0 ? (totalEngagements / base) * 100 : 0;

        return {
            likes,
            comments,
            impressions,
            reach,
            engagementRate,
            isDeleted: false
        };

    } catch (error) {
        console.error(`[Facebook] Error fetching insights for ${postId}:`, error);
        // Return zeros on error to prevent crashing the whole feed
        // Default to not deleted, just error
        return {
            likes: 0,
            comments: 0,
            impressions: 0,
            reach: 0,
            engagementRate: 0,
            isDeleted: false
        };
    }
}
