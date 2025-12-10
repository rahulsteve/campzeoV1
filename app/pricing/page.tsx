
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Header } from '@/components/Header';

type Plan = {
    name: string;
    price: number;
    period: string;
    description: string;
    features: string[];
    isTrial?: boolean;
    isPopular?: boolean;
    priceId?: string;
};

const plans: Plan[] = [
    {
        name: "Free Trial",
        price: 0,
        period: "14 days",
        description: "Try all features for free",
        isTrial: true,
        features: [
            "Up to 5 users",
            "Basic analytics",
            "Email support",
            "Core features access",
            "5GB storage",
            "Community support",
        ],
    },
    {
        name: "Professional",
        price: 2999,
        period: "month",
        description: "Perfect for growing teams",
        isPopular: true,
        priceId: "plan_pro_monthly",
        features: [
            "Unlimited users",
            "Advanced analytics",
            "Priority support",
            "All features unlocked",
            "100GB storage",
            "Custom integrations",
            "API access",
            "White-label options",
        ],
    },
    {
        name: "Enterprise",
        price: 9999,
        period: "month",
        description: "For large organizations",
        priceId: "plan_enterprise_monthly",
        features: [
            "Everything in Professional",
            "Dedicated account manager",
            "24/7 phone support",
            "Custom SLA",
            "Unlimited storage",
            "Advanced security",
            "Custom contracts",
            "On-premise deployment option",
        ],
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto text-xl">
                            Choose the perfect plan for your needs. Start with a free trial or go straight to a paid plan.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <Card
                                key={plan.name}
                                className={`relative flex flex-col ${plan.isPopular ? "border-primary shadow-lg scale-105 z-10" : ""}`}
                            >
                                {plan.isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="gap-1 px-4 py-1.5 text-sm">
                                            <Star className="size-3" />
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}
                                <CardHeader>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription>{plan.description}</CardDescription>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">{plan.price === 0 ? "Free" : `₹${plan.price}`}</span>
                                        {plan.price > 0 && <span className="text-muted-foreground">/{plan.period}</span>}
                                        {plan.isTrial && <span className="text-muted-foreground"> for {plan.period}</span>}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="size-5 text-green-500 shrink-0 mt-0.5" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    <Link href="/sign-up" className="w-full">
                                        <Button
                                            className="w-full"
                                            variant={plan.isPopular ? "default" : "outline"}
                                            size="lg"
                                        >
                                            {plan.isTrial ? "Start Free Trial" : "Get Started"}
                                            <ArrowRight className="ml-2 size-4" />
                                        </Button>
                                    </Link>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-20 text-center">
                        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
                        <div className="grid md:grid-cols-2 gap-8 text-left max-w-4xl mx-auto mt-8">
                            <div>
                                <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
                                <p className="text-muted-foreground">Yes, you can cancel your subscription at any time. Your service will continue until the end of your billing period.</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Do you offer refunds?</h3>
                                <p className="text-muted-foreground">We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, just let us know.</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">Do I need a credit card for the trial?</h3>
                                <p className="text-muted-foreground">No, you can sign up for our 14-day free trial without entering any payment information.</p>
                            </div>
                            <div>
                                <h3 className="font-semibold mb-2">What happens after my trial ends?</h3>
                                <p className="text-muted-foreground">We'll email you before your trial expires. You can then choose a paid plan or your account will be paused.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-muted/20">
                <div className="max-w-7xl mx-auto text-center text-muted-foreground">
                    <p>© 2025 Campzeo. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
