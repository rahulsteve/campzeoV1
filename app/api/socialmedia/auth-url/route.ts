import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const platform = searchParams.get("platform");

        if (!platform) {
            return NextResponse.json({ error: "Platform is required" }, { status: 400 });
        }

        // Get config from DB
        const clientIdConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key: `${platform}_CLIENT_ID` }
        });

        const redirectUriConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key: `${platform}_REDIRECT_URI` }
        });

        // Fallback or default redirect URI if not set
        const redirectUri = redirectUriConfig?.value || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth-callback`;

        if (!clientIdConfig?.value) {
            return NextResponse.json({ error: `Configuration for ${platform} is missing (Client ID)` }, { status: 404 });
        }

        let authUrl = "";
        const state = `${platform}_${userId}`; // Simple state to pass platform and user. In production, sign this.

        switch (platform) {
            case "FACEBOOK":
            case "INSTAGRAM": // Instagram Graph API uses Facebook Login
                authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientIdConfig.value}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish`;
                break;
            case "LINKEDIN":
                authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientIdConfig.value}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social,r_basicprofile,w_organization_social,r_organization_social,rw_organization_admin`;
                break;
            case "YOUTUBE":
                authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientIdConfig.value}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly&access_type=offline&prompt=consent`;
                break;
            case "PINTEREST":
                authUrl = `https://www.pinterest.com/oauth/?client_id=${clientIdConfig.value}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&scope=boards:read,boards:write,pins:read,pins:write`;
                break;
            default:
                return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
        }

        console.log("🔵 OAuth URL Generated:", {
            platform,
            userId: userId.substring(0, 10) + "...",
            redirectUri,
            hasClientId: !!clientIdConfig.value,
            state,
        });

        return NextResponse.json({ url: authUrl });
    } catch (error) {
        console.error("Error generating auth URL:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
