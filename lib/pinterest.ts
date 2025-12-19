interface PinterestCredentials {
    accessToken: string;
}

interface PinterestBoard {
    id: string;
    name: string;
    description: string;
    privacy: string;
}

export async function postToPinterest(
    credentials: PinterestCredentials,
    title: string,
    description: string,
    media: string | string[],
    metadata?: {
        boardId?: string;
    }
) {
    const { accessToken } = credentials;

    console.log(`[Pinterest] Creating pin: ${title}`);

    if (!media || (Array.isArray(media) && media.length === 0)) {
        throw new Error('Pinterest requires an image or video');
    }

    try {
        let body: any = {
            title,
            description,
            board_id: metadata?.boardId || undefined,
        };

        const mediaList = Array.isArray(media) ? media : [media];

        // Check if multiple images (Carousel)
        if (mediaList.length > 1) {
            // Validate all are images (Pinterest doesn't support mixed/video carousels easily via this endpoint)
            const hasVideo = mediaList.some(url => /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(url));
            if (hasVideo) {
                // Fallback: If video exists in list, just take the first item (or throw error, but let's prioritize main content)
                // For now, let's treat it as not supported to mix, so we just take the first one if it's a mix?
                // Or better, just filter? Let's assume user sends correct data. 
                // If carousel, we use multiple_image_urls
                console.warn('[Pinterest] Video detected in multiple items. Pinterest organic carousel mainly supports images. Proceeding with multiple_image_urls check.');
            }

            body.media_source = {
                source_type: 'multiple_image_urls',
                items: mediaList.map(url => ({
                    url: url,
                    title: title, // Optional: can be set per image
                    description: description // Optional
                })),
                index: 0
            };
            console.log(`[Pinterest] Creating Carousel Pin with ${mediaList.length} images.`);

        } else {
            // Single Item
            const mediaUrl = mediaList[0];
            const isVideo = /\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i.test(mediaUrl);
            const sourceType = isVideo ? 'video_url' : 'image_url';

            console.log(`[Pinterest] Creating pin: ${title}, Media Type: ${sourceType}`);

            body.media_source = {
                source_type: sourceType,
                url: mediaUrl,
                cover_image_url: isVideo ? undefined : mediaUrl, // Optional for video
            };
        }

        // Create a Pin - Production URL
        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Pinterest API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        console.log(`[Pinterest] Pin created successfully: ${data.id}`);

        return { id: data.id };

    } catch (error) {
        console.error('Pinterest posting error:', error);
        throw error;
    }
}

export async function getPinterestBoards(accessToken: string): Promise<PinterestBoard[]> {
    try {
        // Production URL
        const response = await fetch('https://api.pinterest.com/v5/boards', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Pinterest API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            privacy: item.privacy,
        }));
    } catch (error) {
        console.error('Error fetching Pinterest boards:', error);
        return [];
    }
}

export async function createPinterestBoard(accessToken: string, name: string, description?: string, privacy: 'PUBLIC' | 'SECRET' = 'PUBLIC'): Promise<PinterestBoard> {
    try {
        const response = await fetch('https://api.pinterest.com/v5/boards', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                description: description || undefined,
                privacy
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Pinterest API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return {
            id: data.id,
            name: data.name,
            description: data.description,
            privacy: data.privacy,
        };
    } catch (error) {
        console.error('Error creating Pinterest board:', error);
        throw error;
    }
}

export interface PinterestPostInsights {
    likes: number; // 'saves' in Pinterest
    comments: number; // Not always available in API v5 standard analytics
    impressions: number;
    reach: number; // Not directly 'reach', usually 'impression' or 'outbound_click'
    engagementRate: number;
    saves: number;
    pinClicks: number;
    outboundClicks: number;
    isDeleted?: boolean;
    title?: string;
    description?: string;
    media?: any;
}

export async function getPinterestPostInsights(
    pinId: string,
    accessToken: string
): Promise<PinterestPostInsights> {
    try {
        let comments = 0;
        let pinMetadata = null;

        // 1. Get Pin Details to get comment count and metadata
        try {
            const detailsResponse = await fetch(`https://api.pinterest.com/v5/pins/${pinId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (detailsResponse.ok) {
                pinMetadata = await detailsResponse.json();
                comments = pinMetadata.comment_count || 0;
            } else {
                console.warn(`[Pinterest] Failed to fetch pin details for ${pinId}: ${detailsResponse.status}`);
            }
        } catch (detailError) {
            console.warn(`[Pinterest] Error fetching pin details:`, detailError);
        }

        // 2. Get Analytics
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Last 30 days

        const metrics = 'IMPRESSION,With_Pin_Click,Save,OUTBOUND_CLICK';

        const analyticsUrl = `https://api.pinterest.com/v5/pins/${pinId}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=${metrics}`;

        const response = await fetch(analyticsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            console.warn(`[Pinterest] Failed to fetch analytics for pin ${pinId}: ${response.status}`);
            if (response.status === 404) {
                return {
                    likes: 0,
                    comments: 0,
                    impressions: 0,
                    reach: 0,
                    engagementRate: 0,
                    saves: 0,
                    pinClicks: 0,
                    outboundClicks: 0,
                    isDeleted: true
                };
            }
            return { likes: 0, comments: 0, impressions: 0, reach: 0, engagementRate: 0, saves: 0, pinClicks: 0, outboundClicks: 0, isDeleted: false };
        }

        const data = await response.json();

        const impressions = data.IMPRESSION || 0;
        const saves = data.SAVE || 0;
        const pinClicks = data.PIN_CLICK || 0;
        const outboundClicks = data.OUTBOUND_CLICK || 0;

        // Map to standard interface
        // Note: Pinterest 'Saves' are conceptually 'Likes' in other platforms (user validation)
        const likes = saves;
        const reach = impressions; // Proxy

        // Engagement Rate calculation
        // (Saves + Pin Clicks + Outbound Clicks + Comments) / Impressions
        const totalEngagements = saves + pinClicks + outboundClicks + comments;
        const engagementRate = impressions > 0 ? (totalEngagements / impressions) * 100 : 0;

        return {
            likes,
            comments,
            impressions,
            reach,
            engagementRate,
            saves,
            pinClicks,
            outboundClicks,
            isDeleted: false,
            title: pinMetadata?.title,
            description: pinMetadata?.description,
            media: pinMetadata?.media
        };

    } catch (error) {
        console.error(`[Pinterest] Error fetching insights for ${pinId}:`, error);
        return {
            likes: 0,
            comments: 0,
            impressions: 0,
            reach: 0,
            engagementRate: 0,
            saves: 0,
            pinClicks: 0,
            outboundClicks: 0,
            isDeleted: false
        };
    }
}

export interface PinterestPin {
    id: string;
    title: string;
    description: string;
    createdAt: string;
    media: any;
}

export async function getPinterestUserPins(
    accessToken: string,
    limit: number = 20
): Promise<PinterestPin[]> {
    try {
        const response = await fetch(
            `https://api.pinterest.com/v5/pins?limit=${limit}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Failed to fetch Pinterest pins: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.items?.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            createdAt: item.created_at,
            media: item.media
        })) || [];
    } catch (error) {
        console.error('Pinterest fetch pins error:', error);
        throw error;
    }
}
