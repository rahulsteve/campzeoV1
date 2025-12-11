'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, ArrowRight, Image as ImageIcon, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface AIContentAssistantProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInsertContent: (content: string) => void;
    onInsertImage?: (imageUrl: string) => void;
    context?: {
        platform?: string;
        existingContent?: string;
    };
}

export function AIContentAssistant({
    open,
    onOpenChange,
    onInsertContent,
    onInsertImage,
    context,
}: AIContentAssistantProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [prompt, setPrompt] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(false);
    const [generatedImagePrompt, setGeneratedImagePrompt] = useState('');

    // Quick suggestion prompts
    const suggestions = [
        'Create an engaging post',
        'Make it more professional',
        'Add emojis and make it fun',
        'Shorten this message',
        'Make it more persuasive',
        'Add a call-to-action',
    ];

    const platformSuggestions: Record<string, string[]> = {
        INSTAGRAM: ['Create a catchy caption', 'Add trending hashtags', 'Make it story-worthy'],
        LINKEDIN: ['Write a professional update', 'Share industry insights', 'Announce achievement'],
        FACEBOOK: ['Create an engaging post', 'Ask a question', 'Share a story'],
        TWITTER: ['Write a tweet thread', 'Create a viral tweet', 'Add trending topics'],
        EMAIL: ['Write a compelling subject line', 'Create email body', 'Add professional signature'],
        SMS: ['Keep it under 160 characters', 'Make it urgent', 'Add clear CTA'],
        WHATSAPP: ['Make it friendly and casual', 'Add emojis', 'Keep it conversational'],
    };

    const currentSuggestions = context?.platform
        ? platformSuggestions[context.platform] || suggestions
        : suggestions;

    const handleGenerateContent = async (customPrompt?: string) => {
        const userPrompt = customPrompt || prompt;
        if (!userPrompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        try {
            setLoading(true);

            // Add user message to chat
            const userMessage: Message = {
                role: 'user',
                content: userPrompt,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, userMessage]);
            setPrompt('');

            // Call API
            const response = await fetch('/api/ai/generate-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userPrompt,
                    context: {
                        platform: context?.platform,
                        existingContent: context?.existingContent,
                    },
                    mode: context?.existingContent ? 'refine' : 'generate',
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to generate content');
            }

            // Add assistant message to chat
            const assistantMessage: Message = {
                role: 'assistant',
                content: data.content,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('Error generating content:', error);
            toast.error(error.message || 'Failed to generate content');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) {
            toast.error('Please enter an image description');
            return;
        }

        try {
            setImageLoading(true);
            setGeneratedImagePrompt('');

            const response = await fetch('/api/ai/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: imagePrompt,
                }),
            });

            const data = await response.json();

            if (data.imagePrompt) {
                setGeneratedImagePrompt(data.imagePrompt);
                toast.success('Image prompt generated! You can use this with DALL-E or Midjourney.');
            } else {
                throw new Error(data.error || 'Failed to generate image prompt');
            }
        } catch (error: any) {
            console.error('Error generating image:', error);
            toast.error(error.message || 'Failed to generate image prompt');
        } finally {
            setImageLoading(false);
        }
    };

    const handleInsert = (content: string) => {
        onInsertContent(content);
        toast.success('Content inserted!');
        onOpenChange(false);
    };

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-primary" />
                        AI Content Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Generate engaging content for your {context?.platform || 'campaign'} post
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="text" className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text">
                            <Wand2 className="size-4 mr-2" />
                            Generate Text
                        </TabsTrigger>
                        <TabsTrigger value="image">
                            <ImageIcon className="size-4 mr-2" />
                            Image Prompt
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="text" className="flex-1 flex flex-col min-h-0 space-y-4">
                        {/* Chat History */}
                        <ScrollArea className="flex-1 border rounded-lg p-4 min-h-[300px]">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <Sparkles className="size-12 mb-4 opacity-50" />
                                    <p className="text-sm">Start a conversation with AI</p>
                                    <p className="text-xs mt-1">Try the suggestions below or write your own prompt</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted'
                                                    }`}
                                            >
                                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                {message.role === 'assistant' && (
                                                    <div className="flex gap-2 mt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleInsert(message.content)}
                                                        >
                                                            <ArrowRight className="size-3 mr-1" />
                                                            Insert
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleCopy(message.content)}
                                                        >
                                                            <Copy className="size-3 mr-1" />
                                                            Copy
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {loading && (
                                        <div className="flex justify-start">
                                            <div className="bg-muted rounded-lg p-3">
                                                <Loader2 className="size-4 animate-spin" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>

                        {/* Quick Suggestions */}
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Quick suggestions:</p>
                            <div className="flex flex-wrap gap-2">
                                {currentSuggestions.map((suggestion, index) => (
                                    <Badge
                                        key={index}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                        onClick={() => handleGenerateContent(suggestion)}
                                    >
                                        {suggestion}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <div className="flex gap-2">
                            <Textarea
                                placeholder="Describe what you want to create..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerateContent();
                                    }
                                }}
                                rows={2}
                                className="flex-1"
                            />
                            <Button
                                onClick={() => handleGenerateContent()}
                                disabled={loading || !prompt.trim()}
                                className="self-end"
                            >
                                {loading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <>
                                        <Sparkles className="size-4 mr-2" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="image" className="flex-1 flex flex-col space-y-4">
                        <div className="flex-1 border rounded-lg p-4 flex flex-col items-center justify-center min-h-[300px]">
                            {generatedImagePrompt ? (
                                <div className="space-y-4 w-full">
                                    {generatedImagePrompt.startsWith('http') || generatedImagePrompt.startsWith('data:image') ? (
                                        // It's an actual image
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border bg-muted">
                                                <img
                                                    src={generatedImagePrompt}
                                                    alt="Generated content"
                                                    className="object-cover w-full h-full"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        if (onInsertImage) {
                                                            onInsertImage(generatedImagePrompt);
                                                            toast.success('Image inserted!');
                                                            onOpenChange(false);
                                                        }
                                                    }}
                                                >
                                                    <ArrowRight className="size-4 mr-2" />
                                                    Insert Image
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setGeneratedImagePrompt('')}
                                                >
                                                    Generate Another
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        // It's a text prompt (fallback)
                                        <div className="space-y-4 w-full">
                                            <div>
                                                <p className="text-sm font-medium mb-2">Generated Image Prompt:</p>
                                                <div className="p-4 bg-muted rounded-lg">
                                                    <p className="text-sm whitespace-pre-wrap">{generatedImagePrompt}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleCopy(generatedImagePrompt)}
                                                >
                                                    <Copy className="size-4 mr-2" />
                                                    Copy Prompt
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setGeneratedImagePrompt('')}
                                                >
                                                    Generate Another
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Use this prompt with image generation services like DALL-E, Midjourney, or Stable Diffusion
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                    <ImageIcon className="size-12 mb-4 opacity-50" />
                                    <p className="text-sm">Generate an image with AI</p>
                                    <p className="text-xs mt-1">Describe the image you want to create</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Textarea
                                placeholder="Describe the image you want to create..."
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                rows={3}
                            />
                            <Button
                                onClick={handleGenerateImage}
                                disabled={imageLoading || !imagePrompt.trim()}
                                className="w-full"
                            >
                                {imageLoading ? (
                                    <>
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <ImageIcon className="size-4 mr-2" />
                                        Generate Image Prompt
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
