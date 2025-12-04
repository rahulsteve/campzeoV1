interface PinterestCredentials {
    accessToken: string;
}

export async function postToPinterest(
    credentials: PinterestCredentials,
    title: string,
    description: string,
    mediaUrl: string,
    metadata?: {
        boardId?: string;
        link?: string;
    }
) {
    const { accessToken } = credentials;

    console.log(`[Pinterest] Creating pin: ${title}`);

    if (!mediaUrl) {
        throw new Error('Pinterest requires an image or video');
    }

    try {
        // Create a Pin
        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                link: metadata?.link || undefined,
                board_id: metadata?.boardId || undefined,
                media_source: {
                    source_type: 'image_url',
                    url: mediaUrl,
                },
            }),
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

// Get user's boards
export async function getPinterestBoards(accessToken: string) {
    try {
        const response = await fetch('https://api.pinterest.com/v5/boards', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Pinterest API error: ${JSON.stringify(error)}`);
        }

        const data = await response.json();
        return data.items || [];

    } catch (error) {
        console.error('Pinterest boards fetch error:', error);
        throw error;
    }
}
