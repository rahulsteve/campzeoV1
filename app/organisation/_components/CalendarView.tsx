"use client";

import { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { format, isToday, isTomorrow } from "date-fns";
import {
    Facebook,
    Instagram,
    Linkedin,
    Twitter,
    Youtube,
    Mail,
    MessageSquare
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import "./calendar-styles.css";

interface ScheduledPost {
    id: number;
    subject: string | null;
    message: string | null;
    type: string;
    scheduledPostTime: string | Date;
    mediaUrls: string[];
    campaign: {
        name: string;
    } | null;
}

interface CalendarViewProps {
    posts: ScheduledPost[];
}

const getPlatformIcon = (type: string, className = "w-3 h-3") => {
    switch (type) {
        case "FACEBOOK": return <Facebook className={className} />;
        case "INSTAGRAM": return <Instagram className={className} />;
        case "LINKEDIN": return <Linkedin className={className} />;
        case "TWITTER": return <Twitter className={className} />;
        case "YOUTUBE": return <Youtube className={className} />;
        case "EMAIL": return <Mail className={className} />;
        case "SMS": return <MessageSquare className={className} />;
        default: return <Mail className={className} />;
    }
};

const getPlatformConfig = (type: string) => {
    const configs: Record<string, { bgColor: string; textColor: string; brandColor: string }> = {
        FACEBOOK: { bgColor: "bg-orange-100", textColor: "text-orange-600", brandColor: "#ea580c" },
        INSTAGRAM: { bgColor: "bg-yellow-100", textColor: "text-yellow-600", brandColor: "#ca8a04" },
        LINKEDIN: { bgColor: "bg-cyan-100", textColor: "text-cyan-600", brandColor: "#0891b2" },
        TWITTER: { bgColor: "bg-blue-100", textColor: "text-blue-600", brandColor: "#2563eb" },
        YOUTUBE: { bgColor: "bg-red-100", textColor: "text-red-600", brandColor: "#dc2626" },
        EMAIL: { bgColor: "bg-purple-100", textColor: "text-purple-600", brandColor: "#9333ea" },
        SMS: { bgColor: "bg-green-100", textColor: "text-green-600", brandColor: "#16a34a" },
    };
    return configs[type] || { bgColor: "bg-gray-100", textColor: "text-gray-600", brandColor: "#6b7280" };
};

export default function CalendarView({ posts }: CalendarViewProps) {
    const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
    const [selectedPosts, setSelectedPosts] = useState<ScheduledPost[] | null>(null);
    const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

    const formattedPosts = useMemo(() => {
        return posts.map(post => ({
            ...post,
            date: new Date(post.scheduledPostTime)
        }));
    }, [posts]);

    const calendarEvents = useMemo(() => {
        // Group posts by date and platform for month view
        const groupedByDate = formattedPosts.reduce((acc, post) => {
            const dateKey = format(post.date, 'yyyy-MM-dd');
            if (!acc[dateKey]) {
                acc[dateKey] = {};
            }
            if (!acc[dateKey][post.type]) {
                acc[dateKey][post.type] = [];
            }
            acc[dateKey][post.type].push(post);
            return acc;
        }, {} as Record<string, Record<string, typeof formattedPosts>>);

        // Create events with counts
        const events: any[] = [];
        Object.entries(groupedByDate).forEach(([dateKey, platforms]) => {
            Object.entries(platforms).forEach(([platformType, posts]) => {
                const config = getPlatformConfig(platformType);
                const firstPost = posts[0];

                events.push({
                    id: `${dateKey}-${platformType}`,
                    title: posts.length > 1 ? `${posts.length}` : firstPost.subject || 'Post',
                    start: firstPost.date,
                    backgroundColor: config.brandColor,
                    borderColor: config.brandColor,
                    textColor: '#ffffff',
                    extendedProps: {
                        posts: posts,
                        platformType: platformType,
                        count: posts.length,
                        isGrouped: posts.length > 1
                    }
                });
            });
        });

        return events;
    }, [formattedPosts]);

    const upcomingPosts = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
        const endOfTomorrow = new Date(startOfTomorrow);
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

        const todayPosts = formattedPosts.filter(p => {
            const postDate = new Date(p.date);
            return postDate >= startOfToday && postDate < startOfTomorrow;
        });

        const tomorrowPosts = formattedPosts.filter(p => {
            const postDate = new Date(p.date);
            return postDate >= startOfTomorrow && postDate < endOfTomorrow;
        });

        const laterPosts = formattedPosts.filter(p => {
            const postDate = new Date(p.date);
            return postDate >= endOfTomorrow;
        });

        todayPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
        tomorrowPosts.sort((a, b) => a.date.getTime() - b.date.getTime());
        laterPosts.sort((a, b) => a.date.getTime() - b.date.getTime());

        console.log('Calendar Debug:', {
            totalPosts: formattedPosts.length,
            todayCount: todayPosts.length,
            tomorrowCount: tomorrowPosts.length,
            laterCount: laterPosts.length
        });

        return { todayPosts, tomorrowPosts, laterPosts };
    }, [formattedPosts]);

    const handleEventClick = (clickInfo: any) => {
        const posts = clickInfo.event.extendedProps.posts;
        const isGrouped = clickInfo.event.extendedProps.isGrouped;

        if (posts && posts.length > 0) {
            if (isGrouped) {
                // Show list of posts to choose from
                setSelectedPosts(posts);
            } else {
                // Show single post directly
                setSelectedPost(posts[0]);
            }
        }
    };

    const renderEventContent = (eventInfo: any) => {
        const platformType = eventInfo.event.extendedProps.platformType;
        const count = eventInfo.event.extendedProps.count || 1;
        const isGrouped = eventInfo.event.extendedProps.isGrouped;
        const config = getPlatformConfig(platformType);

        // Different rendering for month vs week/day views
        if (eventInfo.view.type === 'dayGridMonth') {
            return (
                <div className="relative inline-flex items-center justify-center">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", config.bgColor, config.textColor)}>
                        {getPlatformIcon(platformType, "w-4 h-4")}
                    </div>
                    {isGrouped && count > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold shadow-md border-2 border-white">
                            {count}
                        </div>
                    )}
                </div>
            );
        } else {
            // Week/Day view - show as colored bar with icon and title
            return (
                <div className="flex items-center gap-2 px-2 h-full">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center bg-white/20")}>
                        {getPlatformIcon(platformType, "w-3 h-3")}
                    </div>
                    <span className="text-xs font-medium truncate">
                        {eventInfo.event.title}
                    </span>
                </div>
            );
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 w-full">
            {/* Calendar Grid */}
            <div className="flex-1 bg-white rounded-lg border p-6">
                {/* View Toggle Buttons */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Schedule</h2>
                    <div className="flex gap-2">
                        <Button
                            variant={view === 'dayGridMonth' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView('dayGridMonth')}
                        >
                            Month
                        </Button>
                        <Button
                            variant={view === 'timeGridWeek' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView('timeGridWeek')}
                        >
                            Week
                        </Button>
                        <Button
                            variant={view === 'timeGridDay' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setView('timeGridDay')}
                        >
                            Day
                        </Button>
                    </div>
                </div>

                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView={view}
                    key={view}
                    headerToolbar={{
                        left: 'title',
                        center: '',
                        right: 'prev,next today'
                    }}
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    eventContent={renderEventContent}
                    height="auto"
                    dayMaxEvents={3}
                    displayEventTime={true}
                    firstDay={1}
                    fixedWeekCount={false}
                    showNonCurrentDates={true}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    allDaySlot={false}
                />
            </div>

            {/* Upcoming Sidebar */}
            <div className="w-full lg:w-96 bg-white rounded-lg border">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-lg">Upcoming</h3>
                </div>

                <ScrollArea className="h-[600px]">
                    <div className="p-4 space-y-6">
                        {/* Today */}
                        {upcomingPosts.todayPosts.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 mb-3">Today</h4>
                                <div className="space-y-3">
                                    {upcomingPosts.todayPosts.map((post) => {
                                        const config = getPlatformConfig(post.type);
                                        return (
                                            <div
                                                key={post.id}
                                                onClick={() => setSelectedPost(post)}
                                                className={cn(
                                                    "p-4 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4",
                                                    config.bgColor
                                                )}
                                                style={{ borderLeftColor: config.brandColor }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                                                            {getPlatformIcon(post.type, "w-5 h-5")}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className="font-bold text-sm">
                                                                {post.subject || "No Subject"}
                                                            </p>
                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                {format(post.date, "MMM dd, yyyy")}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">
                                                            {format(post.date, "h:mm a")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tomorrow */}
                        {upcomingPosts.tomorrowPosts.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 mb-3">Tomorrow</h4>
                                <div className="space-y-3">
                                    {upcomingPosts.tomorrowPosts.map((post) => {
                                        const config = getPlatformConfig(post.type);
                                        return (
                                            <div
                                                key={post.id}
                                                onClick={() => setSelectedPost(post)}
                                                className={cn(
                                                    "p-4 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4",
                                                    config.bgColor
                                                )}
                                                style={{ borderLeftColor: config.brandColor }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                                                            {getPlatformIcon(post.type, "w-5 h-5")}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className="font-bold text-sm">
                                                                {post.subject || "No Subject"}
                                                            </p>
                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                {format(post.date, "MMM dd, yyyy")}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">
                                                            {format(post.date, "h:mm a")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Later */}
                        {upcomingPosts.laterPosts && upcomingPosts.laterPosts.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-gray-500 mb-3">Later</h4>
                                <div className="space-y-3">
                                    {upcomingPosts.laterPosts.slice(0, 10).map((post) => {
                                        const config = getPlatformConfig(post.type);
                                        return (
                                            <div
                                                key={post.id}
                                                onClick={() => setSelectedPost(post)}
                                                className={cn(
                                                    "p-4 rounded-lg cursor-pointer transition-all hover:shadow-md border-l-4",
                                                    config.bgColor
                                                )}
                                                style={{ borderLeftColor: config.brandColor }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                                                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                                                            {getPlatformIcon(post.type, "w-5 h-5")}
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <p className="font-bold text-sm">
                                                                {post.subject || "No Subject"}
                                                            </p>
                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                {format(post.date, "MMM dd, yyyy")}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">
                                                            {format(post.date, "h:mm a")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {upcomingPosts.todayPosts.length === 0 && upcomingPosts.tomorrowPosts.length === 0 && (!upcomingPosts.laterPosts || upcomingPosts.laterPosts.length === 0) && (
                            <div className="text-center py-8 text-gray-400">
                                <p>No upcoming posts</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Post Detail Modal */}
            <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
                <DialogContent className="sm:max-w-lg">
                    {selectedPost && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedPost.subject || "Post Details"}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Platform</label>
                                    <p className="text-sm mt-1">{selectedPost.type}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Scheduled Time</label>
                                    <p className="text-sm mt-1">
                                        {format(new Date(selectedPost.scheduledPostTime), "MMMM dd, yyyy 'at' h:mm a")}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Campaign</label>
                                    <p className="text-sm mt-1">{selectedPost.campaign?.name || "No campaign"}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase">Message</label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded-lg text-sm">
                                        {selectedPost.message || "No message"}
                                    </div>
                                </div>
                                {selectedPost.mediaUrls && selectedPost.mediaUrls.length > 0 && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Media</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {selectedPost.mediaUrls.map((url, i) => (
                                                <div key={i} className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                                                    <img
                                                        src={url}
                                                        alt={`Media ${i + 1}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Posts List Modal - for grouped events */}
            <Dialog open={!!selectedPosts} onOpenChange={(open) => !open && setSelectedPosts(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Select a Post</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh]">
                        <div className="space-y-3 pr-4">
                            {selectedPosts?.map((post) => {
                                const config = getPlatformConfig(post.type);
                                return (
                                    <div
                                        key={post.id}
                                        onClick={() => {
                                            setSelectedPosts(null);
                                            setSelectedPost(post);
                                        }}
                                        className={cn(
                                            "p-4 rounded-lg cursor-pointer transition-all hover:shadow-md border border-gray-200 hover:border-gray-300",
                                            config.bgColor
                                        )}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
                                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", config.bgColor)}>
                                                    {getPlatformIcon(post.type, "w-5 h-5")}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <p className="font-bold text-sm">
                                                        {post.subject || "No Subject"}
                                                    </p>
                                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                                        {format(post.date, "h:mm a")}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-600 line-clamp-2">
                                                    {post.message || "No message"}
                                                </p>
                                                {post.campaign && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Campaign: {post.campaign.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}
