import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const cycle = await prisma.monthlyCycle.findUnique({ where: { id } });
  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  if (cycle.status === "distributed") {
    return NextResponse.json({ error: "Profit already distributed for this month." }, { status: 400 });
  }

  // 1. Fetch all investors with their full history
  const investors = await prisma.investor.findMany({
    include: {
      investments: true,
      withdrawals: true,
      profitDistributions: true, // <-- Fetch past profits
    },
  });

  let totalTrustBalance = 0;
  const investorBalances = investors.map((inv) => {
    const totalInvested = inv.investments.reduce((s, i) => s + i.amount, 0);
    const totalWithdrawn = inv.withdrawals.reduce((s, w) => s + w.amount, 0);
    const totalProfitEarned = inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0);
    
    // ✅ CALCULATION: Total Investment + Total Profit - Total Withdrawals
    const currentBalance = Math.max(0, totalInvested + totalProfitEarned - totalWithdrawn);
    
    totalTrustBalance += currentBalance;
    return { investorId: inv.id, balance: currentBalance };
  });

  if (totalTrustBalance === 0) {
    return NextResponse.json({ error: "No funds in trust to calculate profit." }, { status: 400 });
  }

  // 2. Distribute profit proportionally based on the new current balance
  const distributions = investorBalances
    .filter((ib) => ib.balance > 0)
    .map((ib) => {
      const shareAmount = (ib.balance / totalTrustBalance) * cycle.totalInterestCollected;
      return {
        cycleId: cycle.id,
        investorId: ib.investorId,
        balanceUsed: ib.balance, // Storing the new balance used
        shareAmount: Math.round(shareAmount * 100) / 100,
        status: "paid",
      };
    });

  await prisma.profitDistribution.createMany({ data: distributions });
  
  await prisma.monthlyCycle.update({
    where: { id: cycle.id },
    data: { status: "distributed", totalDistributed: cycle.totalInterestCollected, distributedAt: new Date() },
  });

  return NextResponse.json({ success: true, distributed: distributions.length });
}
