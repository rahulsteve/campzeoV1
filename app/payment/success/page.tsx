"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Download } from "lucide-react";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    const pid = searchParams.get("payment_id");
    if (pid) {
      setPaymentId(pid);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="size-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-700">Payment Successful!</CardTitle>
          <CardDescription>
            Thank you for your purchase. Your transaction has been completed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-lg border text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium text-green-600">Completed</span>
            </div>
            {paymentId && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment ID</span>
                <span className="font-medium font-mono">{paymentId}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receipt</span>
              <span className="font-medium">Sent to email</span>
            </div>
          </div>
                                                                 
          <div className="flex flex-col gap-3">
            <Button className="w-full" asChild>
              <Link href="/organisation">
                Go to Dashboard <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>`` 
            <Button variant="outline" className="w-full">
              <Download className="mr-2 size-4" /> Download Invoice
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
