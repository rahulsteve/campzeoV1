import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-yellow-100 flex items-center justify-center">
              <Clock className="size-8 text-yellow-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Approval Pending</CardTitle>
          <CardDescription>
            Your organisation account is currently under review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">
            We are reviewing your account details. You will receive an email notification once your account has been approved.
          </p>
          <p className="text-sm text-muted-foreground">
            If you have any questions, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
