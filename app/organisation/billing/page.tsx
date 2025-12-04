"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { PLANS, formatPrice, type PlanType } from "@/lib/plans";
import { Check, CreditCard, Calendar, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { RazorpayButton } from "@/components/razorpay-button";

interface OrganisationData {
  id: number;
  name: string;
  plan: PlanType;
  status: string;
  lastPaymentDate: string | null;
  nextBillingDate: string | null;
}

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  createdAt: string;
}

export default function BillingPage() {
  const router = useRouter();
  const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      // Fetch organisation data
      const userResponse = await fetch("/api/user/me");
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setOrganisation(userData.organisation);
      }

      // Fetch payment history
      const paymentsResponse = await fetch("/api/payments");
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error("Error fetching billing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    // Refresh billing data after successful payment
    fetchBillingData();
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-96 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = organisation ? PLANS[organisation.plan] : null;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and view payment history
          </p>
        </div>

        {/* Current Plan Card */}
        {currentPlan && organisation && (
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{currentPlan.name} Plan</CardTitle>
                  <CardDescription>
                    {formatPrice(currentPlan.price, currentPlan.currency)}/{currentPlan.interval}
                  </CardDescription>
                </div>
                <Badge variant={organisation.status === "active" ? "default" : "secondary"}>
                  {organisation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {organisation.lastPaymentDate && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Last Payment</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(organisation.lastPaymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
                {organisation.nextBillingDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Next Billing Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(organisation.nextBillingDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Plans</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {Object.values(PLANS).map((plan) => {
              const isCurrentPlan = organisation?.plan === plan.id;
              const canUpgrade = organisation && !isCurrentPlan && plan.price > (currentPlan?.price || 0);

              return (
                <Card
                  key={plan.id}
                  className={`relative ${plan.popular ? "border-primary shadow-lg" : ""}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        {formatPrice(plan.price, plan.currency)}
                      </span>
                      <span className="text-muted-foreground">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="size-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrentPlan ? (
                      <Button variant="outline" className="w-full" disabled>
                        Current Plan
                      </Button>
                    ) : canUpgrade ? (
                      plan.id === "FREE_TRIAL" ? (
                        <Button variant="outline" className="w-full" disabled>
                          Not Available
                        </Button>
                      ) : (
                        <RazorpayButton
                          plan={plan.id}
                          amount={plan.price}
                          onSuccess={handlePaymentSuccess}
                          className="w-full"
                        >
                          <TrendingUp className="size-4 mr-2" />
                          Upgrade to {plan.name}
                        </RazorpayButton>
                      )
                    ) : (
                      <Button variant="ghost" className="w-full" disabled>
                        Contact Sales
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View your past transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{payment.plan} Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatPrice(payment.amount, payment.currency)}
                      </p>
                      <Badge
                        variant={
                          payment.status === "COMPLETED"
                            ? "default"
                            : payment.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
