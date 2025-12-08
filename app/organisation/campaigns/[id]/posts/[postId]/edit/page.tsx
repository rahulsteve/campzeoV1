'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Save, Upload, X, Youtube, Eye, Video, Trash2 } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

interface Post {
    id: number;
    subject: string | null;
    message: string | null;
    type: string;
    senderEmail: string | null;
    scheduledPostTime: string | null;
    isPostSent: boolean;
    videoUrl: string | null;
    mediaUrls: string[];
    metadata: any;
}

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const campaignId = params.id as string;
    const postId = params.postId as string;

    // Form state
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [scheduledPostTime, setScheduledPostTime] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [pinterestBoardId, setPinterestBoardId] = useState('');
    const [pinterestLink, setPinterestLink] = useState('');
    const [youtubeTags, setYoutubeTags] = useState('');
    const [youtubePrivacy, setYoutubePrivacy] = useState('public');
    const [isReel, setIsReel] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    // Pinterest Boards
    const [pinterestBoards, setPinterestBoards] = useState<any[]>([]);
    const [loadingPinterestBoards, setLoadingPinterestBoards] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Preview state
    const [showPreview, setShowPreview] = useState(false);

    // Fetch post data
    useEffect(() => {
        const fetchPost = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/campaigns/${campaignId}/posts/${postId}`);
                if (!response.ok) throw new Error('Failed to fetch post');

                const data = await response.json();
                const post: Post = data.post;

                if (post.isPostSent) {
                    toast.error('Cannot edit a sent post');
                    router.push(`/organisation/campaigns/${campaignId}/posts`);
                    return;
                }

                setSubject(post.subject || '');
                setMessage(post.message || '');
                setType(post.type);
                setSenderEmail(post.senderEmail || '');

                // Load media URLs
                if (post.mediaUrls && post.mediaUrls.length > 0) {
                    setMediaUrls(post.mediaUrls);
                } else if (post.videoUrl) {
                    setMediaUrls([post.videoUrl]);
                }

                // Load metadata
                const metadata = post.metadata || {};
                setPinterestBoardId(metadata.boardId || '');
                setPinterestLink(metadata.link || '');
                setYoutubeTags(metadata.tags ? (Array.isArray(metadata.tags) ? metadata.tags.join(', ') : metadata.tags) : '');
                setYoutubePrivacy(metadata.privacy || 'public');
                setIsReel(metadata.isReel || false);

                if (post.scheduledPostTime) {
                    const date = new Date(post.scheduledPostTime);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    setScheduledPostTime(`${year}-${month}-${day}T${hours}:${minutes}`);
                }
            } catch (error) {
                console.error('Error fetching post:', error);
                toast.error('Failed to load post');
                router.push(`/organisation/campaigns/${campaignId}/posts`);
            } finally {
                setLoading(false);
            }
        };

        fetchPost();
    }, [campaignId, postId, router]);

    // Fetch Pinterest boards
    useEffect(() => {
        if (type === 'PINTEREST') {
            const fetchBoards = async () => {
                try {
                    setLoadingPinterestBoards(true);
                    const response = await fetch('/api/socialmedia/pinterest/boards');
                    if (response.ok) {
                        const data = await response.json();
                        setPinterestBoards(data.boards || []);
                    }
                } catch (error) {
                    console.error('Error fetching Pinterest boards:', error);
                    toast.error('Failed to fetch Pinterest boards');
                } finally {
                    setLoadingPinterestBoards(false);
                }
            };
            fetchBoards();
        }
    }, [type]);

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Limit to 10 images
        if (mediaUrls.length + files.length > 10) {
            toast.error('You can upload a maximum of 10 media files');
            return;
        }

        try {
            setUploadingMedia(true);
            const newUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/socialmedia/upload-media-file', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Upload failed');

                const data = await response.json();
                newUrls.push(data.url);
            }

            setMediaUrls(prev => [...prev, ...newUrls]);
            toast.success('Files uploaded successfully');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingMedia(false);
        }
    };

    const removeMedia = (index: number) => {
        setMediaUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!type) {
            toast.error('Please select a platform');
            return;
        }

        if (!message && !subject) {
            toast.error('Please enter a message or subject');
            return;
        }

        if (type === 'EMAIL' && !senderEmail) {
            toast.error('Please enter sender email for email posts');
            return;
        }

        if (['INSTAGRAM', 'YOUTUBE', 'PINTEREST'].includes(type) && mediaUrls.length === 0) {
            toast.error(`${type} posts require media (image/video)`);
            return;
        }

        // Prepare metadata
        let metadata: any = {};
        if (type === 'YOUTUBE') {
            metadata = { tags: youtubeTags ? youtubeTags.split(',').map(t => t.trim()) : [], privacy: youtubePrivacy };
        } else if (type === 'PINTEREST') {
            metadata = { boardId: pinterestBoardId, link: pinterestLink };
        } else if (type === 'FACEBOOK' || type === 'INSTAGRAM') {
            metadata = { isReel: !!isReel };
        }

        try {
            setSaving(true);

            const response = await fetch(`/api/campaigns/${campaignId}/posts/${postId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject || null,
                    message: message || null,
                    type,
                    senderEmail: type === 'EMAIL' ? senderEmail : null,
                    scheduledPostTime: scheduledPostTime || null,
                    mediaUrls: mediaUrls,
                    videoUrl: mediaUrls.length > 0 ? mediaUrls[0] : null,
                    metadata
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update post');
            }

            toast.success('Post updated successfully');
            router.push(`/organisation/campaigns/${campaignId}/posts`);
        } catch (error) {
            console.error('Error updating post:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update post');
        } finally {
            setSaving(false);
        }
    };

    // Check if a URL is a video
    const isVideoUrl = (url: string) => url.match(/\.(mp4|mov|webm)$/i);

    if (loading) {
        return (
            <div className="min-h-screen bg-background">

                <div className="flex">

                    <main className="flex-1 p-6">
                        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
                            <Loader2 className="size-8 animate-spin text-muted-foreground" />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">

            <div className="flex">

                <main className="flex-1 p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => router.back()}
                                >
                                    <ArrowLeft className="size-4 mr-2" />
                                    Back
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
                                    <p className="text-muted-foreground mt-1">
                                        Update post details
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => setShowPreview(true)}>
                                <Eye className="size-4 mr-2" />
                                Preview
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Post Details */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Post Details</CardTitle>
                                    <CardDescription>
                                        Configure your campaign post
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="type">Platform *</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger id="type">
                                                <SelectValue placeholder="Select platform" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EMAIL">Email</SelectItem>
                                                <SelectItem value="SMS">SMS</SelectItem>
                                                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                                                <SelectItem value="FACEBOOK">Facebook</SelectItem>
                                                <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                                                <SelectItem value="LINKEDIN">LinkedIn</SelectItem>
                                                <SelectItem value="YOUTUBE">YouTube</SelectItem>
                                                <SelectItem value="PINTEREST">Pinterest</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {type === 'EMAIL' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="senderEmail">Sender Email *</Label>
                                                <Input
                                                    id="senderEmail"
                                                    type="email"
                                                    placeholder="sender@example.com"
                                                    value={senderEmail}
                                                    onChange={(e) => setSenderEmail(e.target.value)}
                                                    required={type === 'EMAIL'}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="subject">Subject *</Label>
                                                <Input
                                                    id="subject"
                                                    placeholder="Enter email subject"
                                                    value={subject}
                                                    onChange={(e) => setSubject(e.target.value)}
                                                    required={type === 'EMAIL'}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Title for social platforms */}
                                    {type && type !== 'EMAIL' && type !== 'SMS' && (
                                        <div className="space-y-2">
                                            <Label htmlFor="subject">Title</Label>
                                            <Input
                                                id="subject"
                                                placeholder="Enter post title"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {type && (
                                        <div className="space-y-2">
                                            <Label htmlFor="message">
                                                Message {type !== 'EMAIL' && '*'}
                                            </Label>
                                            <Textarea
                                                id="message"
                                                placeholder="Enter your message"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                rows={6}
                                                required={type !== 'EMAIL'}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {type === 'SMS' && 'SMS messages are limited to 160 characters'}
                                                {type === 'WHATSAPP' && 'WhatsApp messages support rich formatting'}
                                                {type === 'EMAIL' && 'You can use HTML formatting in email messages'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Media Upload */}
                                    {['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST'].includes(type) && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <Label>
                                                    {type === 'YOUTUBE' ? 'Video *' : 'Media (Photo/Video)'}
                                                    {['INSTAGRAM', 'PINTEREST'].includes(type) && ' *'}
                                                </Label>
                                                <span className="text-xs text-muted-foreground">{mediaUrls.length}/10 uploaded</span>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                {mediaUrls.map((url, index) => (
                                                    <div key={index} className="relative rounded-lg overflow-hidden border bg-muted/50 aspect-square group">
                                                        {isVideoUrl(url) ? (
                                                            <div className="flex items-center justify-center h-full bg-black/10">
                                                                <Video className="size-8 text-muted-foreground" />
                                                                <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">Video</p>
                                                            </div>
                                                        ) : (
                                                            <img
                                                                src={url}
                                                                alt={`Media ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeMedia(index)}
                                                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                            title="Remove media"
                                                        >
                                                            <Trash2 className="size-3" />
                                                        </button>
                                                    </div>
                                                ))}

                                                {mediaUrls.length < 10 && (
                                                    <label htmlFor="media-upload" className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                                        {uploadingMedia ? (
                                                            <Loader2 className="size-6 text-muted-foreground animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Upload className="size-6 text-muted-foreground mb-1" />
                                                                <span className="text-xs text-muted-foreground">Add</span>
                                                            </>
                                                        )}
                                                        <input
                                                            id="media-upload"
                                                            type="file"
                                                            className="hidden"
                                                            accept={type === 'YOUTUBE' ? 'video/*' : 'image/*,video/*'}
                                                            onChange={handleFileUpload}
                                                            disabled={uploadingMedia}
                                                            multiple
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reel Option for Facebook/Instagram */}
                                    {(type === 'FACEBOOK' || type === 'INSTAGRAM') &&
                                        mediaUrls.some(url => isVideoUrl(url)) && (
                                            <div className="space-y-4 pt-4 border-t">
                                                <br />
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        id="isReel"
                                                        checked={isReel}
                                                        onChange={(e) => setIsReel(e.target.checked)}
                                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <Label htmlFor="isReel" className="font-medium cursor-pointer">
                                                        Post as Reel
                                                    </Label>
                                                </div>
                                                <p className="text-xs text-muted-foreground pl-6">
                                                    Upload as a short-form video (Reel). Recommended for vertical videos (9:16) under 90 seconds.
                                                </p>
                                            </div>
                                        )}

                                    {/* YouTube Specific Fields */}
                                    {type === 'YOUTUBE' && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium flex items-center gap-2">
                                                <Youtube className="size-4 text-red-600" />
                                                YouTube Settings
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="youtubeTags">Tags (comma separated)</Label>
                                                    <Input
                                                        id="youtubeTags"
                                                        placeholder="tutorial, tech, campzeo"
                                                        value={youtubeTags}
                                                        onChange={(e) => setYoutubeTags(e.target.value)}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="youtubePrivacy">Privacy Status</Label>
                                                    <Select value={youtubePrivacy} onValueChange={setYoutubePrivacy}>
                                                        <SelectTrigger id="youtubePrivacy">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="public">Public</SelectItem>
                                                            <SelectItem value="private">Private</SelectItem>
                                                            <SelectItem value="unlisted">Unlisted</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label htmlFor="scheduledPostTime">Schedule Post (Optional)</Label>
                                        <Input
                                            id="scheduledPostTime"
                                            type="datetime-local"
                                            value={scheduledPostTime}
                                            onChange={(e) => setScheduledPostTime(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Leave empty to send immediately
                                        </p>
                                    </div>

                                    {/* Pinterest Specific Fields */}
                                    {type === 'PINTEREST' && (
                                        <div className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium flex items-center gap-2">
                                                <div className="p-1 bg-red-600 rounded-full">
                                                    <span className="text-white text-[10px] font-bold">P</span>
                                                </div>
                                                Pinterest Settings
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="pinterestBoardId">Board *</Label>
                                                    {loadingPinterestBoards ? (
                                                        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                                                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                                                            <span className="text-sm text-muted-foreground">Loading boards...</span>
                                                        </div>
                                                    ) : (
                                                        <Select value={pinterestBoardId} onValueChange={setPinterestBoardId}>
                                                            <SelectTrigger id="pinterestBoardId">
                                                                <SelectValue placeholder="Select a board" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {pinterestBoards.length === 0 ? (
                                                                    <SelectItem value="none" disabled>No boards found</SelectItem>
                                                                ) : (
                                                                    pinterestBoards.map((board) => (
                                                                        <SelectItem key={board.id} value={board.id}>
                                                                            {board.name}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>

                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="flex justify-end gap-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="size-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Post Preview - {type}</DialogTitle>
                        <DialogDescription>
                            Preview how your post will look
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {subject && (
                            <div>
                                <p className="text-sm font-medium mb-1">Title:</p>
                                <p className="text-sm font-semibold">{subject}</p>
                            </div>
                        )}

                        {mediaUrls.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Media:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {mediaUrls.map((url, index) => (
                                        <div key={index} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                                            {isVideoUrl(url) ? (
                                                <div className="flex items-center justify-center h-full bg-black/10">
                                                    <div className="size-12 rounded-full bg-white/80 flex items-center justify-center shadow">
                                                        <div className="ml-1 size-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-primary" />
                                                    </div>
                                                    <p className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-1 rounded">Video</p>
                                                </div>
                                            ) : (
                                                <img
                                                    src={url}
                                                    alt={`Media ${index + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-sm font-medium mb-1">Message:</p>
                            <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">
                                {message || <span className="text-muted-foreground italic">No message</span>}
                            </div>
                        </div>

                        {isReel && (
                            <div className="flex items-center gap-2 text-sm text-primary">
                                <Video className="size-4" />
                                <span>Will be posted as a Reel</span>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
