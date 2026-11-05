import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch pending loan requests
    const pendingLoans = await prisma.loan.findMany({
      where: { status: "requested" },
      include: { investor: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // 2. Fetch recent investments (today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recentInvestments = await prisma.investment.findMany({
      where: { date: { gte: today } },
      include: { investor: true },
      orderBy: { date: "desc" },
      take: 5,
    });

    // Map them into unified notification objects
    const notifications: any[] = [];

    pendingLoans.forEach((loan) => {
      notifications.push({
        id: `loan-${loan.id}`,
        type: "loan_request",
        title: "New Loan Request",
        message: `${loan.investor.name} requested ₹${loan.principalAmount.toLocaleString("en-IN")}`,
        date: loan.createdAt,
        link: `/loans/${loan.id}`, // Or wherever admin approves it
        isUnread: true,
      });
    });

    recentInvestments.forEach((inv) => {
      notifications.push({
        id: `inv-${inv.id}`,
        type: "investment",
        title: "New Investment Added",
        message: `${inv.investor.name} added ₹${inv.amount.toLocaleString("en-IN")}`,
        date: inv.date,
        link: `/investors/${inv.investorId}`,
        isUnread: true,
      });
    });

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}

