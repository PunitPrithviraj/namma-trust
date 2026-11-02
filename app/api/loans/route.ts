import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loanSchema = z.object({
  investorId: z.string(),
  principalAmount: z.number().positive(),
  termAmount: z.number().positive(),
  interestRate: z.number().positive(),
  loanTerm: z.number().positive(),
  startDate: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = loanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { investorId, principalAmount, termAmount, interestRate, loanTerm, startDate, notes } = parsed.data;

  if (termAmount * loanTerm < principalAmount) {
    return NextResponse.json({ error: "Monthly principal × term is less than total loan. Increase term or monthly amount." }, { status: 400 });
  }

  try {
    // Use a transaction to lock the database and prevent double-sanctioning
    const newLoanId = await prisma.$transaction(async (tx) => {
      
      // 1. Calculate Available Funds
      const totalInvestments = await tx.investment.aggregate({ _sum: { amount: true } });
      const totalWithdrawals = await tx.withdrawal.aggregate({ _sum: { amount: true } });
      const totalProfit = await tx.profitDistribution.aggregate({ _sum: { shareAmount: true } });

      const activeLoans = await tx.loan.findMany({
        where: { status: "active" },
        include: { schedule: true },
      });

      let totalOutstanding = 0;
      activeLoans.forEach((loan) => {
        // Outstanding is the closing principal of the latest schedule month
        const lastSchedule = loan.schedule[loan.schedule.length - 1];
        totalOutstanding += lastSchedule ? lastSchedule.closingPrincipal : loan.principalAmount;
      });

      const availableFunds = 
        (totalInvestments._sum.amount || 0) + 
        (totalProfit._sum.shareAmount || 0) - 
        (totalWithdrawals._sum.amount || 0) - 
        totalOutstanding;

      // 2. Validate against requested amount
      if (principalAmount > availableFunds) {
        throw new Error(`Insufficient Trust Funds.\nAvailable: ₹${availableFunds.toLocaleString("en-IN")}\nRequested: ₹${principalAmount.toLocaleString("en-IN")}\nShortfall: ₹${(principalAmount - availableFunds).toLocaleString("en-IN")}`);
      }

      // 3. Generate Loan Code
      const lastLoan = await tx.loan.findFirst({
        where: { code: { startsWith: "LN-" } },
        orderBy: { code: "desc" },
      });
      const nextCode = lastLoan?.code
        ? `LN-${String(parseInt(lastLoan.code.replace("LN-", ""), 10) + 1).padStart(3, "0")}`
        : "LN-001";

      // 4. Create Loan
      const loan = await tx.loan.create({
        data: {
          code: nextCode,
          investorId,
          principalAmount,
          termAmount,
          interestRate,
          loanTerm,
          startDate: new Date(startDate),
          notes,
          status: "active",
        },
      });

      // 5. Generate Schedule
      let currentPrincipal = principalAmount;
      let monthNo = 1;
      const scheduleData = [];

      const loanDate = new Date(startDate);
      let nextDueDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + 1, 9);

      while (currentPrincipal > 0) {
        const interestAmount = Number((currentPrincipal * (interestRate / 100)).toFixed(2));
        let principalReduction = termAmount;
        if (currentPrincipal < termAmount) principalReduction = currentPrincipal;

        const closingPrincipal = Number((currentPrincipal - principalReduction).toFixed(2));

        scheduleData.push({
          loanId: loan.id,
          monthNo,
          dueDate: new Date(nextDueDate),
          openingPrincipal: currentPrincipal,
          interestAmount,
          termAmount: principalReduction,
          extra1000: 1000,
          extraRepayment: 0,
          closingPrincipal,
          status: "pending",
        });

        currentPrincipal = closingPrincipal;
        monthNo++;
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      await tx.loanSchedule.createMany({ data: scheduleData });
      return loan.id;
    });

    return NextResponse.json({ success: true, loanId: newLoanId });
  } catch (error: any) {
    console.error("Loan creation error:", error);
    // Return the exact error message so the frontend can show it in an alert
    return NextResponse.json(
      { error: error.message || "Failed to create loan" },
      { status: 400 }
    );
  }
}
