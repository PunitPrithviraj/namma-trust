import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { action, termAmount, interestRate, loanTerm, startDate } = await req.json();

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan || loan.status !== "requested") throw new Error("Loan request not found or already processed");

      if (action === "decline") {
        await tx.loan.update({
          where: { id },
          data: { status: "declined" },
        });
        return;
      }

      if (action === "approve") {
        // 1. Validate Trust Funds
        const totalInvestments = await tx.investment.aggregate({ _sum: { amount: true } });
        const totalWithdrawals = await tx.withdrawal.aggregate({ _sum: { amount: true } });
        const totalProfit = await tx.profitDistribution.aggregate({ _sum: { shareAmount: true } });
        const activeLoans = await tx.loan.findMany({ where: { status: "active" }, include: { schedule: true } });

        let totalOutstanding = 0;
        activeLoans.forEach((l) => {
          const pending = l.schedule.find(s => s.status === "pending");
          if (pending) totalOutstanding += pending.openingPrincipal;
        });

        const availableFunds = 
          (totalInvestments._sum.amount || 0) + 
          (totalProfit._sum.shareAmount || 0) - 
          (totalWithdrawals._sum.amount || 0) - 
          totalOutstanding;

        if (loan.principalAmount > availableFunds) {
          throw new Error(`Insufficient Trust Funds. Available: ₹${availableFunds.toLocaleString("en-IN")}`);
        }

        // 2. Generate Loan Code
        const lastLoan = await tx.loan.findFirst({
          where: { code: { startsWith: "LN-" } },
          orderBy: { code: "desc" },
        });
        const nextCode = lastLoan?.code
          ? `LN-${String(parseInt(lastLoan.code.replace("LN-", ""), 10) + 1).padStart(3, "0")}`
          : "LN-001";

        // 3. Update the loan with Admin details
        const updatedLoan = await tx.loan.update({
          where: { id },
          data: {
            code: nextCode,
            status: "active",
            termAmount: Number(termAmount),
            interestRate: Number(interestRate),
            loanTerm: Number(loanTerm),
            startDate: new Date(startDate),
            notes: loan.notes?.replace("REQUEST: ", "Approved: ") || "Approved Loan",
          },
        });

        // 4. Generate Schedule
        let currentPrincipal = updatedLoan.principalAmount;
        let monthNo = 1;
        const scheduleData = [];

        const loanDate = new Date(startDate);
        let nextDueDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + 1, 9);

        while (currentPrincipal > 0) {
          const interestAmount = Number((currentPrincipal * (updatedLoan.interestRate / 100)).toFixed(2));
          let principalReduction = updatedLoan.termAmount;
          if (currentPrincipal < updatedLoan.termAmount) principalReduction = currentPrincipal;

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
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
