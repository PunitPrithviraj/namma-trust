import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "investor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: { investor: true }
  });

  if (!user || !user.investor) {
    return NextResponse.json({ error: "Investor profile not found" }, { status: 404 });
  }

  const investorId = user.investor.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [investorData, allInvestments, allWithdrawals, allProfit, activeLoans, expectedSchedules, extraIncomeRecord, activeInvestorCount] = await Promise.all([
    // 1. Individual Data
    prisma.investor.findUnique({
      where: { id: investorId },
      include: {
        investments: { orderBy: { date: "desc" } },
        withdrawals: { orderBy: { date: "desc" } },
        profitDistributions: { include: { cycle: true }, orderBy: { paidDate: "desc" } },
        loans: { include: { schedule: true } },
      },
    }),
    // 2. Trust-Wide Cash In
    prisma.investment.aggregate({ _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ _sum: { amount: true } }),
    prisma.profitDistribution.aggregate({ _sum: { shareAmount: true } }),
    // 3. Trust-Wide Active Loans
    prisma.loan.findMany({ where: { status: "active" }, include: { schedule: true } }),
    // 4. Expected EMI (Due this month)
    prisma.loanSchedule.findMany({
      where: { status: "pending", dueDate: { gte: startOfMonth, lte: endOfMonth }, loan: { status: "active" } }
    }),
    // 5. Extra Expected Amount
    prisma.expectedIncome.findUnique({ where: { month_year: { month: currentMonth, year: currentYear } } }),
    // 6. Active Investor Count
    prisma.investor.count({ where: { status: "active" } })
  ]);

  let totalOutstanding = 0;
  activeLoans.forEach((loan) => {
    const pending = loan.schedule.find(s => s.status === "pending");
    if (pending) totalOutstanding += pending.openingPrincipal;
  });

  const totalCashIn = (allInvestments._sum.amount || 0) + (allProfit._sum.shareAmount || 0);
  const totalCashOut = (allWithdrawals._sum.amount || 0) + totalOutstanding;
  const trustUnspentAmount = Math.max(0, totalCashIn - totalCashOut);
  const investorUnspentShare = activeInvestorCount > 0 ? trustUnspentAmount / activeInvestorCount : 0;

  // 👈 Calculate Expected Trust Amounts
  let trustExpectedEMI = 0;
  expectedSchedules.forEach(sch => { trustExpectedEMI += (sch.termAmount + sch.interestAmount); });
  const trustMonthly1000 = activeInvestorCount * 1000;
  const trustExtraExpected = extraIncomeRecord?.amount || 0;
  const trustGrandTotalExpected = trustExpectedEMI + trustMonthly1000 + trustExtraExpected;

  return NextResponse.json({
    ...investorData,
    trustUnspentAmount,
    investorUnspentShare,
    trustExpected: {
      emi: trustExpectedEMI,
      monthly1000: trustMonthly1000,
      extra: trustExtraExpected,
      grandTotal: trustGrandTotalExpected,
    }
  });
}
