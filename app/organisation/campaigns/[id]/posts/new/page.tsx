
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    ArrowLeft,
    Loader2,
    Save,
    Eye,
    Mail,
    MessageSquare,
    Phone,
    Send,
    Facebook,
    Instagram,
    Linkedin,
    Youtube,
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    Video,
    Plus,
    Sparkles
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { PostPreview } from './_components/post-preview';
import { WYSIWYGPreview } from '../_components/WYSIWYGPreview';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import React from 'react'; // Import React for React.use
import { AIContentAssistant } from '@/components/ai-content-assistant';

export default function NewPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { user } = useUser();
    const router = useRouter();
    const resolvedParams = React.use(params);
    const campaignId = resolvedParams.id;

    // Form state
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [isReel, setIsReel] = useState(false);

    // Platform specific fields
    const [youtubeTags, setYoutubeTags] = useState('');
    const [youtubePrivacy, setYoutubePrivacy] = useState('public');
    const [youtubeContentType, setYoutubeContentType] = useState('VIDEO'); // VIDEO, SHORT, PLAYLIST
    const [youtubePlaylistTitle, setYoutubePlaylistTitle] = useState('');
    const [pinterestBoardId, setPinterestBoardId] = useState('');
    const [pinterestLink, setPinterestLink] = useState('');
    const [senderEmail, setSenderEmail] = useState('');
    const [scheduledPostTime, setScheduledPostTime] = useState('');
    const [saving, setSaving] = useState(false);
    const [organisationPlatforms, setOrganisationPlatforms] = useState<string[]>([]);
    const [loadingPlatforms, setLoadingPlatforms] = useState(true);
    const [campaignContacts, setCampaignContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [contentType, setContentType] = useState('POST'); // For Facebook/Instagram: POST or REEL
    // const [loadingContacts, setLoadingContacts] = useState(true); // Duplicate declaration removed
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');

    // Fetch campaign contacts
    useEffect(() => {
        const fetchCampaignContacts = async () => {
            try {
                setLoadingContacts(true);
                const response = await fetch(`/api/campaigns/${campaignId}`);
                if (!response.ok) {
                    console.error('Failed to fetch campaign');
                    return;
                }
                const data = await response.json();
                setCampaignContacts(data.campaign.contacts || []);
            } catch (error) {
                console.error('Error fetching campaign contacts:', error);
            } finally {
                setLoadingContacts(false);
            }
        };

        fetchCampaignContacts();
    }, [campaignId]);


    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);
    const [pinterestBoards, setPinterestBoards] = useState<{ id: string; name: string }[]>([]);
    const [loadingPinterestBoards, setLoadingPinterestBoards] = useState(false);

    // New Board State
    const [isCreatingBoard, setIsCreatingBoard] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [newBoardDescription, setNewBoardDescription] = useState('');
    const [creatingBoard, setCreatingBoard] = useState(false);

    // AI Assistant state
    const [showAIAssistant, setShowAIAssistant] = useState(false);

    // Helper for inserting variables
    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('message') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = before + `{{${variable}}}` + after;

        setMessage(newText);

        // Reset cursor position
        setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4;
            textarea.focus();
        }, 0);
    };

    // Fetch organisation platforms
    useEffect(() => {
        const fetchOrgPlatforms = async () => {
            try {
                setLoadingPlatforms(true);
                const response = await fetch('/api/Organisation/GetPlatforms');
                if (!response.ok) {
                    // If API fails, show all platforms
                    setOrganisationPlatforms(['EMAIL', 'SMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST']);
                    return;
                }
                const data = await response.json();
                const platforms = data.platforms || [];
                // Filter out admin-only platforms (EMAIL, SMS, WHATSAPP are managed by admin)
                const availablePlatforms = platforms.filter((p: string) =>
                    !['EMAIL', 'SMS', 'WHATSAPP'].includes(p.toUpperCase())
                );
                // Add EMAIL, SMS, WHATSAPP as they're always available
                setOrganisationPlatforms(['EMAIL', 'SMS', 'WHATSAPP', ...availablePlatforms]);
            } catch (error) {
                console.error('Error fetching organisation platforms:', error);
                // Default to all platforms on error
                setOrganisationPlatforms(['EMAIL', 'SMS', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST']);
            } finally {
                setLoadingPlatforms(false);
            }
        };

        fetchOrgPlatforms();
    }, []);

    // Fetch Pinterest boards
    // Fetch Pinterest boards
    useEffect(() => {
        if (selectedPlatform === 'PINTEREST') {
            const fetchBoards = async () => {
                try {
                    setLoadingPinterestBoards(true);
                    const response = await fetch('/api/socialmedia/pinterest/boards');
                    if (response.ok) {
                        const data = await response.json();
                        setPinterestBoards(data.boards || []);
                        // If only one board, select it
                        if (data.boards && data.boards.length === 1) {
                            setPinterestBoardId(data.boards[0].id);
                        }
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
    }, [selectedPlatform]);

    // Get preview content with variables replaced
    const getPreviewContent = () => {
        // Use first contact from campaign for preview, or fallback to placeholder
        const sampleContact = campaignContacts.length > 0 ? campaignContacts[0] : null;

        return message
            .replace(/{{name}}/g, sampleContact?.contactName || 'John Doe')
            .replace(/{{email}}/g, sampleContact?.contactEmail || 'john@example.com')
            .replace(/{{phone}}/g, sampleContact?.contactMobile || '+1234567890')
            .replace(/{{company}}/g, 'Acme Corp'); // Company field not in contact model
    };

    // Get platform icon
    const getPlatformIcon = (platform: string) => {
        switch (platform) {
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
            default:
                return Send;
        }
    };

    // Handle file upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // Limit to 10 images
        if (mediaUrls.length + files.length > 10) {
            toast.error('You can upload a maximum of 10 images');
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

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            setUploadingMedia(true);
            const file = files[0];
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/socialmedia/upload-media-file', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error('Upload failed');

            const data = await response.json();
            setThumbnailUrl(data.url);
            toast.success('Thumbnail uploaded successfully');
        } catch (error) {
            console.error('Error uploading thumbnail:', error);
            toast.error('Failed to upload thumbnail');
        } finally {
            setUploadingMedia(false);
        }
    };

    const removeMedia = (index: number) => {
        setMediaUrls(prev => prev.filter((_, i) => i !== index));
    };

    // Create new Pinterest board
    const handleCreateBoard = async () => {
        if (!newBoardName.trim()) {
            toast.error('Board name is required');
            return;
        }

        try {
            setCreatingBoard(true);
            const response = await fetch('/api/socialmedia/pinterest/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBoardName,
                    description: newBoardDescription,
                    privacy: 'PUBLIC' // Default to public
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create board');
            }

            const data = await response.json();
            const newBoard = data.board;

            // Add new board to list and select it
            setPinterestBoards(prev => [...prev, newBoard]);
            setPinterestBoardId(newBoard.id);

            // Reset and close modal
            setNewBoardName('');
            setNewBoardDescription('');
            setIsCreatingBoard(false);

            toast.success('Board created successfully');
        } catch (error) {
            console.error('Error creating board:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create board');
        } finally {
            setCreatingBoard(false);
        }
    };

    // Handle form submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!selectedPlatform) {
            toast.error('Please select a platform');
            return;
        }

        // SMS validation
        if (selectedPlatform === 'SMS') {
            if (!message) {
                toast.error('Please enter a message for SMS');
                return;
            }
        }
        // Email validation
        if (selectedPlatform === 'EMAIL') {
            if (!senderEmail) {
                toast.error('Please enter sender email');
                return;
            }
            if (!subject) {
                toast.error('Please enter a subject');
                return;
            }
            if (!message) {
                toast.error('Please enter a message');
                return;
            }
        }

        // Social Media validation
        const isSocialPlatform = selectedPlatform && !['EMAIL', 'SMS'].includes(selectedPlatform);
        if (isSocialPlatform) {
            if (!subject && selectedPlatform !== 'SMS') {
                toast.error('Please enter a title');
                return;
            }
            if (!message) {
                toast.error('Please enter a message');
                return;
            }

            // Media validation
            if ((selectedPlatform === 'INSTAGRAM' || selectedPlatform === 'YOUTUBE' || selectedPlatform === 'PINTEREST') && mediaUrls.length === 0) {
                toast.error(`Instagram, YouTube, and Pinterest posts require media`);
                return;
            }

            // YouTube specific validation
            if (selectedPlatform === 'YOUTUBE' && mediaUrls.length > 0 && !mediaUrls[0].match(/\.(mp4|mov|webm)$/i)) {
                toast.error('YouTube requires a video file');
                return;
            }
        }

        try {
            setSaving(true);

            const response = await fetch(`/api/campaigns/${campaignId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: subject || null,
                    message: message || null,
                    type: selectedPlatform, // Send single type
                    senderEmail: selectedPlatform === 'EMAIL' ? senderEmail : null,
                    scheduledPostTime: scheduledPostTime || null,
                    mediaUrls: mediaUrls, // Send array
                    youtubeTags: youtubeTags ? youtubeTags.split(',').map(t => t.trim()) : [],
                    youtubePrivacy,
                    youtubeContentType, // NEW: YouTube content type (VIDEO, SHORT, PLAYLIST)
                    youtubePlaylistTitle, // NEW: Playlist title if creating playlist
                    pinterestBoardId,
                    pinterestLink,
                    isReel, // Send isReel flag
                    contentType, // NEW: Facebook/Instagram content type (POST, REEL)
                    thumbnailUrl // Send thumbnail
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create post');
            }

            toast.success('Post created successfully');
            router.push(`/organisation/campaigns/${campaignId}/posts`);
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create post');
        } finally {
            setSaving(false);
        }
    };

    // Handle platform selection toggle
    const togglePlatform = (platform: string) => {
        setSelectedPlatform(prev => prev === platform ? null : platform);
    };

    // Fetch templates when platform changes
    useEffect(() => {
        if (selectedPlatform) {
            fetchTemplates(selectedPlatform);
        } else {
            setTemplates([]);
            setSelectedTemplateId('none');
        }
    }, [selectedPlatform]);

    // Fetch templates for selected platform
    const fetchTemplates = async (platform: string) => {
        try {
            setLoadingTemplates(true);
            const response = await fetch(`/api/templates?platform=${platform}&isActive=true`);
            if (!response.ok) {
                setTemplates([]);
                return;
            }
            const data = await response.json();
            setTemplates(data.success ? data.data : []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setTemplates([]);
        } finally {
            setLoadingTemplates(false);
        }
    };

    // Handle template selection
    // Handle template selection
    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);

        if (!templateId || templateId === 'none') {
            // Clear the form if "none" is selected
            return;
        }

        const template = templates.find(t => t.id.toString() === templateId);
        if (!template) return;

        // Fill form with template data
        setSubject(template.subject || '');
        setMessage(template.content || '');

        // Prefill media
        if (template.mediaUrls && Array.isArray(template.mediaUrls)) {
            setMediaUrls(template.mediaUrls);
        }

        // Handle metadata settings
        if (template.metadata && typeof template.metadata === 'object') {
            const meta = template.metadata as any;

            // Map YouTube Content Type (VIDEO, SHORT, PLAYLIST)
            if (meta.postType && selectedPlatform === 'YOUTUBE') {
                setYoutubeContentType(meta.postType);
                if (meta.postType === 'SHORT') {
                    setIsReel(true); // Shorts are similar to reels
                }
            }

            // Map YouTube Playlist Title
            if (meta.playlistTitle) {
                setYoutubePlaylistTitle(meta.playlistTitle);
            }

            // Map Facebook/Instagram Content Type
            if (meta.postType && (selectedPlatform === 'FACEBOOK' || selectedPlatform === 'INSTAGRAM')) {
                setContentType(meta.postType); // POST or REEL
                setIsReel(meta.postType === 'REEL');
            }

            // Map YouTube Privacy
            if (meta.youtubePrivacy) {
                setYoutubePrivacy(meta.youtubePrivacy);
            }

            // Map YouTube Tags
            if (meta.youtubeTags) {
                setYoutubeTags(meta.youtubeTags);
            }

            // Map Thumbnail
            if (meta.thumbnailUrl) {
                setThumbnailUrl(meta.thumbnailUrl);
            }
        }

        toast.success('Template loaded! You can now edit the content.');
    };

    return (
        <div className=" w-full  bg-background">

            <div className="flex ">

                <main className="flex-1 p-6 min-h-screen">
                    <div className=" mx-auto space-y-6">
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
                                <h1 className="text-3xl font-bold tracking-tight">New Post</h1>
                                <p className="text-muted-foreground mt-1">
                                    Create a new post for this campaign
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Post Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Post Details</CardTitle>
                                        <CardDescription>
                                            Create content for your campaign
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {/* Platform Selection */}
                                        <div className="space-y-3">
                                            <Label>Select Platform *</Label>
                                            {loadingPlatforms ? (
                                                <div className="flex items-center gap-2 p-4">
                                                    <Loader2 className="size-4 animate-spin" />
                                                    <span className="text-sm text-muted-foreground">Loading platforms...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex flex-wrap gap-3">
                                                        {organisationPlatforms.map((platform) => {
                                                            const isSelected = selectedPlatform === platform;
                                                            const Icon = getPlatformIcon(platform);

                                                            return (
                                                                <button
                                                                    key={platform}
                                                                    type="button"
                                                                    onClick={() => togglePlatform(platform)}
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
                                                    <p className="text-xs text-muted-foreground">
                                                        Select a platform to configure your post
                                                    </p>
                                                </>
                                            )}
                                        </div>

                                        {/* Other Platforms Form */}
                                        {selectedPlatform && selectedPlatform !== 'EMAIL' && (
                                            <div className="space-y-4">
                                                {/* Title Field for Social Media & WhatsApp */}
                                                {selectedPlatform !== 'SMS' && (
                                                    <div className="space-y-2">
                                                        <Label htmlFor="subject">Title *</Label>
                                                        <Input
                                                            id="subject"
                                                            placeholder="Enter post title"
                                                            value={subject}
                                                            onChange={(e) => setSubject(e.target.value)}
                                                            required={selectedPlatform !== 'SMS' && selectedPlatform !== 'EMAIL'}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            This will be displayed as the bold header of your post
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <Label htmlFor="message">Message *</Label>
                                                    <div className="relative">
                                                        <Textarea
                                                            id="message"
                                                            placeholder="Enter your message"
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                            rows={6}
                                                            required={true}
                                                            className="pr-12 border border-2 border-gray-300 rounded-2xl"
                                                        />
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="absolute bottom-2 right-2 size-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                                                            onClick={() => setShowAIAssistant(true)}
                                                            title="Generate content with AI"
                                                        >
                                                            <Sparkles className="size-4" />
                                                        </Button>
                                                    </div>
                                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                        <span>
                                                            {message.length} characters
                                                        </span>
                                                        <span>
                                                            {selectedPlatform === 'SMS' && `Limit: 160 | `}
                                                            {selectedPlatform === 'TWITTER' && `Limit: 280 | `}
                                                            {selectedPlatform === 'INSTAGRAM' && `Limit: 2200`}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {selectedPlatform === 'SMS' && 'SMS messages are limited to 160 characters. '}
                                                        {selectedPlatform === 'WHATSAPP' && 'WhatsApp messages support rich formatting. '}
                                                        {selectedPlatform === 'FACEBOOK' && 'Create engaging content for your Facebook audience. '}
                                                        {selectedPlatform === 'INSTAGRAM' && 'Share visual content with your Instagram followers. '}
                                                        {selectedPlatform === 'LINKEDIN' && 'Professional content for your LinkedIn network. '}
                                                        {selectedPlatform === 'YOUTUBE' && 'Video description or community post. '}
                                                    </p>
                                                </div>
                                                {/* ) : templates.length > 0 ? (
                                                    <>
                                                        <Select value={selectedTemplateId || "none"} onValueChange={handleTemplateSelect}>
                                                            <SelectTrigger id="template">
                                                                <SelectValue placeholder="Select a template to start with..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">None - Start from scratch</SelectItem>
                                                                {templates.map((template) => (
                                                                    <SelectItem key={template.id} value={template.id.toString()}>
                                                                        <div className="flex items-center gap-2">
                                                                            <FileText className="size-4" />
                                                                            <span>{template.name}</span>
                                                                            {template.category && (
                                                                                <span className="text-xs text-muted-foreground">
                                                                                    ({template.category})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <p className="text-xs text-muted-foreground">
                                                            Templates will pre-fill the form. You can edit directly in the preview below.
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
                                                        No templates available for {selectedPlatform}. Create one in the Templates section!
                                                    </p>
                                                )} */}
                                            </div>
                                        )}

                                        {/* Email Form */}
                                        {selectedPlatform === 'EMAIL' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="senderEmail">Sender Email *</Label>
                                                    <Input
                                                        id="senderEmail"
                                                        type="email"
                                                        placeholder="sender@example.com"
                                                        value={senderEmail}
                                                        onChange={(e) => setSenderEmail(e.target.value)}
                                                        required={selectedPlatform === 'EMAIL'}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="subject">Subject *</Label>
                                                    <Input
                                                        id="subject"
                                                        placeholder="Enter email subject"
                                                        value={subject}
                                                        onChange={(e) => setSubject(e.target.value)}
                                                        required={selectedPlatform === 'EMAIL'}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor="message">Message Body *</Label>
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button type="button" variant="outline" size="sm">
                                                                    <Eye className="size-4 mr-2" />
                                                                    Preview
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>Email Preview</DialogTitle>
                                                                    <DialogDescription>
                                                                        Preview how your email will look with sample data
                                                                    </DialogDescription>
                                                                </DialogHeader>
                                                                <div className="space-y-4">
                                                                    <div>
                                                                        <p className="text-sm font-medium mb-1">Subject:</p>
                                                                        <p className="text-sm text-muted-foreground">{subject || 'No subject'}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium mb-1">Message:</p>
                                                                        <div className="p-4 border rounded-lg bg-muted/50 whitespace-pre-wrap">
                                                                            {getPreviewContent() || 'No message'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>
                                                    </div>
                                                    <Textarea
                                                        id="message"
                                                        placeholder="Enter your email message"
                                                        value={message}
                                                        onChange={(e) => setMessage(e.target.value)}
                                                        rows={8}
                                                        required={selectedPlatform === 'EMAIL'}
                                                    />
                                                    <div className="flex flex-wrap gap-2">
                                                        <p className="text-xs text-muted-foreground w-full">
                                                            Insert variables:
                                                        </p>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => insertVariable('name')}
                                                        >
                                                            {'{{name}}'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => insertVariable('email')}
                                                        >
                                                            {'{{email}}'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => insertVariable('phone')}
                                                        >
                                                            {'{{phone}}'}
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => insertVariable('company')}
                                                        >
                                                            {'{{company}}'}
                                                        </Button>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Variables will be replaced with actual contact data when sent
                                                    </p>
                                                </div>
                                            </>
                                        )}

                                        {/* Other Platforms Form */}
                                        {selectedPlatform && selectedPlatform !== 'EMAIL' && (
                                            <div className="space-y-4">


                                                {/* Media Upload */}
                                                {/* Media Upload */}
                                                {['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'PINTEREST'].includes(selectedPlatform) && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <Label className="text-xs">
                                                                {selectedPlatform === 'YOUTUBE' ? 'Video *' : 'Media (Photo/Video)'}
                                                                {(selectedPlatform === 'INSTAGRAM' || selectedPlatform === 'PINTEREST') && ' *'}
                                                            </Label>
                                                            <span className="text-[10px] text-muted-foreground">{mediaUrls.length}/10</span>
                                                        </div>

                                                        <div className="flex flex-wrap gap-2 mb-2">
                                                            {mediaUrls.map((url, index) => (
                                                                <div key={index} className="relative rounded-md overflow-hidden border bg-muted/50 size-20 group">
                                                                    {url.match(/\.(mp4|mov|webm)$/i) ? (
                                                                        <div className="flex items-center justify-center h-full">
                                                                            <Video className="size-6 text-muted-foreground" />
                                                                        </div>
                                                                    ) : (
                                                                        <Image
                                                                            src={url}
                                                                            alt={`Media ${index + 1}`}
                                                                            fill
                                                                            className="object-cover"
                                                                            unoptimized
                                                                        />
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeMedia(index)}
                                                                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    >
                                                                        <X className="size-3" />
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            {mediaUrls.length < 10 && (
                                                                <label htmlFor="media-upload" className="flex flex-col items-center justify-center size-20 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition-colors">
                                                                    <div className="flex flex-col items-center">
                                                                        <Upload className="size-4 text-muted-foreground mb-0.5" />
                                                                        <span className="text-[10px] text-muted-foreground">Add</span>
                                                                    </div>
                                                                    <input
                                                                        id="media-upload"
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept={selectedPlatform === 'YOUTUBE' ? 'video/*' : 'image/*,video/*'}
                                                                        onChange={handleFileUpload}
                                                                        disabled={uploadingMedia}
                                                                        multiple
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Facebook & Instagram Content Type Selection */}
                                                {(selectedPlatform === 'FACEBOOK' || selectedPlatform === 'INSTAGRAM') && (
                                                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                                        <Label className="text-sm font-medium">Content Type</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {['POST', 'REEL'].map((type) => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setContentType(type);
                                                                        setIsReel(type === 'REEL');
                                                                    }}
                                                                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${contentType === type
                                                                        ? 'border-primary bg-primary/10 text-primary'
                                                                        : 'border-border bg-background hover:bg-muted'
                                                                        }`}
                                                                >
                                                                    {type === 'POST' ? 'Standard Post' : 'Reel / Short Video'}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {contentType === 'REEL' && (
                                                            <div className="space-y-2 pt-2">
                                                                <Label className="text-sm font-medium">Cover Image (Optional)</Label>
                                                                <div className="flex items-center gap-3">
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        onClick={() => document.getElementById('reel-cover-upload')?.click()}
                                                                        disabled={uploadingMedia}
                                                                        className="gap-2 w-full"
                                                                    >
                                                                        <ImageIcon className="size-4" />
                                                                        {uploadingMedia ? "Uploading..." : "Upload Cover"}
                                                                    </Button>
                                                                    <input
                                                                        id="reel-cover-upload"
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={handleThumbnailUpload}
                                                                        className="hidden"
                                                                    />
                                                                </div>
                                                                {thumbnailUrl && (
                                                                    <div className="relative aspect-[9/16] w-20 overflow-hidden rounded border bg-muted">
                                                                        <Image src={thumbnailUrl} alt="Cover" fill className="object-cover" unoptimized />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setThumbnailUrl(null)}
                                                                            className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                                                                        >
                                                                            <X className="size-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                                <p className="text-xs text-muted-foreground">
                                                                    Recommended for vertical videos (9:16) under 90 seconds.
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* YouTube Specific Fields */}
                                                {selectedPlatform === 'YOUTUBE' && (
                                                    <div className="space-y-4 pt-4 border-t">
                                                        <h3 className="font-medium flex items-center gap-2">
                                                            <Youtube className="size-4 text-red-600" />
                                                            YouTube Settings
                                                        </h3>

                                                        {/* Content Type Selection */}
                                                        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                                                            <Label className="text-sm font-medium">Content Type</Label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {['VIDEO', 'SHORT', 'PLAYLIST'].map((type) => (
                                                                    <button
                                                                        key={type}
                                                                        type="button"
                                                                        onClick={() => setYoutubeContentType(type)}
                                                                        className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-all ${youtubeContentType === type
                                                                            ? 'border-primary bg-primary/10 text-primary'
                                                                            : 'border-border bg-background hover:bg-muted'
                                                                            }`}
                                                                    >
                                                                        {type === 'VIDEO' ? 'Standard Video' : type === 'SHORT' ? 'YouTube Short' : 'Playlist'}
                                                                    </button>
                                                                ))}
                                                            </div>

                                                            {/* Playlist Options */}
                                                            {youtubeContentType === 'PLAYLIST' && (
                                                                <div className="space-y-3 pt-2">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor="playlistTitle">New Playlist Title</Label>
                                                                        <Input
                                                                            id="playlistTitle"
                                                                            placeholder="Enter playlist title"
                                                                            value={youtubePlaylistTitle}
                                                                            onChange={(e) => setYoutubePlaylistTitle(e.target.value)}
                                                                        />
                                                                        <p className="text-xs text-muted-foreground">
                                                                            A new playlist will be created with this title
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

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
                                                        <div className="space-y-2 pt-2">
                                                            <Label className="text-sm font-medium">Custom Thumbnail</Label>
                                                            <div className="flex items-center gap-3">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    onClick={() => document.getElementById('yt-thumbnail-upload')?.click()}
                                                                    disabled={uploadingMedia}
                                                                    className="gap-2"
                                                                >
                                                                    <ImageIcon className="size-4" />
                                                                    {uploadingMedia ? "Uploading..." : "Upload Thumbnail"}
                                                                </Button>
                                                                <input
                                                                    id="yt-thumbnail-upload"
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={handleThumbnailUpload}
                                                                    className="hidden"
                                                                />
                                                                {thumbnailUrl && (
                                                                    <div className="relative aspect-video w-32 overflow-hidden rounded border bg-muted group">
                                                                        <Image src={thumbnailUrl} alt="Thumbnail" fill className="object-cover" unoptimized />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setThumbnailUrl(null)}
                                                                            className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <X className="size-3" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Pinterest Specific Fields */}
                                                {selectedPlatform === 'PINTEREST' && (
                                                    <div className="space-y-4 pt-4 border-t">
                                                        <h3 className="font-medium flex items-center gap-2">
                                                            <div className="p-1 bg-red-600 rounded-full">
                                                                <span className="text-white text-[10px] font-bold">P</span>
                                                            </div>
                                                            Pinterest Settings
                                                        </h3>
                                                        <div className="grid grid-cols-1 gap-4">
                                                            <div className="space-y-2">
                                                                <Label htmlFor="pinterestBoard">Select Board</Label>
                                                                {loadingPinterestBoards ? (
                                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                        <Loader2 className="size-3 animate-spin" />
                                                                        Loading boards...
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <Select
                                                                            value={pinterestBoardId}
                                                                            onValueChange={(val) => {
                                                                                if (val === 'create_new') {
                                                                                    setIsCreatingBoard(true);
                                                                                    return;
                                                                                }
                                                                                setPinterestBoardId(val);
                                                                            }}
                                                                        >
                                                                            <SelectTrigger id="pinterestBoard">
                                                                                <SelectValue placeholder="Select a board" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="create_new" className="text-primary font-medium cursor-pointer bg-primary/5 focus:bg-primary/10">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <Plus className="size-4" />
                                                                                        Create New Board
                                                                                    </div>
                                                                                </SelectItem>
                                                                                {pinterestBoards.map(board => (
                                                                                    <SelectItem key={board.id} value={board.id}>
                                                                                        {board.name}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>

                                                                        <Dialog open={isCreatingBoard} onOpenChange={setIsCreatingBoard}>
                                                                            <DialogContent>
                                                                                <DialogHeader>
                                                                                    <DialogTitle>Create New Pinterest Board</DialogTitle>
                                                                                    <DialogDescription>
                                                                                        Create a new board to organize your pins.
                                                                                    </DialogDescription>
                                                                                </DialogHeader>
                                                                                <div className="space-y-4 py-4">
                                                                                    <div className="space-y-2">
                                                                                        <Label htmlFor="boardName">Board Name</Label>
                                                                                        <Input
                                                                                            id="boardName"
                                                                                            value={newBoardName}
                                                                                            onChange={(e) => setNewBoardName(e.target.value)}
                                                                                            placeholder="e.g., Summer Inspiration"
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-2">
                                                                                        <Label htmlFor="boardDesc">Description (Optional)</Label>
                                                                                        <Textarea
                                                                                            id="boardDesc"
                                                                                            value={newBoardDescription}
                                                                                            onChange={(e) => setNewBoardDescription(e.target.value)}
                                                                                            placeholder="What's this board about?"
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex justify-end gap-3">
                                                                                    <Button variant="outline" onClick={() => setIsCreatingBoard(false)}>Cancel</Button>
                                                                                    <Button onClick={handleCreateBoard} disabled={creatingBoard || !newBoardName.trim()}>
                                                                                        {creatingBoard && <Loader2 className="size-4 mr-2 animate-spin" />}
                                                                                        Create Board
                                                                                    </Button>
                                                                                </div>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label htmlFor="pinterestLink">Destination Link (Optional)</Label>
                                                                <Input
                                                                    id="pinterestLink"
                                                                    placeholder="https://example.com"
                                                                    value={pinterestLink}
                                                                    onChange={(e) => setPinterestLink(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Schedule Field */}
                                                {selectedPlatform && (
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
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* WYSIWYG Live Preview */}
                                {selectedPlatform && (
                                    <WYSIWYGPreview
                                        platform={selectedPlatform}
                                        subject={subject}
                                        message={message}
                                        mediaUrls={mediaUrls}
                                        thumbnailUrl={thumbnailUrl}
                                        isReel={isReel || youtubeContentType === 'SHORT'}
                                        onSubjectChange={setSubject}
                                        onMessageChange={setMessage}
                                        user={{
                                            name: user?.fullName || user?.firstName || 'Your Brand',
                                            image: user?.imageUrl
                                        }}
                                    />
                                )}

                                <div className="flex  justify-end gap-4">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.back()}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={saving || !selectedPlatform || uploadingMedia}>
                                        {saving ? (
                                            <>
                                                <Loader2 className="size-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="size-4 mr-2" />
                                                Create Post
                                            </>
                                        )}
                                    </Button>

                                    {/* Preview Button - Opens Modal */}
                                    {/* <Dialog>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="secondary" disabled={!selectedPlatform}>
                                                <Eye className="size-4 mr-2" />
                                                Preview
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    {selectedPlatform && (() => {
                                                        const Icon = getPlatformIcon(selectedPlatform);
                                                        return <Icon className="size-5" />;
                                                    })()}
                                                    Post Preview
                                                </DialogTitle>
                                                <DialogDescription>
                                                    See how your post will look on {selectedPlatform?.charAt(0)}{selectedPlatform?.slice(1).toLowerCase()}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="mt-4">
                                                <PostPreview
                                                    platforms={selectedPlatform ? [selectedPlatform] : []}
                                                    subject={subject}
                                                    message={message}
                                                    mediaUrls={mediaUrls}
                                                    thumbnailUrl={thumbnailUrl}
                                                    isReel={isReel}
                                                    user={{
                                                        name: user?.fullName || user?.firstName || 'User',
                                                        image: user?.imageUrl
                                                    }}
                                                />
                                            </div>
                                        </DialogContent>
                                    </Dialog> */}
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            {/* AI Content Assistant */}
            <AIContentAssistant
                open={showAIAssistant}
                onOpenChange={setShowAIAssistant}
                onInsertContent={(content, subject) => {
                    setMessage(content);
                    if (subject) setSubject(subject);
                }}
                onInsertImage={(url) => setMediaUrls(prev => [...prev, url])}
                context={{
                    platform: selectedPlatform || undefined,
                    existingContent: message,
                }}
            />
        </div>
    );
}


