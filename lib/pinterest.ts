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
    isDeleted: boolean;
    title?: string;
    description?: string;
    message?: string;
    caption?: string;
    media?: any;
    paidStats?: {
        saves: number;
        impressions: number;
        clicks: number;
    } | null;
}

export async function getPinterestPostInsights(
    pinId: string,
    accessToken: string
): Promise<PinterestPostInsights> {
    try {
        let comments = 0;
        let pinMetadata = null;

        // 1. Get Pin Details to get metrics and metadata
        const detailsResponse = await fetch(`https://api.pinterest.com/v5/pins/${pinId}?pin_metrics=true`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (detailsResponse.status === 401) {
            throw new Error('401 Unauthorized');
        }

        if (detailsResponse.ok) {
            pinMetadata = await detailsResponse.json();

            // Extract comments and saves from lifetime metrics if available
            // Pinterest v5 pin_metrics=true returns all_pin_metrics: { lifetime: { ... }, 90_day: { ... } }
            const lifetime = pinMetadata.all_pin_metrics?.lifetime;
            if (lifetime) {
                comments = lifetime.comment || 0;
                // If we have lifetime metrics, we can use them as a baseline or fallback
            } else {
                // Fallback for some accounts/pins
                comments = pinMetadata.comment_count || 0;
            }
        } else {
            console.warn(`[Pinterest] Failed to fetch pin details for ${pinId}: ${detailsResponse.status}`);
            if (detailsResponse.status === 404) {
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
        }

        // 2. Get Analytics
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Max 90 days

        const metrics = 'IMPRESSION,PIN_CLICK,SAVE,OUTBOUND_CLICK';

        const analyticsUrl = `https://api.pinterest.com/v5/pins/${pinId}/analytics?start_date=${startDate}&end_date=${endDate}&metric_types=${metrics}`;

        const response = await fetch(analyticsUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (response.status === 401) {
            throw new Error('401 Unauthorized');
        }

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
        const summary = data.all?.summary_metrics || {};
        const lifetime = pinMetadata?.all_pin_metrics?.lifetime || {};

        // Fetch Paid Analytics if possible (using the new ads:read scope)
        const paidStats = await getPinterestPinAdAnalytics(pinId, accessToken);

        // Combine Organic (Analytics + PIN_METRICS) with Paid
        const organicImpressions = Math.max(summary.IMPRESSION || 0, lifetime.impression || 0);
        const organicSaves = Math.max(summary.SAVE || 0, lifetime.save || 0);
        const organicPinClicks = Math.max(summary.PIN_CLICK || 0, lifetime.pin_click || 0);
        const organicOutboundClicks = Math.max(summary.OUTBOUND_CLICK || 0, lifetime.outbound_click || 0);

        const impressions = organicImpressions + (paidStats?.impressions || 0);
        const saves = organicSaves + (paidStats?.saves || 0);
        const pinClicks = organicPinClicks + (paidStats?.clicks || 0);
        const outboundClicks = organicOutboundClicks; // Paid outbound clicks usually separate, but let's stick to these for now

        // Map to standard interface
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
            message: pinMetadata?.title || pinMetadata?.description || "",
            caption: pinMetadata?.description || "",
            media: pinMetadata?.media,
            paidStats: paidStats // Include for debugging or future breakdown
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

/**
 * Fetch Ad Accounts associated with the user (v5 API)
 */
export async function getPinterestAdAccounts(accessToken: string) {
    try {
        const response = await fetch('https://api.pinterest.com/v5/ad_accounts', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            console.warn(`[Pinterest] Failed to fetch ad accounts: ${JSON.stringify(error)}`);
            return [];
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('[Pinterest] Error fetching ad accounts:', error);
        return [];
    }
}

/**
 * Fetch Ad Analytics for a specific Pin across all ad accounts
 */
export async function getPinterestPinAdAnalytics(pinId: string, accessToken: string) {
    try {
        const adAccounts = await getPinterestAdAccounts(accessToken);
        if (adAccounts.length === 0) return null;

        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let totalPaidSaves = 0;
        let totalPaidImpressions = 0;
        let totalPaidClicks = 0;

        for (const account of adAccounts) {
            // Fetch analytics for this pin in this ad account
            // Note: This requires filtering by pin_ids in the ad analytics endpoint
            const url = `https://api.pinterest.com/v5/ad_accounts/${account.id}/ads/analytics?start_date=${startDate}&end_date=${endDate}&pin_ids=${pinId}&columns=SPEND_IN_MICRO_DOLLAR,PAID_IMPRESSION,PAID_CLICK,SAVE&granularity=TOTAL`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const stats = data[0];
                    totalPaidSaves += stats.SAVE || 0;
                    totalPaidImpressions += stats.PAID_IMPRESSION || 0;
                    totalPaidClicks += stats.PAID_CLICK || 0;
                }
            }
        }

        return {
            saves: totalPaidSaves,
            impressions: totalPaidImpressions,
            clicks: totalPaidClicks
        };
    } catch (error) {
        console.error('[Pinterest] Error fetching pin ad analytics:', error);
        return null;
    }
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

/**
 * Refresh Pinterest access token using refresh token (v5 API)
 */
export async function refreshPinterestToken(refreshToken: string, clientId: string, clientSecret: string) {
    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const params = new URLSearchParams();
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    const response = await fetch("https://api.pinterest.com/v5/oauth/token", {
        method: "POST",
        headers: {
            "Authorization": `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to refresh Pinterest token: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data; // Returns { access_token, refresh_token, expires_in, refresh_token_expires_in, scope, token_type }
}
