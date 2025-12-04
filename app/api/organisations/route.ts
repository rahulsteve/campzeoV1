import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { sendPaymentReceipt } from "@/lib/email";

export async function POST(req: Request) {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        console.log("=== CREATE ORGANISATION REQUEST ===");
        console.log("Request body:", JSON.stringify(body, null, 2));
        console.log("===================================");

        const {
            organizationName,
            plan,
            paymentData,
            phone,
            email,
            address,
            city,
            state,
            country,
            postalCode,
            taxNumber
        } = body;

        if (!organizationName || !plan) {
            return NextResponse.json(
                { error: "Organization name and plan are required" },
                { status: 400 }
            );
        }

        // Check if user already has an organisation
        const existingUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { organisation: true },
        });

        if (existingUser?.organisation) {
            return NextResponse.json(
                { error: "User already has an organisation", organisation: existingUser.organisation },
                { status: 400 }
            );
        }

        // Fetch Plan from DB
        const dbPlan = await prisma.plan.findFirst({
            where: { name: plan }
        });

        // If plan doesn't exist in DB, we might need to create it or error out.
        // For now, let's assume plans are seeded or we create a default one if missing (for dev).
        let selectedPlan = dbPlan;
        if (!selectedPlan) {
            // Fallback or error. For safety in dev, let's error if not found, or create if it's FREE_TRIAL
            if (plan === 'FREE_TRIAL') {
                selectedPlan = await prisma.plan.create({
                    data: {
                        name: 'FREE_TRIAL',
                        price: 0,
                        billingCycle: 'MONTHLY',
                        features: 'Basic features',
                        isActive: true
                    }
                });
            } else {
                return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
            }
        }

        // Create organisation
        const organisation = await prisma.organisation.create({
            data: {
                name: organizationName,
                ownerName: `${user.firstName} ${user.lastName}`.trim(),
                email: email || user.emailAddresses[0]?.emailAddress,
                phone,
                address,
                city,
                state,
                country,
                postalCode,
                taxNumber,
                isTrial: plan === 'FREE_TRIAL',
                trialStartDate: plan === 'FREE_TRIAL' ? new Date() : null,
                trialEndDate: plan === 'FREE_TRIAL' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
                isApproved: true, // Auto-approve for now or based on policy
            }
        });

        // Create Subscription
        const subscription = await prisma.subscription.create({
            data: {
                organisationId: organisation.id,
                planId: selectedPlan.id,
                startDate: new Date(),
                status: 'ACTIVE',
                autoRenew: true,
                isTrial: plan === 'FREE_TRIAL',
                trialStartDate: plan === 'FREE_TRIAL' ? new Date() : null,
                trialEndDate: plan === 'FREE_TRIAL' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
            }
        });

        const updatedUser = await prisma.user.upsert({
            where: { clerkId: user.id },
            update: {
                organisationId: organisation.id,
            },
            create: {
                clerkId: user.id,
                email: user.emailAddresses[0]?.emailAddress || "",
                firstName: user.firstName,
                lastName: user.lastName,
                organisationId: organisation.id,
                role: 'ORGANISATION_USER',
            },
        });
        // Handle Payment if not free trial
        if (plan !== "FREE_TRIAL" && paymentData) {
            // Create Payment
            await prisma.payment.create({
                data: {
                    organisationId: organisation.id,
                    razorpayOrderId: paymentData.razorpay_order_id,
                    razorpayPaymentId: paymentData.razorpay_payment_id,
                    razorpaySignature: paymentData.razorpay_signature,
                    amount: selectedPlan.price,
                    currency: "INR",
                    status: "success",
                    plan: selectedPlan.name,
                    receipt: `receipt_${Date.now()}`,
                }
            });

            // Create Invoice
            await prisma.invoice.create({
                data: {
                    subscriptionId: subscription.id,
                    invoiceDate: new Date(),
                    dueDate: new Date(),
                    paidDate: new Date(),
                    status: "PAID",
                    amount: selectedPlan.price,
                    taxAmount: 0, // Calculate tax if needed
                    discountAmount: 0,
                    balance: 0,
                    currency: "INR", // Or from plan
                    invoiceNumber: `INV-${Date.now()}`,
                    paymentMethod: "RAZORPAY",
                    description: `Subscription for ${selectedPlan.name}`,
                }
            });

            // Send Payment Receipt
            await sendPaymentReceipt({
                email: email || user.emailAddresses[0]?.emailAddress || "",
                amount: Number(selectedPlan.price),
                currency: "INR",
                planName: selectedPlan.name,
                receiptId: paymentData.razorpay_payment_id,
                date: new Date(),
                organisationName: organizationName
            });
        }

        // Log event (using LogEvents instead of Activity)
        await prisma.logEvents.create({
            data: {
                message: `Organisation created: ${organisation.name}`,
                level: 'Info',
                timeStamp: new Date(),
                properties: JSON.stringify({
                    userId: updatedUser.id,
                    organisationId: organisation.id,
                    plan: selectedPlan.name
                })
            }
        });

        return NextResponse.json({
            success: true,
            organisation,
            user: updatedUser,
        });
    } catch (error) {
        console.error("=== ERROR CREATING ORGANISATION ===");
        console.error("Error details:", error);
        console.error("Error message:", error instanceof Error ? error.message : "Unknown error");
        console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
        console.error("===================================");

        return NextResponse.json(
            {
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

// GET endpoint to fetch current user's organisation
export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { clerkId: user.id },
            include: { organisation: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            user: dbUser,
            organisation: dbUser.organisation,
        });
    } catch (error) {
        console.error("Error fetching organisation:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
