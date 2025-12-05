import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { PLANS, formatPrice } from "@/lib/plans";

interface PlanComparisonModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPlanId?: string;
    onSelectPlan?: (planId: string) => void;
}

export function PlanComparisonModal({
    open,
    onOpenChange,
    currentPlanId,
    onSelectPlan,
}: PlanComparisonModalProps) {
    const plans = Object.values(PLANS);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[90vw]  overflow-y-auto" style={{ height: "90vh" }}>
                <DialogHeader>
                    <DialogTitle>Compare Plans</DialogTitle>
                    <DialogDescription>
                        Choose the plan that best fits your needs
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 md:grid-cols-3 mt-4">
                    {plans.map((plan) => {
                        const isCurrentPlan = currentPlanId === plan.id;
                        const isPopular = plan.popular;

                        return (
                            <Card
                                key={plan.id}
                                className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
                            >
                                {isPopular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-primary">Most Popular</Badge>
                                    </div>
                                )}
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 right-4">
                                        <Badge variant="secondary">Current Plan</Badge>
                                    </div>
                                )}

                                <CardHeader>
                                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                                    <div className="mt-4">
                                        <span className="text-3xl font-bold">
                                            {formatPrice(plan.price, plan.currency)}
                                        </span>
                                        <span className="text-muted-foreground">/{plan.interval}</span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4">
                                    <ul className="space-y-2">
                                        {plan.features.map((feature, index) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <Check className="size-4 text-primary shrink-0 mt-1" />
                                                <span className="text-sm">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {isCurrentPlan ? (
                                        <Button variant="outline" className="w-full" disabled>
                                            Current Plan
                                        </Button>
                                    ) : plan.id === "FREE_TRIAL" ? (
                                        <Button variant="outline" className="w-full" disabled>
                                            Not Available
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            onClick={() => {
                                                onSelectPlan?.(plan.id);
                                                onOpenChange(false);
                                            }}
                                        >
                                            Select {plan.name}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Feature Comparison Table */}
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4">Feature Comparison</h3>
                    <div className="border rounded-lg overflow-hidden mx-auto" style={{ width: "50vw" }}>
                        <table className=" w-full">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="text-left p-3 font-medium">Feature</th>
                                    {plans.map((plan) => (
                                        <th key={plan.id} className="text-center p-3 font-medium">
                                            {plan.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Extract unique features */}
                                {Array.from(new Set(plans.flatMap((p) => p.features))).map(
                                    (feature, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-3 text-sm">{feature}</td>
                                            {plans.map((plan) => (
                                                <td key={plan.id} className="p-3 text-center">
                                                    {plan.features.includes(feature) ? (
                                                        <Check className="size-5 text-green-600 mx-auto" />
                                                    ) : (
                                                        <X className="size-5 text-muted-foreground mx-auto" />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
