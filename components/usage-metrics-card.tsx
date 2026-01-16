import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Eye } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UsageMetric {
    current: number;
    limit: number;
    percentage: number;
    isNearLimit: boolean;
}

interface UsageMetricsCardProps {
    usage: {
        campaigns: UsageMetric;
        contacts: UsageMetric;
        users: UsageMetric;
        platforms: UsageMetric;
        postsThisMonth: UsageMetric;
        sms: UsageMetric;
        whatsapp: UsageMetric;
    };
}

const metricLabels: Record<string, string> = {
    campaigns: "Campaigns",
    contacts: "Contacts",
    users: "Team Members",
    platforms: "Connected Platforms",
    postsThisMonth: "Posts This Month",
    sms: "SMS Sent",
    whatsapp: "WhatsApp Sent",
};

export function UsageMetricsCard({ usage }: UsageMetricsCardProps) {
    const getProgressColor = (percentage: number) => {
        if (percentage >= 90) return "bg-red-500";
        if (percentage >= 70) return "bg-yellow-500";
        return "bg-green-500";
    };

    // Calculate overall status or just find any near limits
    const nearLimitMetrics = Object.entries(usage).filter(([_, m]) => m.isNearLimit);
    const hasWarnings = nearLimitMetrics.length > 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle>Usage & Limits</CardTitle>
                    <CardDescription>
                        {hasWarnings
                            ? `${nearLimitMetrics.length} metrics are reaching their limits`
                            : "All metrics within normal range"}
                    </CardDescription>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Eye className="size-4 mr-2" />
                            View Details
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Detailed Usage Metrics</DialogTitle>
                            <DialogDescription>
                                Current usage compared to your plan limits.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-6 py-4">
                            {Object.entries(usage).map(([key, metric]) => {
                                const label = metricLabels[key] || key;
                                const progressColor = getProgressColor(metric.percentage);
                                const cappedPercentage = Math.min(100, metric.percentage);
                                const isUnlimited = metric.limit === 0;

                                return (
                                    <div key={key} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{label}</span>
                                                {metric.isNearLimit && (
                                                    <AlertCircle className="size-4 text-yellow-600" />
                                                )}
                                            </div>
                                            <span className="text-muted-foreground">
                                                {metric.current} / {isUnlimited ? "Unlimited" : metric.limit} {isUnlimited ? "" : `(${metric.percentage}% used)`}
                                            </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${isUnlimited ? "bg-blue-500" : progressColor} transition-all duration-300`}
                                                style={{ width: `${isUnlimited ? 100 : cappedPercentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${hasWarnings ? 'bg-yellow-100' : 'bg-green-100'}`}>
                        {hasWarnings ? (
                            <AlertCircle className={`size-6 ${hasWarnings ? 'text-yellow-600' : 'text-green-600'}`} />
                        ) : (
                            <div className="size-6 rounded-full bg-green-500 flex items-center justify-center">
                                <span className="text-white text-xs">✓</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium">
                            {hasWarnings ? "Attention Required" : "Plan in Good Standing"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {hasWarnings
                                ? "Some limits are nearly reached. Consider upgrading soon."
                                : "You are well within your subscription limits."}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
