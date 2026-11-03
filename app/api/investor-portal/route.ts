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

  // 1. Fetch Individual Investor Data
  const investorData = await prisma.investor.findUnique({
    where: { id: investorId },
    include: {
      investments: { orderBy: { date: "desc" } },
      withdrawals: { orderBy: { date: "desc" } },
      profitDistributions: { include: { cycle: true }, orderBy: { paidDate: "desc" } },
      loans: { include: { schedule: true } },
    },
  });

  // 2. Calculate TRUST-WIDE Unspent Amount
  const allInvestments = await prisma.investment.aggregate({ _sum: { amount: true } });
  const allWithdrawals = await prisma.withdrawal.aggregate({ _sum: { amount: true } });
  const allProfit = await prisma.profitDistribution.aggregate({ _sum: { shareAmount: true } });
  
  const activeLoans = await prisma.loan.findMany({
    where: { status: "active" },
    include: { schedule: true }
  });

  let totalOutstanding = 0;
  activeLoans.forEach((loan) => {
    const pending = loan.schedule.find(s => s.status === "pending");
    if (pending) totalOutstanding += pending.openingPrincipal;
  });

  const totalCashIn = (allInvestments._sum.amount || 0) + (allProfit._sum.shareAmount || 0);
  const totalCashOut = (allWithdrawals._sum.amount || 0) + totalOutstanding;
  
  const trustUnspentAmount = Math.max(0, totalCashIn - totalCashOut);

  // 3. Count Active Investors and Calculate Per-Investor Share
  const activeInvestorCount = await prisma.investor.count({
    where: { status: "active" }
  });

  const investorUnspentShare = activeInvestorCount > 0 
    ? trustUnspentAmount / activeInvestorCount 
    : 0;

  // Return investor data along with the calculated shares
  return NextResponse.json({
    ...investorData,
    trustUnspentAmount,
    investorUnspentShare
  });
}
