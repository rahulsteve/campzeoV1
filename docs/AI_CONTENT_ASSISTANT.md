# AI Content Assistant - Setup Guide

## Quick Start

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 2. Add to Environment Variables

Add this line to your `.env` file:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Restart Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

## Usage

### Accessing the AI Assistant

1. Navigate to any campaign post edit page
2. Look for the **floating Sparkles icon** (✨) in the bottom-right corner of the message textarea
3. Click the icon to open the AI Content Assistant dialog

### Generating Text Content

1. **Quick Suggestions**: Click any suggestion badge for instant generation
2. **Custom Prompts**: Type your own request in the input field
3. **Platform-Aware**: AI automatically adjusts tone based on selected platform
4. **Refinement**: Continue the conversation to refine the generated content

**Example Prompts:**
- "Create an engaging LinkedIn post about our new product launch"
- "Make this message more professional"
- "Add emojis and make it fun for Instagram"
- "Shorten this to under 160 characters for SMS"

### Generating Image Prompts

1. Switch to the "Image Prompt" tab
2. Describe the image you want
3. Click "Generate Image Prompt"
4. Copy the optimized prompt
5. Use it with DALL-E, Midjourney, or Stable Diffusion

**Example:**
- Input: "A modern tech product on a clean background"
- Output: Detailed professional prompt optimized for image generation

### Platform-Specific Features

The AI automatically adapts to your selected platform:

| Platform | AI Behavior |
|----------|-------------|
| **Email** | Professional format with subject line |
| **SMS** | Concise, under 160 characters |
| **WhatsApp** | Casual, friendly with emojis |
| **Facebook** | Engaging, conversational (1-2 paragraphs) |
| **Instagram** | Short, catchy with hashtags |
| **LinkedIn** | Professional, business-focused |
| **YouTube** | Compelling descriptions with keywords |
| **Pinterest** | Descriptive and inspiring |

## Features

### ✨ Smart Features

- **Context Awareness**: AI knows your platform and existing content
- **Chat History**: Continue conversations to refine content
- **Quick Actions**: Insert, Copy, or Apply generated content
- **Platform Suggestions**: Get platform-specific prompt ideas
- **Real-time Generation**: Fast responses (typically 2-5 seconds)

### 🎯 Use Cases

1. **Writer's Block**: Get started with AI-generated drafts
2. **Content Refinement**: Improve existing messages
3. **Tone Adjustment**: Change from casual to professional (or vice versa)
4. **Platform Optimization**: Adapt content for different platforms
5. **Idea Generation**: Brainstorm creative angles
6. **Image Planning**: Create detailed image prompts

## Tips for Best Results

### Writing Effective Prompts

✅ **Good Prompts:**
- "Create a professional LinkedIn post announcing our Q4 results with a positive tone"
- "Make this message more engaging and add 3 relevant emojis"
- "Shorten this email to 2 paragraphs while keeping the key points"

❌ **Avoid:**
- "Make it better" (too vague)
- Single words without context
- Extremely long prompts (keep under 200 words)

### Iterative Refinement

1. Start with a basic prompt
2. Review the generated content
3. Use follow-up prompts like:
   - "Make it shorter"
   - "Add more details about [topic]"
   - "Change the tone to be more [casual/professional/friendly]"

### Platform Selection

Always select your platform **before** opening the AI assistant for best results. The AI uses this context to generate appropriate content.

## Troubleshooting

### "API key not configured" Error

**Solution**: Make sure you've added `GEMINI_API_KEY` to your `.env` file and restarted the dev server.

### Slow Generation

**Possible causes:**
- Network latency
- Complex prompts
- API rate limiting

**Solutions:**
- Simplify your prompt
- Wait a few seconds and try again
- Check your internet connection

### Content Not Inserting

**Solution**: 
- Make sure you click the "Insert" button (not just "Copy")
- Check that the dialog closes after insertion
- Verify the content appears in the textarea

### Image Generation Not Working

**Note**: The current implementation generates optimized image **prompts**, not actual images. You'll need to:
1. Copy the generated prompt
2. Use it with an image generation service (DALL-E, Midjourney, etc.)
3. Upload the generated image to your post

## API Limits

### Gemini API Free Tier

- **60 requests per minute**
- **1,500 requests per day**
- **1 million tokens per month**

For production use, consider:
- Implementing rate limiting
- Monitoring usage
- Upgrading to paid tier if needed

## Security Notes

- ✅ API key is stored server-side only
- ✅ User authentication required
- ✅ Prompts are not logged or stored
- ✅ Generated content is session-only (not persisted)

## Support

### Common Questions

**Q: Can I use this for all post types?**
A: Yes! The AI assistant works with Email, SMS, WhatsApp, and all social media platforms.

**Q: Does it remember previous conversations?**
A: Chat history persists during your current session but resets when you close the dialog.

**Q: Can it generate images directly?**
A: Currently, it generates optimized prompts for image generation services. Direct image generation may be added in future updates.

**Q: Is my data private?**
A: Yes, prompts are sent to Gemini API but not stored in our database.

---

**Created**: December 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
