import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

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
    const repayment = await prisma.repayment.findUnique({
      where: { id },
      include: { loan: true }
    });

    if (!repayment) return NextResponse.json({ error: "Repayment not found" }, { status: 404 });

    if (repayment.notes?.includes("Extra Principal")) {
      await prisma.loan.update({
        where: { id: repayment.loanId },
        data: { principalAmount: repayment.loan.principalAmount + repayment.amountPaid, status: "active" }
      });
    } else {
      if (repayment.scheduleId) {
        await prisma.loanSchedule.update({
          where: { id: repayment.scheduleId },
          data: { status: "pending" }
        });
      }
      await prisma.investment.deleteMany({
        where: { investorId: repayment.loan.investorId, sourceLoanId: repayment.loanId, amount: 1000 }
      });
      await prisma.loan.update({
        where: { id: repayment.loanId },
        data: { status: "active" }
      });
    }

    await prisma.repayment.delete({ where: { id } });
    
    await logAction((session.user as any).id, "DELETE", "Repayment", repayment.loanId, `Deleted ${repayment.notes || 'Monthly'} payment of ₹${repayment.amountPaid}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
