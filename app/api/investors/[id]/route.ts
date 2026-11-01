import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    // 1. Find the investor to get their linked User ID (if any)
    const investor = await prisma.investor.findUnique({
      where: { id },
      select: { userId: true }
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor not found" }, { status: 404 });
    }

    // 2. Use a transaction to safely delete all linked data
    await prisma.$transaction([
      prisma.profitDistribution.deleteMany({ where: { investorId: id } }),
      prisma.repayment.deleteMany({ where: { loan: { investorId: id } } }),
      prisma.loanSchedule.deleteMany({ where: { loan: { investorId: id } } }),
      prisma.loan.deleteMany({ where: { investorId: id } }),
      prisma.withdrawal.deleteMany({ where: { investorId: id } }),
      prisma.investment.deleteMany({ where: { investorId: id } }),
      
      // Delete the Investor first to break the relation
      prisma.investor.delete({ where: { id } }),
    ]);

    // 3. Delete the linked User account AFTER the investor is deleted
    if (investor.userId) {
      await prisma.user.delete({ where: { id: investor.userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete investor" }, { status: 500 });
  }
}
