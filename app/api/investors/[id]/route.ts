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

  const { id } = await params;

  try {
    const investor = await prisma.investor.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        investments: { orderBy: { date: "desc" } },
        withdrawals: { orderBy: { date: "desc" } },
        loans: { include: { schedule: true } },
        profitDistributions: { include: { cycle: true } },
      },
    });

    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    return NextResponse.json(investor);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch investor" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const investor = await prisma.investor.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

    await prisma.$transaction([
      prisma.profitDistribution.deleteMany({ where: { investorId: id } }),
      prisma.repayment.deleteMany({ where: { loan: { investorId: id } } }),
      prisma.loanSchedule.deleteMany({ where: { loan: { investorId: id } } }),
      prisma.loan.deleteMany({ where: { investorId: id } }),
      prisma.withdrawal.deleteMany({ where: { investorId: id } }),
      prisma.investment.deleteMany({ where: { investorId: id } }),
      prisma.investor.delete({ where: { id } }),
    ]);

    if (investor.userId) {
      await prisma.user.delete({ where: { id: investor.userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete investor" }, { status: 500 });
  }
}
