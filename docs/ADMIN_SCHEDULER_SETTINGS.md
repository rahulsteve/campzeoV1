# Scheduler Settings in Admin Dashboard

## Overview

Added comprehensive scheduler configuration settings to the Admin Dashboard's System Settings tab. This allows administrators to monitor and control the Campaign Posts Scheduler directly from the admin interface.

## What Was Added

### Location
**Admin Dashboard** → **System Settings Tab** (Job Settings)

### New Scheduler Settings Card

A full-width card with three columns containing:

#### 1. **Status Column**
- **Scheduler Status Badge**: Shows "Active" in green
- **Schedule Information**: Displays "Runs every 5 minutes via Vercel Cron"
- **Cron Expression**: Shows the cron schedule `*/5 * * * *`

#### 2. **Cron Secret Column**
- **Secret Input Field**: Read-only password field showing the current CRON_SECRET
- **Copy Button**: One-click copy to clipboard
- **Helper Text**: Instructions to set this in environment variables

#### 3. **Actions Column**
- **Run Now Button**: Manually trigger the scheduler immediately
  - Shows loading toast while running
  - Displays results (processed/failed counts)
  - Handles errors gracefully
- **Advanced Settings Button**: Opens `/admin/scheduler` in new tab
  - Links to the dedicated scheduler monitoring page

## Features

### 🎯 **Manual Trigger**
```typescript
// Calls the scheduler API with proper authentication
const res = await fetch('/api/scheduler/campaign-posts', {
  headers: {
    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
  }
});
```

### 🔐 **Secret Management**
- Displays the current CRON_SECRET from environment
- One-click copy for easy configuration
- Read-only to prevent accidental changes

### 📊 **Status Monitoring**
- Visual status indicator (Active badge)
- Schedule information
- Cron expression display

### 🔗 **Quick Access**
- Direct link to advanced scheduler page
- Opens in new tab for convenience

## UI Design

### Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Campaign Posts Scheduler                                    │
│ Configure and monitor the automated post scheduler          │
├─────────────────┬─────────────────┬─────────────────────────┤
│ Status          │ Cron Secret     │ Actions                 │
│                 │                 │                         │
│ ● Active        │ [password]      │ [▶ Run Now]            │
│ Every 5 min     │ [Copy]          │ [⚙ Advanced]           │
│ */5 * * * *     │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
```

### Responsive Design
- **Desktop**: 3 columns side-by-side
- **Mobile**: Stacks vertically

## Usage

### For Administrators

1. **View Status**
   - Navigate to Admin Dashboard → System Settings
   - Scroll to "Campaign Posts Scheduler" card
   - Check the status badge and schedule

2. **Test Scheduler**
   - Click "Run Now" button
   - Wait for toast notification
   - Review results (processed/failed counts)

3. **Copy Secret**
   - Click "Copy" button next to cron secret
   - Paste into Vercel environment variables
   - Set as `CRON_SECRET`

4. **Advanced Monitoring**
   - Click "Advanced" button
   - Opens detailed scheduler page
   - View execution history and detailed logs

## Integration

### Environment Variables Required
```bash
# In .env.local (for local testing)
NEXT_PUBLIC_CRON_SECRET=your-secret-key-here

# In Vercel (for production)
CRON_SECRET=your-secret-key-here
```

### API Endpoint
```
GET /api/scheduler/campaign-posts
Authorization: Bearer {CRON_SECRET}
```

### Response Format
```json
{
  "success": true,
  "timestamp": "2024-12-08T10:00:00.000Z",
  "results": {
    "total": 10,
    "processed": 8,
    "failed": 2,
    "errors": [...]
  }
}
```

## Code Changes

### Files Modified
1. **`app/admin/page.tsx`**
   - Added `Play` icon import
   - Added scheduler settings card
   - Added manual trigger handler

### New Functionality
```typescript
// Manual trigger with authentication
onClick={async () => {
  try {
    toast.loading('Running scheduler...');
    const res = await fetch('/api/scheduler/campaign-posts', {
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET}`
      }
    });
    const data = await res.json();
    toast.dismiss();
    
    if (res.ok && data.success) {
      toast.success(`Processed: ${data.results?.processed}, Failed: ${data.results?.failed}`);
    } else {
      toast.error(data.error || 'Scheduler failed');
    }
  } catch (error) {
    toast.dismiss();
    toast.error('Failed to run scheduler');
  }
}}
```

## Benefits

### ✅ **Centralized Control**
- All scheduler settings in one place
- No need to navigate to separate pages

### ✅ **Quick Testing**
- Test scheduler without waiting for cron
- Immediate feedback on results

### ✅ **Easy Configuration**
- Copy secret with one click
- Clear instructions for setup

### ✅ **Visual Feedback**
- Status badge shows at a glance
- Toast notifications for all actions

## Screenshots

### Desktop View
```
┌──────────────────────────────────────────────────────────┐
│ System Settings                                          │
├──────────────────────────────────────────────────────────┤
│ ┌─────────────────┐  ┌─────────────────┐               │
│ │ Job Settings    │  │ Message Center  │               │
│ └─────────────────┘  └─────────────────┘               │
│                                                          │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Campaign Posts Scheduler                           │  │
│ │ [Status] [Cron Secret] [Actions]                   │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## Next Steps

### Potential Enhancements
1. **Real-time Status**: Show last run time and next scheduled run
2. **Execution History**: Display recent runs in a table
3. **Statistics**: Show total posts processed today/week/month
4. **Error Logs**: Display recent errors inline
5. **Schedule Editor**: Allow changing cron schedule from UI
6. **Enable/Disable**: Toggle scheduler on/off

### Monitoring
- Check Vercel logs for cron executions
- Review notifications in database
- Monitor success/failure rates

---

**Added**: December 2024  
**Location**: Admin Dashboard → System Settings  
**Status**: ✅ Complete and Ready to Use
