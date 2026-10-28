import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const repayment = await prisma.repayment.findUnique({
      where: { id },
      include: { loan: { include: { schedule: true } } }
    });

    if (!repayment) return NextResponse.json({ error: "Repayment not found" }, { status: 404 });

    // 1. Delete the repayment
    await prisma.repayment.delete({ where: { id } });

    // 2. Reset schedule & remove compulsory investment if regular payment
    if (repayment.scheduleId) {
      await prisma.loanSchedule.update({
        where: { id: repayment.scheduleId },
        data: { status: "pending" }
      });
      await prisma.investment.deleteMany({
        where: { investorId: repayment.loan.investorId, sourceLoanId: repayment.loanId, amount: 1000, type: "loan_monthly" }
      });
    }

    // 3. Fetch remaining valid repayments
    const updatedLoan = await prisma.loan.findUnique({
      where: { id: repayment.loanId },
      include: { repayments: true, schedule: { orderBy: { monthNo: "asc" } } }
    });

    if (!updatedLoan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    // 4. Calculate TRUE outstanding principal from original amount
    const totalPrincipalRepaid = updatedLoan.repayments.reduce((sum, r) => sum + r.principalPart, 0);
    const trueOutstandingPrincipal = Math.max(0, updatedLoan.principalAmount - totalPrincipalRepaid);

    // 5. Find where to recalculate
    const firstPending = updatedLoan.schedule.find((s: any) => s.status === "pending");
    const startMonthNo = firstPending ? firstPending.monthNo : updatedLoan.schedule.length + 1;

    // 6. Delete future pending schedules
    await prisma.loanSchedule.deleteMany({
      where: { loanId: updatedLoan.id, monthNo: { gte: startMonthNo } }
    });

    // 7. Regenerate schedule
    let currentPrincipal = trueOutstandingPrincipal;
    let monthNo = startMonthNo;
    const newScheduleData = [];
    
    let nextDueDate = firstPending ? new Date(firstPending.dueDate) : new Date();
    if (!firstPending) {
      nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      nextDueDate.setDate(9);
    }

    while (currentPrincipal > 0) {
      const interestAmount = Number((currentPrincipal * (updatedLoan.interestRate / 100)).toFixed(2));
      let principalReduction = updatedLoan.termAmount;
      if (currentPrincipal < updatedLoan.termAmount) principalReduction = currentPrincipal;

      const closingPrincipal = Number((currentPrincipal - principalReduction).toFixed(2));

      newScheduleData.push({
        loanId: updatedLoan.id, monthNo, dueDate: new Date(nextDueDate),
        openingPrincipal: currentPrincipal, interestAmount,
        termAmount: principalReduction, extra1000: 1000,
        extraRepayment: 0, closingPrincipal, status: "pending",
      });

      currentPrincipal = closingPrincipal;
      monthNo++;
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    if (newScheduleData.length > 0) {
      await prisma.loanSchedule.createMany({ data: newScheduleData });
    }

    // 8. Update status
    await prisma.loan.update({
      where: { id: updatedLoan.id },
      data: { status: trueOutstandingPrincipal === 0 ? "completed" : "active", closureDate: trueOutstandingPrincipal === 0 ? new Date() : null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
