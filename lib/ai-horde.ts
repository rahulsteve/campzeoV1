
const AI_HORDE_API_URL = 'https://stablehorde.net/api/v2';
const CLIENT_AGENT = 'Campzeo:v1.0.0:Anonymous'; // Required by AI Horde

interface HordeResponse {
    id: string;
    message?: string;
}

interface HordeStatusResponse {
    finished: number;
    processing: number;
    restart: number;
    waiting: number;
    done: boolean;
    faulted: boolean;
    wait_time: number;
    queue_position: number;
    kudos: number;
    is_possible: boolean;
    generations?: { text: string; model: string }[];
}

interface HordeImageStatusResponse {
    finished: number;
    processing: number;
    waiting: number;
    done: boolean;
    faulted: boolean;
    generations?: { img: string; model: string }[];
    queue_position: number;
    wait_time: number;
}

/**
 * Submit a text generation job to AI Horde
 */
export async function submitTextJob(
    prompt: string,
    models: string[] = [
        'Llama-3-8B-Instruct',
        'Llama-3-70B-Instruct',
        'Mistral-7B-Instruct-v0.3',
        'Mixtral-8x7B-Instruct-v0.1'
    ]
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        const response = await fetch(`${AI_HORDE_API_URL}/generate/text/async`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': '0000000000',
                'Client-Agent': CLIENT_AGENT,
            },
            body: JSON.stringify({
                prompt: prompt,
                models: models,
                params: {
                    n: 1,
                    max_context_length: 2048,
                    max_length: 500,
                    temperature: 0.7,
                }
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit job');
        }

        const data = await response.json() as HordeResponse;
        return { success: true, jobId: data.id };
    } catch (error: any) {
        console.error('AI Horde submit error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Submit an image generation job to AI Horde
 */
export async function submitImageJob(
    prompt: string,
    style?: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
        const enhancedPrompt = style ? `${prompt}, ${style} style` : prompt;

        const response = await fetch(`${AI_HORDE_API_URL}/generate/async`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': '0000000000',
                'Client-Agent': CLIENT_AGENT,
            },
            body: JSON.stringify({
                prompt: enhancedPrompt,
                params: {
                    steps: 30,
                    n: 1,
                    sampler_name: 'k_euler',
                    width: 512,
                    height: 512,
                    cfg_scale: 7,
                },
                nsfw: false,
                censor_nsfw: true,
                models: [
                    'stable_diffusion_xl',
                    'stable_diffusion_2.1',
                    'stable_diffusion'
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit image job');
        }

        const data = await response.json() as HordeResponse;
        return { success: true, jobId: data.id };
    } catch (error: any) {
        console.error('AI Horde image submit error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check the status of a text generation job
 */
export async function checkTextStatus(jobId: string): Promise<{
    done: boolean;
    content?: string;
    faulted?: boolean;
    wait_time?: number;
    queue_position?: number;
    error?: string;
}> {
    try {
        const response = await fetch(`${AI_HORDE_API_URL}/generate/text/status/${jobId}`, {
            headers: { 'Client-Agent': CLIENT_AGENT },
        });

        if (!response.ok) throw new Error('Failed to check status');

        const data = await response.json() as HordeStatusResponse;

        if (data.faulted) {
            return { done: true, faulted: true, error: 'Generation failed on worker' };
        }

        if (data.done && data.generations && data.generations.length > 0) {
            return { done: true, content: data.generations[0].text.trim() };
        }

        return {
            done: false,
            wait_time: data.wait_time,
            queue_position: data.queue_position
        };
    } catch (error: any) {
        return { done: true, faulted: true, error: error.message };
    }
}

/**
 * Check the status of an image generation job
 */
export async function checkImageStatus(jobId: string): Promise<{
    done: boolean;
    imageUrl?: string;
    faulted?: boolean;
    wait_time?: number;
    queue_position?: number;
    error?: string;
}> {
    try {
        const response = await fetch(`${AI_HORDE_API_URL}/generate/check/${jobId}`, {
            headers: { 'Client-Agent': CLIENT_AGENT },
        });

        if (!response.ok) throw new Error('Failed to check status');

        const data = await response.json() as HordeImageStatusResponse;

        if (data.faulted) {
            return { done: true, faulted: true, error: 'Generation failed on worker' };
        }

        if (data.done) {
            // Get final image
            const statusResult = await fetch(`${AI_HORDE_API_URL}/generate/status/${jobId}`, {
                headers: { 'Client-Agent': CLIENT_AGENT },
            });
            const resultData = await statusResult.json();

            if (resultData.generations && resultData.generations.length > 0) {
                return { done: true, imageUrl: resultData.generations[0].img };
            }
        }

        return {
            done: false,
            wait_time: data.wait_time,
            queue_position: data.queue_position
        };
    } catch (error: any) {
        return { done: true, faulted: true, error: error.message };
    }
}

// Keep legacy functions for backward compatibility if needed, but they will use the new flow internally
export async function generateContent(
    prompt: string,
    context?: { platform?: string; existingContent?: string; tone?: string; }
): Promise<{ success: boolean; content?: string; error?: string }> {
    // For now, we'll just return error as we want to force using the async flow
    return { success: false, error: 'Please use async submission' };
}

export async function generateImage(prompt: string, style?: string): Promise<any> {
    return { success: false, error: 'Please use async submission' };
}

export async function refineContent(content: string, instruction: string, platform?: string): Promise<any> {
    const prompt = `Original content: "${content}"\n\nInstruction: ${instruction}\n\nPlease rewrite the content following the instruction.`;
    return submitTextJob(prompt); // This now returns jobId
}
