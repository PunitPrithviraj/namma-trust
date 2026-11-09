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
  
  // CYCLE LOGIC: 10th to 9th
  const startOfCycle = new Date(now.getFullYear(), now.getMonth(), 10, 0, 0, 0);
  const endOfCycle = new Date(now.getFullYear(), now.getMonth() + 1, 9, 23, 59, 59);
  if (now.getDate() < 10) {
    startOfCycle.setMonth(startOfCycle.getMonth() - 1);
    endOfCycle.setMonth(endOfCycle.getMonth() - 1);
  }

  let cycleMonth = now.getMonth();
  let cycleYear = now.getFullYear();
  if (now.getDate() < 10) {
    cycleMonth -= 1;
    if (cycleMonth < 0) { cycleMonth = 11; cycleYear -= 1; }
  }

  const [investorData, allInvestments, allWithdrawals, allProfit, activeLoans, lockedTarget] = await Promise.all([
    prisma.investor.findUnique({
      where: { id: investorId },
      include: {
        investments: { orderBy: { date: "desc" } },
        withdrawals: { orderBy: { date: "desc" } },
        profitDistributions: { include: { cycle: true }, orderBy: { paidDate: "desc" } },
        loans: { include: { schedule: true } },
      },
    }),
    prisma.investment.aggregate({ _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ _sum: { amount: true } }),
    prisma.profitDistribution.aggregate({ _sum: { shareAmount: true } }),
    prisma.loan.findMany({ where: { status: "active" }, include: { schedule: true } }),
    // 👈 FETCH LOCKED TARGET
    prisma.expectedCycleTarget.findUnique({
      where: { month_year: { month: cycleMonth, year: cycleYear } }
    })
  ]);

  let totalOutstanding = 0;
  activeLoans.forEach((loan) => {
    const pending = loan.schedule.find(s => s.status === "pending");
    if (pending) totalOutstanding += pending.openingPrincipal;
  });

  const totalCashIn = (allInvestments._sum.amount || 0) + (allProfit._sum.shareAmount || 0);
  const totalCashOut = (allWithdrawals._sum.amount || 0) + totalOutstanding;
  const trustUnspentAmount = Math.max(0, totalCashIn - totalCashOut);
  
  const activeInvestorCount = await prisma.investor.count({ where: { status: "active" } });
  const investorUnspentShare = activeInvestorCount > 0 ? trustUnspentAmount / activeInvestorCount : 0;

  // 👈 IF LOCKED TARGET EXISTS, USE IT. OTHERWISE SHOW 0
  let trustExpected = {
    emi: 0,
    monthly1000: 0,
    extra: 0,
    grandTotal: 0
  };

  if (lockedTarget) {
    trustExpected = {
      emi: lockedTarget.emiTarget,
      monthly1000: lockedTarget.invTarget,
      extra: lockedTarget.extraTarget,
      grandTotal: lockedTarget.totalTarget
    };
  }

  return NextResponse.json({
    ...investorData,
    trustUnspentAmount,
    investorUnspentShare,
    trustExpected
  });
}
