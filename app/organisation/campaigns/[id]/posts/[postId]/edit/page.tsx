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
import { ArrowLeft, Loader2, Save, Upload, X, Youtube } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
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
    const [mediaUrl, setMediaUrl] = useState('');
    const [pinterestBoardId, setPinterestBoardId] = useState('');
    const [pinterestLink, setPinterestLink] = useState('');
    const [uploadingMedia, setUploadingMedia] = useState(false);
    
    // Pinterest Boards
    const [pinterestBoards, setPinterestBoards] = useState<any[]>([]);
    const [loadingPinterestBoards, setLoadingPinterestBoards] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

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
                setMediaUrl(post.videoUrl || '');
                
                // Load metadata
                const metadata = (post as any).metadata || {};
                setPinterestBoardId(metadata.boardId || '');
                setPinterestLink(metadata.link || '');
                
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
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingMedia(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/socialmedia/upload-media-file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            setMediaUrl(data.url);
            toast.success('File uploaded successfully');
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Failed to upload file');
        } finally {
            setUploadingMedia(false);
        }
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

        if (['INSTAGRAM', 'YOUTUBE', 'PINTEREST'].includes(type) && !mediaUrl) {
            toast.error(`${type} posts require media (image/video)`);
            return;
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
                    videoUrl: mediaUrl || null,
                    pinterestBoardId,
                    pinterestLink
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

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="flex">
                    <Sidebar />
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
            <Header />
            <div className="flex">
                <Sidebar />
                <main className="flex-1 p-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {/* Header */}
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
                                            <Label>
                                                {type === 'YOUTUBE' ? 'Video *' : 'Media (Photo/Video)'}
                                                {['INSTAGRAM', 'PINTEREST'].includes(type) && ' *'}
                                            </Label>
                                            {!mediaUrl ? (
                                                <div className="flex items-center justify-center w-full">
                                                    <label htmlFor="media-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            {uploadingMedia ? (
                                                                <Loader2 className="size-8 mb-2 text-muted-foreground animate-spin" />
                                                            ) : (
                                                                <Upload className="size-8 mb-2 text-muted-foreground" />
                                                            )}
                                                            <p className="text-sm text-muted-foreground">
                                                                {uploadingMedia ? 'Uploading...' : 'Click to upload photo or video'}
                                                            </p>
                                                        </div>
                                                        <input 
                                                            id="media-upload" 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept={type === 'YOUTUBE' ? 'video/*' : 'image/*,video/*'}
                                                            onChange={handleFileUpload}
                                                            disabled={uploadingMedia}
                                                        />
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="relative rounded-lg overflow-hidden border bg-muted/50">
                                                    <div className="p-4 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 truncate">
                                                            <div className="size-10 bg-background rounded flex items-center justify-center border">
                                                                {mediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                                                                    <Youtube className="size-5 text-muted-foreground" />
                                                                ) : (
                                                                    <Image 
                                                                        src={mediaUrl} 
                                                                        alt="Preview" 
                                                                        width={40} 
                                                                        height={40} 
                                                                        className="object-cover size-full"
                                                                    />
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                {mediaUrl.split('/').pop()}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setMediaUrl('')}
                                                        >
                                                            <X className="size-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
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
                                                <div className="space-y-2">
                                                    <Label htmlFor="pinterestLink">Destination Link</Label>
                                                    <Input
                                                        id="pinterestLink"
                                                        placeholder="https://yourwebsite.com"
                                                        value={pinterestLink}
                                                        onChange={(e) => setPinterestLink(e.target.value)}
                                                    />
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
        </div>
    );
}
