# Campaign Posts Scheduler

## Overview

The Campaign Posts Scheduler is an automated system that checks for scheduled campaign posts and sends them at the appropriate time. It supports multiple platforms including Email, SMS, WhatsApp, and social media (Facebook, Instagram, LinkedIn, YouTube, Pinterest).

## Features

- ✅ **Automated Scheduling**: Runs every 5 minutes to check for due posts
- ✅ **Multi-Platform Support**: Email, SMS, WhatsApp, Facebook, Instagram, LinkedIn, YouTube, Pinterest
- ✅ **Variable Replacement**: Personalizes messages with contact data ({{name}}, {{email}}, {{phone}})
- ✅ **Error Handling**: Creates notifications for successful and failed sends
- ✅ **Transaction Logging**: Records social media posts in PostTransaction table
- ✅ **Batch Processing**: Sends to all campaign contacts automatically

## Architecture

### Components

1. **Scheduler API** (`/api/scheduler/campaign-posts/route.ts`)
   - Main endpoint that processes scheduled posts
   - Called by Vercel Cron every 5 minutes
   - Handles authentication and authorization

2. **Messaging Helpers** (`/lib/messaging.ts`)
   - Wrapper functions for email, SMS, and WhatsApp
   - Provides consistent interface for the scheduler

3. **Platform Integrations**
   - Email: Mailgun (`/lib/email.ts`)
   - SMS/WhatsApp: Twilio (`/lib/twilio.ts`)
   - LinkedIn: Custom integration (`/lib/linkedin.ts`)
   - Facebook, Instagram, YouTube, Pinterest: To be implemented

## How It Works

### 1. Cron Job Configuration

The scheduler is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/scheduler/campaign-posts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This runs the scheduler every 5 minutes.

### 2. Post Processing Flow

```
1. Cron triggers → /api/scheduler/campaign-posts
2. Authenticate request (Bearer token)
3. Query database for due posts:
   - isPostSent = false
   - scheduledPostTime <= now
   - isAttachedToCampaign = true
4. For each post:
   a. Determine platform type
   b. Get campaign contacts
   c. Send to all contacts (or publish for social media)
   d. Mark as sent
   e. Create notification
5. Return results summary
```

### 3. Message Personalization

Messages support variable replacement:

- `{{name}}` → Contact's name
- `{{email}}` → Contact's email
- `{{phone}}` → Contact's mobile number
- `{{mobile}}` → Contact's mobile number
- `{{whatsapp}}` → Contact's WhatsApp number

Example:
```
"Hello {{name}}, your appointment is confirmed!"
→ "Hello John Doe, your appointment is confirmed!"
```

## Setup Instructions

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Cron Secret (for authentication)
CRON_SECRET=your-secure-random-secret-key

# Email (Mailgun)
# These are stored in AdminPlatformConfiguration table:
# - MAILGUN_API_KEY
# - MAILGUN_DOMAIN
# - MAILGUN_FROM_EMAIL

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# App URL
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

### 2. Database Configuration

The scheduler uses the following database models:

- `CampaignPost`: Stores post data and scheduling info
- `Campaign`: Links posts to campaigns and contacts
- `Contact`: Recipient information
- `Notification`: Success/failure notifications
- `PostTransaction`: Social media post tracking

### 3. Vercel Deployment

1. Deploy to Vercel
2. Vercel automatically configures the cron job from `vercel.json`
3. Set environment variables in Vercel dashboard
4. The scheduler will start running automatically

### 4. Local Testing

To test the scheduler locally:

```bash
# Set CRON_SECRET in .env
CRON_SECRET=test-secret-key

# Make a request to the scheduler
curl -X GET http://localhost:3000/api/scheduler/campaign-posts \
  -H "Authorization: Bearer test-secret-key"
```

## API Reference

### GET /api/scheduler/campaign-posts

Processes all scheduled posts that are due.

**Headers:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-12-08T10:00:00.000Z",
  "results": {
    "total": 10,
    "processed": 8,
    "failed": 2,
    "errors": [
      {
        "postId": 123,
        "error": "Invalid email address"
      }
    ]
  }
}
```

## Platform-Specific Details

### Email
- Uses Mailgun API
- Supports HTML content
- Sender email from `senderEmail` field or default
- Creates notification on success/failure

### SMS
- Uses Twilio API
- Text-only messages
- Sends to `contactMobile`
- Character limit: 160 (standard SMS)

### WhatsApp
- Uses Twilio WhatsApp API
- Supports text and media
- Sends to `contactWhatsApp` or `contactMobile`
- Media support: Images, videos, documents

### LinkedIn
- Uses LinkedIn API
- Supports text and media
- Requires user's LinkedIn access token
- Creates PostTransaction record

### Facebook, Instagram, YouTube, Pinterest
- Integration placeholders created
- To be implemented with respective APIs
- Requires user authentication tokens

## Monitoring

### Notifications

The scheduler creates notifications for each post:

**Success:**
```
message: "Scheduled EMAIL post sent successfully"
isSuccess: true
type: "CAMPAIGN_POST"
platform: "EMAIL"
```

**Failure:**
```
message: "Failed to send scheduled SMS post: Invalid phone number"
isSuccess: false
type: "CAMPAIGN_POST"
platform: "SMS"
```

### Logs

Check Vercel logs for detailed execution information:
- `[Scheduler] Running at {timestamp}`
- `[Scheduler] Found {count} posts to process`
- `[Scheduler] Processing post {id} ({type})`
- `[Scheduler] Completed. Processed: {n}, Failed: {n}`

## Troubleshooting

### Posts Not Sending

1. **Check cron job is running:**
   - Go to Vercel dashboard → Project → Cron Jobs
   - Verify the job is enabled and running

2. **Verify CRON_SECRET:**
   - Ensure it's set in Vercel environment variables
   - Must match the value in the Authorization header

3. **Check post status:**
   ```sql
   SELECT * FROM "CampaignPost" 
   WHERE "isPostSent" = false 
   AND "scheduledPostTime" <= NOW();
   ```

4. **Review notifications:**
   ```sql
   SELECT * FROM "Notification" 
   WHERE "type" = 'CAMPAIGN_POST' 
   ORDER BY "createdAt" DESC;
   ```

### Email Not Sending

1. Check Mailgun configuration in `AdminPlatformConfiguration`
2. Verify API key and domain are correct
3. Check Mailgun dashboard for delivery logs

### SMS/WhatsApp Not Sending

1. Verify Twilio credentials
2. Check phone number format (+1234567890)
3. Ensure Twilio account has sufficient balance
4. Check Twilio console for error logs

### Social Media Not Posting

1. Verify user has connected their account
2. Check access token is valid and not expired
3. Review platform-specific API limits
4. Check user permissions for posting

## Future Enhancements

- [ ] Implement Facebook posting
- [ ] Implement Instagram posting
- [ ] Implement YouTube video upload
- [ ] Implement Pinterest pin creation
- [ ] Add retry mechanism for failed posts
- [ ] Add rate limiting per platform
- [ ] Add scheduling preview
- [ ] Add bulk scheduling
- [ ] Add post analytics
- [ ] Add A/B testing support

## Security Considerations

1. **Authentication**: All scheduler requests must include valid Bearer token
2. **Rate Limiting**: Consider implementing rate limits per platform
3. **Data Privacy**: Ensure contact data is handled securely
4. **Token Storage**: Social media tokens are encrypted in database
5. **Error Logging**: Sensitive data is not logged in errors

## Support

For issues or questions:
1. Check the logs in Vercel dashboard
2. Review notifications in the database
3. Test the scheduler endpoint manually
4. Contact the development team

---

**Last Updated**: December 2024
**Version**: 1.0.0
