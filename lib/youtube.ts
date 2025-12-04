interface YouTubeCredentials {
    accessToken: string;
    refreshToken?: string;
}

interface YouTubeMetadata {
    tags?: string[];
    privacy?: 'public' | 'private' | 'unlisted';
}

// Refresh YouTube access token using refresh token
async function refreshYouTubeToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to refresh YouTube token: ${error}`);
    }

    const data: any = await response.json();
    return data.access_token;
}

// Upload video to YouTube using resumable upload
export async function postToYouTube(
    credentials: YouTubeCredentials,
    title: string,
    description: string,
    videoUrl: string,
    metadata?: YouTubeMetadata
) {
    const { accessToken } = credentials;

    console.log(`[YouTube] Starting video upload: ${title}`);

    try {
        // Step 1: Fetch the video file from URL (works with Vercel Blob)
        console.log(`[YouTube] Fetching video from: ${videoUrl}`);

        // Determine the full URL
        let fetchUrl = videoUrl;
        if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://')) {
            // Relative URL - convert to absolute
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
            fetchUrl = `${baseUrl}${videoUrl.startsWith('/') ? videoUrl : `/${videoUrl}`}`;
        }

        console.log(`[YouTube] Fetching from URL: ${fetchUrl}`);
        const videoResponse = await fetch(fetchUrl);

        if (!videoResponse.ok) {
            throw new Error(`Failed to fetch video file: ${videoResponse.status} ${videoResponse.statusText}`);
        }

        const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
        const videoSize = videoBuffer.length;

        console.log(`[YouTube] Video size: ${videoSize} bytes`);

        // Step 2: Initialize resumable upload session
        const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Upload-Content-Length': videoSize.toString(),
                'X-Upload-Content-Type': 'video/*',
            },
            body: JSON.stringify({
                snippet: {
                    title,
                    description,
                    tags: metadata?.tags || [],
                    categoryId: '22', // People & Blogs
                },
                status: {
                    privacyStatus: metadata?.privacy || 'public',
                    selfDeclaredMadeForKids: false,
                },
            }),
        });

        if (!initResponse.ok) {
            const error = await initResponse.text();
            console.error('[YouTube] Init upload error:', error);

            // Check if it's an authentication error
            if (initResponse.status === 401) {
                throw new Error('YouTube access token expired. Please reconnect your YouTube account in Settings.');
            }

            throw new Error(`YouTube init upload failed: ${error}`);
        }

        // Get the upload URL from Location header
        const uploadUrl = initResponse.headers.get('location');
        if (!uploadUrl) {
            throw new Error('No upload URL received from YouTube');
        }

        console.log(`[YouTube] Upload session created, uploading video...`);

        // Step 3: Upload the video file
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Length': videoSize.toString(),
                'Content-Type': 'video/*',
            },
            body: videoBuffer,
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            console.error('[YouTube] Video upload error:', error);
            throw new Error(`YouTube video upload failed: ${error}`);
        }

        const videoData: any = await uploadResponse.json();
        console.log(`[YouTube] Video uploaded successfully: ${videoData.id}`);

        return { id: videoData.id };

    } catch (error) {
        console.error('YouTube video upload error:', error);
        throw error;
    }
}

// Create a YouTube Community Post (text + optional image)
export async function postYouTubeCommunity(
    credentials: YouTubeCredentials,
    text: string,
    imageUrl?: string
) {
    const { accessToken } = credentials;

    console.log(`[YouTube] Creating community post`);

    try {
        const postData: any = {
            snippet: {
                textMessageDetails: {
                    messageText: text,
                },
            },
        };

        // Add image if provided
        if (imageUrl) {
            postData.snippet.imageDetails = {
                url: imageUrl,
            };
        }

        const response = await fetch('https://www.googleapis.com/youtube/v3/communityPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(postData),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[YouTube] Community post error:', error);

            // Check if it's an authentication error
            if (response.status === 401) {
                throw new Error('YouTube access token expired. Please reconnect your YouTube account in Settings.');
            }

            throw new Error(`YouTube Community Post error: ${JSON.stringify(error)}`);
        }

        const data: any = await response.json();
        console.log(`[YouTube] Community post created: ${data.id}`);

        return { id: data.id };

    } catch (error) {
        console.error('YouTube community post error:', error);
        throw error;
    }
}

// Get YouTube channel info
export async function getYouTubeChannelInfo(accessToken: string) {
    try {
        const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();

            if (response.status === 401) {
                throw new Error('YouTube access token expired. Please reconnect your YouTube account.');
            }

            throw new Error(`YouTube API error: ${JSON.stringify(error)}`);
        }

        const data: any = await response.json();
        return data.items?.[0] || null;

    } catch (error) {
        console.error('YouTube channel info error:', error);
        throw error;
    }
}
