import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define which routes are protected
const isProtectedRoute = createRouteMatcher([
    "/dashboard(.*)",
    "/profile(.*)",
    "/organisation(.*)",
    "/admin(.*)",
]);

// Define organization routes that need special handling for impersonation
const isOrganisationRoute = createRouteMatcher([
    "/organisation(.*)",
]);

// Make the function handling the middleware async
export default clerkMiddleware(async (auth, req) => {
    // If the request matches a protected route, protect it
    if (isProtectedRoute(req)) {
        // Use auth.protect() directly as a method
        await auth.protect();

        // Check if this is an organization route and if admin is impersonating
        if (isOrganisationRoute(req)) {
            // Check for admin impersonation cookie
            const adminImpersonation = req.cookies.get('admin_impersonation');

            if (adminImpersonation?.value === 'true') {
                // Admin is impersonating - allow access to organization routes
                // The cookie will be cleared when the admin signs out or after expiry
                console.log('Admin impersonation detected - allowing organization access');
                return NextResponse.next();
            }
        }
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
