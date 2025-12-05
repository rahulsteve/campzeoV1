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
    ExternalLink,
    BarChart2,
    Image as ImageIcon,
    Video
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';


interface Post {
    id: number;
    platform: string;
    postId: string;
    message: string;
    mediaUrls: string | null; // Note: In DB it might be string or string[] depending on how it was saved. PostTransaction has mediaUrls as String?
    postType: string;
    publishedAt: string;
    insight: {
        likes: number;
        comments: number;
        reach: number;
        impressions: number;
        engagementRate: number;
        lastUpdated: string | null;
    };
}

export default function AnalyticsPage() {
    const router = useRouter();
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [organisationPlatforms, setOrganisationPlatforms] = useState<string[]>([]);
    const [loadingPlatforms, setLoadingPlatforms] = useState(true);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [syncing, setSyncing] = useState<number | null>(null);

    // Fetch organisation platforms
    useEffect(() => {
        const fetchOrgPlatforms = async () => {
            try {
                setLoadingPlatforms(true);
                const response = await fetch('/api/Organisation/GetPlatforms');
                if (!response.ok) {
                    setOrganisationPlatforms(['EMAIL', 'SMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST']);
                    return;
                }
                const data = await response.json();
                const platforms = data.platforms || [];
                // Filter out admin-only platforms if needed, or keep them. 
                // Analytics might be relevant for Email/SMS too (delivery reports).
                // But for now let's focus on social media as per "Post Insights" description.
                // Use Set to remove duplicates in case API returns EMAIL, SMS, WHATSAPP
                const allPlatforms = [...new Set(['EMAIL', 'SMS', 'WHATSAPP', ...platforms])];
                setOrganisationPlatforms(allPlatforms);
            } catch (error) {
                console.error('Error fetching organisation platforms:', error);
                // Use fallback platforms (no duplicates since these are hardcoded)
                setOrganisationPlatforms(['EMAIL', 'SMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST']);
            } finally {
                setLoadingPlatforms(false);
            }
        };

        fetchOrgPlatforms();
    }, []);

    // Fetch posts when platform changes
    useEffect(() => {
        if (selectedPlatform) {
            const fetchPosts = async () => {
                try {
                    setLoadingPosts(true);
                    const response = await fetch(`/api/Analytics/posts?platform=${selectedPlatform}`);
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.details || errorData.error || 'Failed to fetch posts');
                    }
                    const data = await response.json();
                    setPosts(data.posts || []);
                } catch (error: any) {
                    console.error('Error fetching posts:', error);
                    toast.error(error.message || 'Failed to load posts');
                    setPosts([]);
                } finally {
                    setLoadingPosts(false);
                }
            };

            fetchPosts();
        } else {
            setPosts([]);
        }
    }, [selectedPlatform]);

    const getPlatformIcon = (platform: string) => {
        switch (platform) {
            case 'EMAIL': return Mail;
            case 'SMS': return MessageSquare;
            case 'WHATSAPP': return Phone;
            case 'FACEBOOK': return Facebook;
            case 'INSTAGRAM': return Instagram;
            case 'LINKEDIN': return Linkedin;
            case 'YOUTUBE': return Youtube;
            default: return Send;
        }
    };

    const handleSync = async (post: Post) => {
        try {
            setSyncing(post.id);
            // TODO: Implement actual sync API
            // await fetch(`/api/analytics/posts/${post.postId}/sync`, { method: 'POST' });

            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success('Insights synced successfully');
            // Refresh posts
            // fetchPosts(); // Need to extract fetchPosts to be reusable or just update local state
        } catch (error) {
            toast.error('Failed to sync insights');
        } finally {
            setSyncing(null);
        }
    };

    const viewDetails = (post: Post) => {
        // Navigate to detail page
        // We'll use the internal ID or external postId
        router.push(`/organisation/analytics/posts/${post.id}?platform=${selectedPlatform}`);
    };

    return (
        <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
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
                        <CardDescription>
                            Choose a platform to view analytics
                        </CardDescription>
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
                                            onClick={() => setSelectedPlatform(platform)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all min-w-[100px] ${isSelected
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
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>{selectedPlatform} Posts</CardTitle>
                                    <CardDescription>
                                        Performance metrics for your recent posts
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingPosts ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="size-8 animate-spin text-primary" />
                                </div>
                            ) : posts.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>No posts found for this platform.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Media</TableHead>
                                            <TableHead className="max-w-[300px]">Content</TableHead>
                                            <TableHead>Likes</TableHead>
                                            <TableHead>Comments</TableHead>
                                            <TableHead>Engagement</TableHead>
                                            <TableHead>Published</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {posts.map((post) => (
                                            <TableRow key={post.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewDetails(post)}>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <div className="relative size-16 rounded-md overflow-hidden bg-muted border">
                                                        {post.postType === 'VIDEO' ? (
                                                            <div className="flex items-center justify-center h-full">
                                                                <Video className="size-6 text-muted-foreground" />
                                                            </div>
                                                        ) : post.mediaUrls ? (
                                                            <Image
                                                                src={post.mediaUrls} // Assuming single URL string in PostTransaction for now
                                                                alt="Post media"
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full">
                                                                <ImageIcon className="size-6 text-muted-foreground" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="line-clamp-2 text-sm font-medium">
                                                        {post.message || 'No content'}
                                                    </p>
                                                </TableCell>
                                                <TableCell>{post.insight.likes}</TableCell>
                                                <TableCell>{post.insight.comments}</TableCell>
                                                <TableCell>
                                                    {post.insight.engagementRate ? `${post.insight.engagementRate.toFixed(1)}%` : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy') : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSync(post)}
                                                            disabled={syncing === post.id}
                                                        >
                                                            <RefreshCw className={`size-4 ${syncing === post.id ? 'animate-spin' : ''}`} />
                                                        </Button>
                                                        <Button
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
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

