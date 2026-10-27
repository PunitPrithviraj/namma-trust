import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  // 1. Verify the cycle exists and isn't already distributed
  const cycle = await prisma.monthlyCycle.findUnique({
    where: { id }
  });

  if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
  if (cycle.status === "distributed") {
    return NextResponse.json({ error: "Profit already distributed for this month." }, { status: 400 });
  }

  // 2. Get all investors and their total balance
  const investors = await prisma.investor.findMany({
    include: {
      investments: true,
      withdrawals: true,
    },
  });

  let totalTrustBalance = 0;
  const investorBalances = investors.map((inv) => {
    const invested = inv.investments.reduce((s, i) => s + i.amount, 0);
    const withdrawn = inv.withdrawals.reduce((s, w) => s + w.amount, 0);
    const balance = invested - withdrawn;
    totalTrustBalance += balance;
    return { investorId: inv.id, balance };
  });

  if (totalTrustBalance === 0) {
    return NextResponse.json({ error: "No funds in trust to calculate profit." }, { status: 400 });
  }

  // 3. Calculate distributions
  const distributions = investorBalances
    .filter((ib) => ib.balance > 0)
    .map((ib) => {
      const shareAmount = (ib.balance / totalTrustBalance) * cycle.totalInterestCollected;
      return {
        cycleId: cycle.id,
        investorId: ib.investorId,
        balanceUsed: ib.balance,
        shareAmount: Math.round(shareAmount * 100) / 100, // round to 2 decimals
        status: "paid", // Automatically mark as paid for now
      };
    });

  // 4. Save the distributions
  await prisma.profitDistribution.createMany({
    data: distributions,
  });

  // 5. Update the cycle status
  await prisma.monthlyCycle.update({
    where: { id: cycle.id },
    data: { 
      status: "distributed",
      totalDistributed: cycle.totalInterestCollected,
      distributedAt: new Date()
    },
  });

  return NextResponse.json({ success: true, distributed: distributions.length });
}
