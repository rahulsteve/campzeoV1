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
    mediaUrl: string,
    metadata?: {
        boardId?: string;
    }
) {
    const { accessToken } = credentials;

    console.log(`[Pinterest] Creating pin: ${title}`);

    if (!mediaUrl) {
        throw new Error('Pinterest requires an image or video');
    }

    try {
        // Create a Pin - Production URL
        const response = await fetch('https://api.pinterest.com/v5/pins', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
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
