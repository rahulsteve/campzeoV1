'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    Send,
    Facebook,
    Instagram,
    Linkedin,
    Youtube,
    RefreshCw,
    BarChart2,
    Image as ImageIcon,
    Video,
    Bot,
    X,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PostInsight {
    likes: number;
    comments: number;
    reach: number;
    impressions: number;
    engagementRate: number;
    isDeleted: boolean;
    lastUpdated: string | null;
}

interface Post {
    id: number;
    postId: string;
    platform: string;
    postType: string; // 'VIDEO', 'IMAGE', etc.
    mediaUrls: string | null; // It seems it might be a JSON string or URL
    message: string | null;
    publishedAt: string | Date | null;
    insight: PostInsight;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AnalyticsPage() {
    const router = useRouter();

    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [organisationPlatforms, setOrganisationPlatforms] = useState<string[]>([]);
    const [loadingPlatforms, setLoadingPlatforms] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [syncing, setSyncing] = useState<number | null>(null);

    // Pagination/Filter State
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // AI Chat State
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
        { role: 'assistant', content: 'Hi! I can analyze your campaign performance. Ask me anything like "Which platform is doing best this month?"', timestamp: new Date() }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);

    // Fetch platforms
    useEffect(() => {
        const fetchPlatforms = async () => {
            try {
                const response = await fetch('/api/Organisation/GetPlatforms');
                if (!response.ok) throw new Error('Failed to fetch platforms');
                const data = await response.json();
                const platforms = data.platforms || [];
                setOrganisationPlatforms(platforms);

                if (platforms.length > 0) {
                    setSelectedPlatform(platforms[0]);
                }
            } catch (error) {
                console.error('Error fetching platforms:', error);
                toast.error('Failed to load platforms');
            } finally {
                setLoadingPlatforms(false);
            }
        };

        fetchPlatforms();
    }, []);

    // Fetch posts
    const fetchPosts = async (forceRefresh = false) => {
        if (!selectedPlatform) return;

        setLoadingPosts(true);
        try {
            let url = `/api/Analytics/posts?platform=${selectedPlatform}&page=${page}&limit=${limit}`;
            if (forceRefresh) url += '&fresh=true';
            if (startDate) url += `&startDate=${startDate}`;
            if (endDate) url += `&endDate=${endDate}`;

            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Fetch posts error:', errorData);
                throw new Error('Failed to fetch posts');
            }
            const data = await response.json();
            setPosts(data.posts || []);
            setTotalCount(data.totalCount || 0);
            setTotalPages(data.totalPages || 0);

            if (forceRefresh) {
                toast.success('Data refreshed');
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
            if (forceRefresh) toast.error('Failed to load analytics data');
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        if (selectedPlatform) {
            fetchPosts(false);
        } else {
            setPosts([]);
        }
    }, [selectedPlatform, page, startDate, endDate]);

    const handleSync = async (post: Post) => {
        setSyncing(post.id);
        try {
            const response = await fetch(`/api/Analytics/post-details/${post.id}?fresh=true&platform=${post.platform}&postId=${post.postId}`);
            if (!response.ok) throw new Error('Failed to sync post');

            const data = await response.json();
            if (data.post) {
                setPosts(prev => prev.map(p => p.id === post.id ? data.post : p));
                toast.success('Post metrics updated');
            }
        } catch (error) {
            console.error('Error syncing post:', error);
            toast.error('Failed to sync post metrics');
        } finally {
            setSyncing(null);
        }
    };

    const viewDetails = (post: Post) => {
        router.push(`/organisation/analytics/posts/${post.id}?platform=${post.platform}&postId=${post.postId}`);
    };

    const getPlatformIcon = (type: string) => {
        switch (type.toUpperCase()) {
            case 'EMAIL':
                return Mail;
            case 'SMS':
                return MessageSquare;
            case 'WHATSAPP':
                return Phone;
            case 'FACEBOOK':
                return Facebook;
            case 'INSTAGRAM':
                return Instagram;
            case 'LINKEDIN':
                return Linkedin;
            case 'YOUTUBE':
                return Youtube;
            case 'PINTEREST':
                return () => (
                    <div className="p-0.5 bg-red-600 rounded-full size-6 flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">P</span>
                    </div>
                );
            default:
                return Send;
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!chatInput.trim() || isChatLoading) return;

        const userMessage = chatInput;
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
        setIsChatLoading(true);

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage })
            });

            if (!response.ok) throw new Error('Failed to get answer');

            const data = await response.json();
            setChatMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: new Date() }]);
        } catch (error) {
            console.error('Chat error:', error);
            toast.error('Failed to connect to AI Assistant');
            setChatMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting to the analytics engine right now. Please try again later.", timestamp: new Date() }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="p-6 relative min-h-screen">
            <div className="mx-auto space-y-6 pb-24">
                {/* Header & Platform Cards */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground mt-1">
                        View insights and performance metrics for your posts
                    </p>
                </div>

                {/* Platform Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Platform</CardTitle>
                        <CardDescription>Choose a platform to view analytics</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingPlatforms ? (
                            <div className="flex items-center gap-2 p-4">
                                <Loader2 className="size-4 animate-spin" />
                                <span className="text-sm text-muted-foreground">Loading platforms...</span>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {organisationPlatforms.map((platform) => {
                                    const isSelected = selectedPlatform === platform;
                                    const Icon = getPlatformIcon(platform);
                                    return (
                                        <button
                                            key={platform}
                                            onClick={() => {
                                                setSelectedPlatform(platform);
                                                setPage(1); // Reset page on platform change
                                            }}
                                            className={`flex cursor-pointer flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all min-w-[100px] ${isSelected
                                                ? 'border-primary bg-primary/10 shadow-sm'
                                                : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                        >
                                            <Icon className={`size-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                            <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {platform}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Posts Table */}
                {selectedPlatform && (
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>{selectedPlatform} Posts</CardTitle>
                                    <CardDescription>Performance metrics for your recent posts</CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">From:</span>
                                        <input
                                            type="date"
                                            className="bg-background border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                                            value={startDate}
                                            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">To:</span>
                                        <input
                                            type="date"
                                            className="bg-background border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary"
                                            value={endDate}
                                            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                                        />
                                    </div>
                                    <Button
                                        className='cursor-pointer'
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchPosts(true)}
                                        disabled={loadingPosts}
                                    >
                                        <RefreshCw className={`mr-2 size-3 ${loadingPosts ? 'animate-spin' : ''}`} />
                                        Refresh Data
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {loadingPosts ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="size-8 animate-spin text-primary" />
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No posts found for this platform.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Media</TableHead>
                                                    <TableHead className="min-w-[200px] max-w-[300px]">Content</TableHead>
                                                    <TableHead>Likes</TableHead>
                                                    <TableHead>Comments</TableHead>
                                                    <TableHead>Reach/Views</TableHead>
                                                    <TableHead>Engagement</TableHead>
                                                    <TableHead>Published</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {posts.map((post) => (
                                                    <TableRow
                                                        key={post.id}
                                                        className={`cursor-pointer hover:bg-muted/50 ${post.insight?.isDeleted ? 'opacity-60 bg-red-50 hover:bg-red-50' : ''}`}
                                                        onClick={() => viewDetails(post)}
                                                    >
                                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                                            <div className="relative size-16 rounded-md overflow-hidden bg-muted border">
                                                                {post.postType === 'VIDEO' || post.mediaUrls?.toLowerCase().endsWith('.mp4') ? (
                                                                    <div className="flex items-center justify-center h-full bg-slate-900">
                                                                        <Video className="size-6 text-white" />
                                                                    </div>
                                                                ) : (post.mediaUrls && post.mediaUrls !== '[]' && (post.mediaUrls.startsWith('http') || post.mediaUrls.startsWith('/'))) ? (
                                                                    <Image
                                                                        src={post.mediaUrls}
                                                                        alt="Post media"
                                                                        fill
                                                                        className="object-cover"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center justify-center h-full">
                                                                        <ImageIcon className="size-6 text-muted-foreground" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <p className={`line-clamp-2 text-sm font-medium ${post.insight?.isDeleted ? 'line-through text-red-500' : ''}`}>
                                                                    {post.message || 'No content'}
                                                                </p>
                                                                {post.insight?.isDeleted && (
                                                                    <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                        Deleted on Platform
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{post.insight?.isDeleted ? '-' : post.insight?.likes ?? 0}</TableCell>
                                                        <TableCell>{post.insight?.isDeleted ? '-' : post.insight?.comments ?? 0}</TableCell>
                                                        <TableCell>{post.insight?.isDeleted ? '-' : post.insight?.reach ?? 0}</TableCell>
                                                        <TableCell>
                                                            {post.insight?.isDeleted ? '-' : (post.insight?.engagementRate ? `${post.insight.engagementRate.toFixed(1)}%` : '0.0%')}
                                                        </TableCell>
                                                        <TableCell>
                                                            {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                <Button
                                                                    className="cursor-pointer"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleSync(post)}
                                                                    disabled={syncing === post.id}
                                                                >
                                                                    <RefreshCw className={`size-4 ${syncing === post.id ? 'animate-spin' : ''}`} />
                                                                </Button>
                                                                <Button
                                                                    className="cursor-pointer"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => viewDetails(post)}
                                                                >
                                                                    <BarChart2 className="size-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between pt-4">
                                            <p className="text-sm text-muted-foreground">
                                                Showing <span className="font-medium">{posts.length}</span> of <span className="font-medium">{totalCount}</span> posts
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page === 1}
                                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                                >
                                                    Previous
                                                </Button>
                                                <div className="flex items-center gap-1">
                                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                                        .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                                                        .map((pageNum) => (
                                                            <Button
                                                                key={pageNum}
                                                                variant={page === pageNum ? 'default' : 'ghost'}
                                                                size="icon"
                                                                className="h-8 w-8 text-xs"
                                                                onClick={() => setPage(pageNum)}
                                                            >
                                                                {pageNum}
                                                            </Button>
                                                        ))}
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={page === totalPages}
                                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                >
                                                    Next
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* AI Assistant Floating Chat */}
            <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out ${isChatOpen ? 'w-[380px]' : 'w-auto'}`}>
                {isChatOpen ? (
                    <Card className="border shadow-2xl overflow-hidden glass-panel">
                        <div className="bg-primary p-4 flex items-center justify-between text-primary-foreground">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-white/20 rounded-full">
                                    <Sparkles className="size-4 text-yellow-300 fill-yellow-300" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">AI Analytics Assistant</h3>
                                    <span className="text-[10px] text-primary-foreground/80 block">Everything about your data</span>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary-foreground hover:bg-white/20" onClick={() => setIsChatOpen(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="h-[400px] flex flex-col bg-background/95 backdrop-blur-sm">
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {chatMessages.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground rounded-br-none'
                                                : 'bg-muted text-foreground rounded-bl-none border'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    ))}
                                    {isChatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-2 border flex items-center gap-2">
                                                <Loader2 className="size-3 animate-spin text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">Analyzing data...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t bg-background">
                                <form onSubmit={handleSendMessage} className="flex gap-2">
                                    <input
                                        className="flex-1 bg-muted/50 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/70"
                                        placeholder="Ask about your engagement..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={isChatLoading}
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        className="rounded-full shrink-0"
                                        disabled={!chatInput.trim() || isChatLoading}
                                    >
                                        <Send className="size-4" />
                                    </Button>
                                </form>
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Button
                        onClick={() => setIsChatOpen(true)}
                        size="lg"
                        className="rounded-full shadow-lg h-14 w-14 p-0 bg-primary hover:bg-primary/90 transition-transform hover:scale-110 active:scale-95 group relative"
                    >
                        <Bot className="size-8" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    </Button>
                )}
            </div>
        </div>
    );
}
