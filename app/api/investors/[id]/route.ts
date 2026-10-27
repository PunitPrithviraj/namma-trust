import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const investor = await prisma.investor.findUnique({
      where: { id },
      include: {

        user : true,
        investments: { orderBy: { date: "desc" } },
        withdrawals: { orderBy: { date: "desc" } },
        loans: { 
          orderBy: { startDate: "desc" },
          include: {
            schedule: true,
            repayments: true
          }
        },
      },
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor not found in database" }, { status: 404 });
    }

    // Fetch the profit distributions
    const profitDistributions = await prisma.profitDistribution.findMany({
      where: { investorId: id },
      include: { cycle: true },
      orderBy: { cycle: { cycleStart: "desc" } },
    });

    const totalInvested = investor.investments.reduce((s, i) => s + i.amount, 0);
    const totalWithdrawn = investor.withdrawals.reduce((s, w) => s + w.amount, 0);

    return NextResponse.json({
      ...investor,
      profitDistributions,
      balance: totalInvested - totalWithdrawn,
    });
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json({ error: "Failed to load investor" }, { status: 500 });
  }
}
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  // SECURITY CHECK
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.investor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Cannot delete investor." }, { status: 400 });
  }
}
