import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PLANS, formatPrice } from "@/lib/plans";
import { RazorpayButton } from "@/components/razorpay-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function SelectPlanPage() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: user.id },
        include: {
            organisation: {
                include: {
                    subscriptions: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        include: { plan: true }
                    }
                }
            }
        },
    });

    if (!dbUser || !dbUser.organisation) {
        redirect("/onboarding");
    }

    const organisation = dbUser.organisation;
    const subscription = organisation.subscriptions[0];

    const now = new Date();
    const isTrialValid = organisation.isTrial && organisation.trialEndDate && organisation.trialEndDate > now;
    const hasActiveSubscription = subscription && (subscription.status === 'COMPLETED' || subscription.status === 'active') && (!subscription.endDate || subscription.endDate > now);

    // If user has a valid plan, redirect to dashboard
    if (isTrialValid || hasActiveSubscription) {
        redirect("/organisation");
    }

    return (
        <div className="container mx-auto py-16 px-4 max-w-6xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
                <p className="text-xl text-muted-foreground">
                    Your trial has expired. Please upgrade to continue using our services.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {Object.values(PLANS).map((plan) => {
                    if (plan.id === "FREE_TRIAL") return null; // Don't show trial plan since it's expired

                    return (
                        <Card
                            key={plan.id}
                            className={`relative flex flex-col ${plan.popular ? "border-primary shadow-lg scale-105 z-10" : ""}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <Badge className="bg-primary px-3 py-1 text-sm">Most Popular</Badge>
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold">
                                        {formatPrice(plan.price, plan.currency)}
                                    </span>
                                    <span className="text-muted-foreground">/{plan.interval}</span>
                                </div>
                                <CardDescription className="mt-2">
                                    Everything you need to grow your business
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <ul className="space-y-3 mb-8 flex-1">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className="size-5 text-primary shrink-0 mt-0.5" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <RazorpayButton
                                    plan={plan.id}
                                    amount={plan.price}
                                    organizationName={organisation.name}
                                    className="w-full"
                                >
                                    <TrendingUp className="size-4 mr-2" />
                                    Upgrade to {plan.name}
                                </RazorpayButton>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-12 text-center">
                <p className="text-muted-foreground text-sm">
                    Need help? <Button variant="link" className="p-0 h-auto">Contact Support</Button>
                </p>
            </div>
        </div>
    );
}
