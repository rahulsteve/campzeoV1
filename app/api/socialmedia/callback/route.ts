import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        if (error) {
            return NextResponse.redirect(new URL("/organisation/settings?error=" + error, request.url));
        }

        if (!code || !state) {
            return NextResponse.redirect(new URL("/organisation/settings?error=missing_params", request.url));
        }

        const platform = state.split("_")[0];
        const stateUserId = state.substring(platform.length + 1);

        if (!stateUserId) {
            return NextResponse.redirect(new URL("/organisation/settings?error=invalid_state", request.url));
        }

        let user = await prisma.user.findUnique({
            where: { clerkId: stateUserId }
        });

        if (!user) {
            try {
                const { clerkClient } = await import("@clerk/nextjs/server");
                const client = await clerkClient();
                const clerkUser = await client.users.getUser(stateUserId);

                if (!clerkUser) {
                    return NextResponse.redirect(new URL("/organisation/settings?error=user_not_found", request.url));
                }

                user = await prisma.user.create({
                    data: {
                        clerkId: stateUserId,
                        email: clerkUser.emailAddresses[0]?.emailAddress || "",
                        firstName: clerkUser.firstName,
                        lastName: clerkUser.lastName,
                        role: "ORGANISATION_USER",
                    },
                });
            } catch (createError: any) {
                return NextResponse.redirect(new URL("/organisation/settings?error=user_creation_failed", request.url));
            }
        }

        const clientIdConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key: `${platform}_CLIENT_ID` }
        });
        const clientSecretConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key: `${platform}_CLIENT_SECRET` }
        });
        const redirectUriConfig = await prisma.adminPlatformConfiguration.findFirst({
            where: { key: `${platform}_REDIRECT_URI` }
        });

        const redirectUri = redirectUriConfig?.value || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth-callback`;

        if (!clientIdConfig?.value || !clientSecretConfig?.value) {
            return NextResponse.redirect(new URL("/organisation/settings?error=config_missing", request.url));
        }

        let accessToken = "";
        let refreshToken = "";
        let expiresIn = 0;

        if (platform === "FACEBOOK" || platform === "INSTAGRAM") {
            const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientIdConfig.value}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecretConfig.value}&code=${code}`;
            const res = await fetch(tokenUrl);
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            accessToken = data.access_token;
            expiresIn = data.expires_in;
        } else if (platform === "LINKEDIN") {
            const tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
            const params = new URLSearchParams();
            params.append("grant_type", "authorization_code");
            params.append("code", code);
            params.append("redirect_uri", redirectUri);
            params.append("client_id", clientIdConfig.value);
            params.append("client_secret", clientSecretConfig.value);

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error_description);
            accessToken = data.access_token;
            expiresIn = data.expires_in;
        } else if (platform === "YOUTUBE") {
            const tokenUrl = "https://oauth2.googleapis.com/token";
            const params = new URLSearchParams();
            params.append("code", code);
            params.append("client_id", clientIdConfig.value);
            params.append("client_secret", clientSecretConfig.value);
            params.append("redirect_uri", redirectUri);
            params.append("grant_type", "authorization_code");

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error_description);
            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            expiresIn = data.expires_in;
        } else if (platform === "PINTEREST") {
            const tokenUrl = "https://api.pinterest.com/v5/oauth/token";
            const authHeader = Buffer.from(`${clientIdConfig.value}:${clientSecretConfig.value}`).toString('base64');
            const params = new URLSearchParams();
            params.append("grant_type", "authorization_code");
            params.append("code", code);
            params.append("redirect_uri", redirectUri);

            const res = await fetch(tokenUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Basic ${authHeader}`,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: params,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.message);
            accessToken = data.access_token;
            refreshToken = data.refresh_token;
            expiresIn = data.expires_in;
        }

        const updateData: any = {};
        if (platform === "FACEBOOK") {
            updateData.facebookAccessToken = accessToken;
            updateData.facebookTokenExpiresIn = expiresIn;
            updateData.facebookTokenCreatedAt = new Date();

            try {
                const meRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
                const meData = await meRes.json();
                if (meData.id) {
                    updateData.facebookUserId = meData.id;
                }
            } catch (e) {
                console.error("Failed to fetch Facebook User ID", e);
            }
        } else if (platform === "INSTAGRAM") {
            updateData.instagramAccessToken = accessToken;
            updateData.instagramTokenExpiresIn = expiresIn;
            updateData.instagramTokenCreatedAt = new Date();

            try {
                const meRes = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
                const meData = await meRes.json();
                if (meData.id) {
                    updateData.instagramUserId = meData.id;
                }
            } catch (e) {
                console.error("Failed to fetch Instagram User ID", e);
            }
        } else if (platform === "LINKEDIN") {
            updateData.linkedInAccessToken = accessToken;
            try {
                const profileRes = await fetch("https://api.linkedin.com/v2/me", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const profileData = await profileRes.json();
                if (profileData.id) {
                    updateData.linkedInAuthUrn = `urn:li:person:${profileData.id}`;
                }
            } catch (e) {
                console.error("Failed to fetch LinkedIn Profile", e);
            }
        } else if (platform === "YOUTUBE") {
            updateData.youtubeAccessToken = accessToken;
            if (refreshToken) {
                updateData.youtubeAuthUrn = refreshToken;
            }
        } else if (platform === "PINTEREST") {
            updateData.pinterestAccessToken = accessToken;
            if (refreshToken) {
                updateData.pinterestAuthUrn = refreshToken;
            }
        }

        await prisma.user.update({
            where: { clerkId: stateUserId },
            data: updateData,
        });

        return NextResponse.redirect(new URL("/organisation/settings?success=connected", request.url));
    } catch (error) {
        console.error("Error in callback:", error);
        return NextResponse.redirect(new URL("/organisation/settings?error=connection_failed", request.url));
    }
}
