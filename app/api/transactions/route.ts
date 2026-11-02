import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const txSchema = z.object({
  investorId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["investment", "withdrawal", "profit"]),
  notes: z.string().optional(),
  date: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = txSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const { investorId, amount, type, notes, date } = parsed.data;
  const txDate = date ? new Date(date) : new Date();

  if (type === "investment") {
    await prisma.investment.create({
      data: { investorId, amount, type: "topup", notes, date: txDate },
    });
  } else if (type === "withdrawal") {
    // Strict Validation for Withdrawals
    const invs = await prisma.investment.findMany({ where: { investorId } });
    const wds = await prisma.withdrawal.findMany({ where: { investorId } });
    const pds = await prisma.profitDistribution.findMany({ where: { investorId } });

    const totalInvestments = invs.reduce((s, i) => s + i.amount, 0);
    const totalWithdrawn = wds.reduce((s, w) => s + w.amount, 0);
    const totalProfit = pds.reduce((s, p) => s + p.shareAmount, 0);
    const currentBalance = totalInvestments + totalProfit - totalWithdrawn;

    if (amount > currentBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${currentBalance.toLocaleString("en-IN")}` }, 
        { status: 400 }
      );
    }

    await prisma.withdrawal.create({
      data: { investorId, amount, notes, date: txDate },
    });
  } else if (type === "profit") {
    // 👈 Create a special "Direct" cycle for this specific profit
    const now = txDate;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Find or create the Direct Profit cycle
    let cycle = await prisma.monthlyCycle.findFirst({
      where: { 
        cycleStart: startOfMonth, 
        status: "direct_entry" 
      }
    });

    if (!cycle) {
      cycle = await prisma.monthlyCycle.create({
        data: {
          cycleStart: startOfMonth,
          cycleEnd: endOfMonth,
          totalInterestCollected: 0,
          totalDistributed: 0,
          status: "direct_entry"
        }
      });
    }

    // Add the profit distribution
    await prisma.profitDistribution.create({
      data: {
        cycleId: cycle.id,
        investorId,
        balanceUsed: 0,
        shareAmount: amount,
        status: "paid",
        paidDate: txDate
      }
    });

    // Update the cycle total
    await prisma.monthlyCycle.update({
      where: { id: cycle.id },
      data: { totalDistributed: { increment: amount } }
    });
  }

  return NextResponse.json({ success: true });
}
