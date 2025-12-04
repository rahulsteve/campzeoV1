import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { OrganisationLayoutWrapper } from "./_components/organisation-layout-wrapper";
import { isAdminImpersonating } from "@/lib/admin-impersonation";

export default async function OrganisationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check for admin impersonation cookie early
  const isImpersonating = await isAdminImpersonating();

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { organisation: true },
  });

  // If user doesn't exist in DB, redirect to onboarding
  if (!dbUser) {
    redirect("/onboarding");
  }

  // If user doesn't have an organisation, redirect to onboarding
  if (!dbUser.organisationId) {
    redirect("/onboarding");
  }

  // If user is admin and NOT impersonating, redirect to admin dashboard
  // When impersonating, allow admin to access organization routes
  if (dbUser.role === "ADMIN_USER" && !isImpersonating) {
    redirect("/admin");
  }

  // Check organisation status - skip these checks when admin is impersonating
  if (!isImpersonating) {
    if (dbUser.organisation && dbUser.organisation.isDeleted) {
      redirect("/suspended");
    }

    if (dbUser.organisation && !dbUser.organisation.isApproved) {
      redirect("/pending-approval");
    }
  }

  return <OrganisationLayoutWrapper isImpersonating={isImpersonating}>{children}</OrganisationLayoutWrapper>;
}
