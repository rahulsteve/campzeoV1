import { cookies } from "next/headers";

/**
 * Check if the current session is an admin impersonation session
 * @returns Promise<boolean> - true if admin is impersonating, false otherwise
 */
export async function isAdminImpersonating(): Promise<boolean> {
    const cookieStore = await cookies();
    const adminImpersonation = cookieStore.get("admin_impersonation");
    return adminImpersonation?.value === "true";
}

/**
 * Constants for admin impersonation
 */
export const ADMIN_IMPERSONATION_COOKIE = "admin_impersonation";
export const ADMIN_IMPERSONATION_MAX_AGE = 3600; // 1 hour in seconds
