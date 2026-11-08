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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Fetch all active loans with their pending schedules for this month
    const activeLoans = await prisma.loan.findMany({
      where: { status: "active" },
      include: {
        investor: true,
        schedule: {
          where: {
            status: "pending",
            dueDate: { gte: startOfMonth, lte: endOfMonth },
          },
        },
      },
    });

    // 2. Calculate Expected Amount
    let totalExpectedEMI = 0;
    let expectedPrincipal = 0;
    let expectedInterest = 0;
    const breakdown: any[] = [];

    activeLoans.forEach((loan) => {
      if (loan.schedule.length > 0) {
        const sch = loan.schedule[0]; // The schedule due this month
        
        // EMI = Term Amount + Interest
        const emi = sch.termAmount + sch.interestAmount;
        
        totalExpectedEMI += emi;
        expectedPrincipal += sch.termAmount;
        expectedInterest += sch.interestAmount;

        breakdown.push({
          loanCode: loan.code || "N/A",
          investorName: loan.investor.name,
          dueDate: sch.dueDate,
          termAmount: sch.termAmount,
          interest: sch.interestAmount,
          emi: emi,
        });
      }
    });

    return NextResponse.json({
      totalExpectedEMI,
      expectedPrincipal,
      expectedInterest,
      breakdown,
    });
  } catch (error) {
    console.error("Expected amount error:", error);
    return NextResponse.json({ error: "Failed to calculate expected amount" }, { status: 500 });
  }
}
