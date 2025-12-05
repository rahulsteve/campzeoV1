"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Header } from "@/components/Header";

export default function Page() {
  const { client } = useClerk();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    organisationName: "",
    mobile: "",
    address: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    enquiryText: "",
    taxNumber: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to submit enquiry");
      }

      toast.success("Success!", {
        description: "Your enquiry has been submitted successfully. Redirecting to approval status...",
      });

      // Navigate to pending-approval page after short delay
      setTimeout(() => {
        router.push("/pending-approval");
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      toast.error("Submission Failed", {
        description: error instanceof Error ? error.message : "An error occurred during submission. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl">
          <Card className="shadow-lg border-0 sm:border">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Start your Free Trial</CardTitle>
              <CardDescription className="text-center">
                Create an account and tell us about your requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="organisationName">Business Name</Label>
                    <Input
                      id="organisationName"
                      name="organisationName"
                      placeholder="Acme Corp"
                      value={form.organisationName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      placeholder="+1 (555) 000-0000"
                      value={form.mobile}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="123 Main St"
                      value={form.address}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="New York"
                      value={form.city}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      placeholder="NY"
                      value={form.state}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      placeholder="United States"
                      value={form.country}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      placeholder="10001"
                      value={form.postalCode}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="taxNumber">GST / Tax Number</Label>
                    <Input
                      id="taxNumber"
                      name="taxNumber"
                      placeholder="Optional"
                      value={form.taxNumber}
                      onChange={handleChange}
                    />
                  </div>

                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="enquiryText">Enquiry</Label>
                  <Textarea
                    id="enquiryText"
                    name="enquiryText"
                    placeholder="Tell us about your requirements..."
                    className="min-h-[100px]"
                    value={form.enquiryText}
                    onChange={handleChange}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full md:col-span-2 mt-2"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Create Account & Submit Enquiry"}
                </Button>
                <div id="clerk-captcha" />
              </form>
            </CardContent>
          </Card>
        </div>
      </div>


    </div>
  );
}
