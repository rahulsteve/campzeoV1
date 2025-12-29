import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCampaignPost } from '@/lib/send-campaign-post';

/**
 * SCHEDULER FUNCTIONALITY - CURRENTLY DISABLED
 * 
 * This scheduler API is commented out to use manual sharing instead.
 * The cron job functionality for automatic post scheduling is disabled.
 * 
 * To re-enable:
 * 1. Uncomment the GET function below
 * 2. Set up a cron job to call this endpoint
 * 3. Configure CRON_SECRET environment variable
 * 
 * Scheduler API to check and send scheduled campaign posts
 * This endpoint should be called by a cron job (e.g., every 5 minutes)
 * 
 * GET /api/scheduler/campaign-posts
 */


export async function GET(request: NextRequest) {
    try {
        // 1. Check if scheduler is enabled in settings
        const jobSetting = await prisma.jobSetting.findFirst({
            where: { jobId: 'campaign-post-scheduler' }
        });

        if (!jobSetting || !jobSetting.isEnabled) {
            return NextResponse.json(
                {
                    error: 'Scheduler disabled',
                    message: 'Automatic scheduling is currently disabled in admin settings.'
                },
                { status: 503 }
            );
        }

        // 2. Verify the request is from a trusted source (cron job)
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        console.log(`[Scheduler] Running at ${now.toISOString()}`);

        // 3. Find all scheduled posts that are due to be sent
        const scheduledPosts = await prisma.campaignPost.findMany({
            where: {
                isPostSent: false,
                scheduledPostTime: {
                    lte: now, // Posts scheduled for now or earlier
                },
                isAttachedToCampaign: true,
                isDeleted: false,
            },
            include: {
                campaign: {
                    include: {
                        organisation: true,
                    },
                },
            },
        });

        console.log(`[Scheduler] Found ${scheduledPosts.length} posts to process`);

        const results = {
            total: scheduledPosts.length,
            processed: 0,
            failed: 0,
            errors: [] as any[],
        };

        // 4. Process each scheduled post
        for (const post of scheduledPosts) {
            try {
                console.log(`[Scheduler] Processing post ${post.id} (${post.type})`);

                // Use the shared sendCampaignPost function
                const result = await sendCampaignPost(post);

                if (result.success) {
                    // Update post status
                    await prisma.campaignPost.update({
                        where: { id: post.id },
                        data: { isPostSent: true }
                    });

                    // Create success notification
                    await prisma.notification.create({
                        data: {
                            message: `Scheduled ${post.type} post sent successfully`,
                            isSuccess: true,
                            type: 'CAMPAIGN_POST',
                            platform: post.type,
                            campaignId: post.campaignId,
                            organisationId: post.campaign?.organisationId,
                            referenceId: post.id,
                        },
                    });

                    results.processed++;
                    console.log(`[Scheduler] Post ${post.id} sent successfully`);
                } else {
                    results.failed++;
                    results.errors.push({
                        postId: post.id,
                        error: result.error || 'Unknown error',
                    });

                    // Create error notification
                    await prisma.notification.create({
                        data: {
                            message: `Failed to send scheduled ${post.type} post: ${result.error || 'Unknown error'}`,
                            isSuccess: false,
                            type: 'CAMPAIGN_POST',
                            platform: post.type,
                            campaignId: post.campaignId,
                            organisationId: post.campaign?.organisationId,
                            referenceId: post.id,
                        },
                    });
                }
            } catch (error) {
                console.error(`[Scheduler] Error processing post ${post.id}:`, error);
                results.failed++;
                results.errors.push({
                    postId: post.id,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        console.log(`[Scheduler] Completed. Processed: ${results.processed}, Failed: ${results.failed}`);

        return NextResponse.json({
            success: true,
            timestamp: now.toISOString(),
            results,
        });
    } catch (error) {
        console.error('[Scheduler] Fatal error:', error);
        return NextResponse.json(
            {
                error: 'Scheduler failed',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

