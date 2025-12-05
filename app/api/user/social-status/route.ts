import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const status: any = {};

        // Helper to fetch with timeout
        const fetchWithTimeout = async (url: string, options: any = {}, timeout = 3000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        // Facebook
        if (dbUser.facebookAccessToken) {
            try {
                const res = await fetchWithTimeout(`https://graph.facebook.com/me?fields=name&access_token=${dbUser.facebookAccessToken}`);
                if (res.ok) {
                    const data = await res.json();
                    status.facebook = { connected: true, name: data.name };
                } else {
                    status.facebook = { connected: true, name: "Connected (Error fetching name)" };
                }
            } catch (e) {
                status.facebook = { connected: true, name: "Connected" };
            }
        } else {
            status.facebook = { connected: false };
        }

        // Instagram (via Facebook Graph API for Business Accounts)
        if (dbUser.instagramAccessToken && dbUser.instagramUserId) {
            // Skip if no business account
            if (dbUser.instagramUserId === 'no-business-account') {
                status.instagram = { connected: true, name: "No Business Account" };
            } else {
                try {
                    // Use Facebook Graph API with the Instagram Business Account ID
                    const res = await fetchWithTimeout(
                        `https://graph.facebook.com/v18.0/${dbUser.instagramUserId}?fields=username,name&access_token=${dbUser.instagramAccessToken}`
                    );
                    if (res.ok) {
                        const data = await res.json();
                        // Prefer username, fallback to name
                        const displayName = data.username ? `@${data.username}` : data.name || "Connected";
                        status.instagram = { connected: true, name: displayName, username: data.username };
                    } else {
                        // Try to get error details
                        const errorData = await res.json().catch(() => ({}));
                        console.error("[Social Status] Instagram fetch error:", errorData);
                        status.instagram = { connected: true, name: "Connected" };
                    }
                } catch (e) {
                    console.error("[Social Status] Instagram error:", e);
                    status.instagram = { connected: true, name: "Connected" };
                }
            }
        } else if (dbUser.instagramAccessToken) {
            // Has token but no userId
            status.instagram = { connected: true, name: "Connected (Missing ID)" };
        } else {
            status.instagram = { connected: false };
        }

        // LinkedIn
        if (dbUser.linkedInAccessToken) {
            try {
                let name = "Connected";
                let followerCount: number | null = null;
                const urn = dbUser.linkedInAuthUrn;

                if (urn && urn.startsWith("urn:li:organization:")) {
                    const orgId = urn.split(":").pop();
                    const res = await fetchWithTimeout(`https://api.linkedin.com/v2/organizations/${orgId}`, {
                        headers: {
                            Authorization: `Bearer ${dbUser.linkedInAccessToken}`,
                            "X-Restli-Protocol-Version": "2.0.0"
                        }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        name = data.localizedName;
                    }

                    // Fetch followers
                    try {
                        const followersRes = await fetchWithTimeout(`https://api.linkedin.com/v2/networkSizes/${urn}?edgeType=CompanyFollowedByMember`, {
                            headers: {
                                Authorization: `Bearer ${dbUser.linkedInAccessToken}`,
                                "X-Restli-Protocol-Version": "2.0.0"
                            }
                        });
                        if (followersRes.ok) {
                            const followersData = await followersRes.json();
                            followerCount = followersData.firstDegreeSize;
                        }
                    } catch (e) {
                        console.error("Error fetching followers", e);
                    }
                } else {
                    // Default to profile
                    const res = await fetchWithTimeout(`https://api.linkedin.com/v2/me`, {
                        headers: { Authorization: `Bearer ${dbUser.linkedInAccessToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const firstName = data.localizedFirstName;
                        const lastName = data.localizedLastName;
                        name = `${firstName} ${lastName}`;
                    }
                }
                status.linkedin = { connected: true, name, followerCount };
            } catch (e) {
                status.linkedin = { connected: true, name: "Connected" };
            }
        } else {
            status.linkedin = { connected: false };
        }

        // YouTube
        if (dbUser.youtubeAccessToken) {
            try {
                const res = await fetchWithTimeout(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`, {
                    headers: { Authorization: `Bearer ${dbUser.youtubeAccessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const title = data.items?.[0]?.snippet?.title;
                    status.youtube = { connected: true, name: title || "Connected" };
                } else {
                    status.youtube = { connected: true, name: "Connected" };
                }
            } catch (e) {
                status.youtube = { connected: true, name: "Connected" };
            }
        } else {
            status.youtube = { connected: false };
        }

        // Pinterest
        if (dbUser.pinterestAccessToken) {
            try {
                const res = await fetchWithTimeout(`https://api.pinterest.com/v5/user_account`, {
                    headers: { Authorization: `Bearer ${dbUser.pinterestAccessToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    status.pinterest = { connected: true, name: data.username };
                } else {
                    status.pinterest = { connected: true, name: "Connected" };
                }
            } catch (e) {
                status.pinterest = { connected: true, name: "Connected" };
            }
        } else {
            status.pinterest = { connected: false };
        }

        return NextResponse.json(status);
    } catch (error) {
        console.error("Error fetching social status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
