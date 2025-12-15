'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ArrowLeft,
    Loader2,
    RefreshCw,
    ThumbsUp,
    MessageSquare,
    Share2,
    Eye,
    BarChart2,
    Calendar,
    MapPin,
    Users,
    Video,
    Image as ImageIcon,
    Send,
    CheckCircle,
    MousePointerClick
} from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import React from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function PostDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = React.use(params);
    const postId = resolvedParams.id;

    const [post, setPost] = useState<any>(null);
    const [historicalData, setHistoricalData] = useState<any[]>([]);
    const [demographics, setDemographics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const fetchPostDetails = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/Analytics/post-details/${postId}?fresh=true`);
                if (!response.ok) {
                    throw new Error('Failed to fetch post details');
                }
                const data = await response.json();
                setPost(data.post);
                setHistoricalData(data.historicalData);
                setDemographics(data.demographics);
            } catch (error) {
                console.error('Error fetching post details:', error);
                toast.error('Failed to load post details');
            } finally {
                setLoading(false);
            }
        };

        fetchPostDetails();
    }, [postId]);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const response = await fetch(`/api/Analytics/post-details/${postId}?fresh=true`);
            if (!response.ok) {
                throw new Error('Failed to sync insights');
            }
            const data = await response.json();
            setPost(data.post);
            setHistoricalData(data.historicalData);
            setDemographics(data.demographics);

            toast.success('Insights synced successfully');
        } catch (error) {
            console.error('Sync error:', error);
            toast.error('Failed to sync insights');
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background">

                <div className="flex">

                    <main className="flex-1 p-6 flex flex-col items-center justify-center">
                        <h2 className="text-2xl font-bold">Post not found</h2>
                        <Button  onClick={() => router.back()} className="mt-4 cursor-pointer">
                            Go Back
                        </Button>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">

            <div className="flex">

                <main className="flex-1 p-6">
                    <div className="max-w-6xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                className="cursor-pointer"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.back()}
                                >
                                    <ArrowLeft className="size-4 mr-2" />
                                    Back
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Post Insights</h1>
                                    <p className="text-muted-foreground mt-1">
                                        Detailed analytics for your {post.platform} post
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    Last updated: {post.insight.lastUpdated ? format(new Date(post.insight.lastUpdated), 'MMM d, h:mm a') : 'Just now'}
                                </span>
                                <Button className="cursor-pointer" onClick={handleSync} disabled={syncing}>
                                    <RefreshCw className={`size-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Syncing...' : 'Sync Data'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Post Preview & Key Metrics */}
                            <div className="space-y-6">
                                {/* Post Preview */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Post Content</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                                            {post.postType === 'VIDEO' ? (
                                                <div className="flex items-center justify-center h-full">
                                                    <Video className="size-12 text-muted-foreground" />
                                                </div>
                                            ) : (post.mediaUrls && post.mediaUrls !== '[]' && (post.mediaUrls.startsWith('http') || post.mediaUrls.startsWith('/'))) ? (
                                                <Image
                                                    src={post.mediaUrls}
                                                    alt="Post media"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <ImageIcon className="size-12 text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                {post.message || 'No text content'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="size-3" />
                                            <span>Published: {post.publishedAt ? format(new Date(post.publishedAt), 'MMM d, yyyy h:mm a') : '-'}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Key Metrics Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    {(post.platform === 'EMAIL' || post.platform === 'SMS' || post.platform === 'WHATSAPP') ? (
                                        <>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <Send className="size-5 text-blue-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.reach}</span>
                                                    <span className="text-xs text-muted-foreground">Sent</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <CheckCircle className="size-5 text-green-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.reach}</span>
                                                    <span className="text-xs text-muted-foreground">Delivered</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <Eye className="size-5 text-purple-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.platform === 'EMAIL' ? 'N/A' : '-'}</span>
                                                    <span className="text-xs text-muted-foreground">{post.platform === 'EMAIL' ? 'Opened' : 'Read'}</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <MousePointerClick className="size-5 text-orange-500 mb-2" />
                                                    <span className="text-2xl font-bold">-</span>
                                                    <span className="text-xs text-muted-foreground">Clicked</span>
                                                </CardContent>
                                            </Card>
                                        </>
                                    ) : (
                                        <>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <ThumbsUp className="size-5 text-blue-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.likes}</span>
                                                    <span className="text-xs text-muted-foreground">Likes</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <MessageSquare className="size-5 text-green-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.comments}</span>
                                                    <span className="text-xs text-muted-foreground">Comments</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <Eye className="size-5 text-purple-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.impressions}</span>
                                                    <span className="text-xs text-muted-foreground">Impressions</span>
                                                </CardContent>
                                            </Card>
                                            <Card>
                                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                                    <Share2 className="size-5 text-orange-500 mb-2" />
                                                    <span className="text-2xl font-bold">{post.insight.reach}</span>
                                                    <span className="text-xs text-muted-foreground">Reach</span>
                                                </CardContent>
                                            </Card>
                                        </>
                                    )}
                                </div>

                                {/* Engagement Rate / Delivery Rate */}
                                <Card>
                                    <CardContent className="p-6 flex items-center justify-between">
                                        {(post.platform === 'EMAIL' || post.platform === 'SMS' || post.platform === 'WHATSAPP') ? (
                                            <>
                                                <div>
                                                    <p className="text-sm font-medium">Delivery Rate</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        (Delivered / Sent) * 100
                                                    </p>
                                                </div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {post.insight.reach > 0 ? '100.00%' : 'N/A'}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div>
                                                    <p className="text-sm font-medium">Engagement Rate</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        (Likes + Comments) / Impressions
                                                    </p>
                                                </div>
                                                <div className="text-3xl font-bold text-primary">
                                                    {post.insight.impressions > 0
                                                        ? `${post.insight.engagementRate.toFixed(2)}%`
                                                        : <span className="text-lg text-muted-foreground">N/A</span>
                                                    }
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Charts */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Performance Over Time */}
                                <Card className="h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart2 className="size-5" />
                                            Performance Over Time
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-[400px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={historicalData}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="date" tickFormatter={(value) => format(new Date(value), 'MMM d')} />
                                                    <YAxis />
                                                    <Tooltip labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')} />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="likes" stroke="#3b82f6" strokeWidth={2} />
                                                    <Line type="monotone" dataKey="comments" stroke="#10b981" strokeWidth={2} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Demographics removed as they are not available per-post via standard APIs */}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
