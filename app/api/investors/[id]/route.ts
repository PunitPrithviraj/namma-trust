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
    // Use a transaction to safely delete all linked data first
    await prisma.$transaction([
      // 1. Delete all Profit Distributions
      prisma.profitDistribution.deleteMany({ where: { investorId: id } }),
      
      // 2. Delete all Repayments (via Loan relation)
      prisma.repayment.deleteMany({ where: { loan: { investorId: id } } }),
      
      // 3. Delete all Loan Schedules
      prisma.loanSchedule.deleteMany({ where: { loan: { investorId: id } } }),
      
      // 4. Delete all Loans
      prisma.loan.deleteMany({ where: { investorId: id } }),
      
      // 5. Delete all Withdrawals
      prisma.withdrawal.deleteMany({ where: { investorId: id } }),
      
      // 6. Delete all Investments
      prisma.investment.deleteMany({ where: { investorId: id } }),
      
      // 7. Delete the linked Login (User) account
      // FIX IS HERE: Changed investorId to investor: { id: id }
      prisma.user.deleteMany({ where: { investor: { id: id } } }),
      
      // 8. Finally, delete the Investor
      prisma.investor.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete investor" }, { status: 500 });
  }
}
