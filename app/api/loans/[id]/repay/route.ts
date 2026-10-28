import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { amount } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  try {
    const loan = await prisma.loan.findUnique({ 
      where: { id }, include: { schedule: { orderBy: { monthNo: "asc" } } } 
    });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    // Record the transaction
    await prisma.repayment.create({
      data: { loanId: loan.id, paidDate: new Date(), amountPaid: amount, principalPart: amount, interestPart: 0, extra1000Part: 0, notes: "Extra Principal" }
    });

    const newPrincipal = Math.max(0, loan.principalAmount - amount);
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    
    // If fully paid off early
    if (newPrincipal === 0) {
      await prisma.loan.update({ where: { id }, data: { principalAmount: 0, status: "completed", closureDate: new Date() } });
      await prisma.loanSchedule.deleteMany({ where: { loanId: id, status: "pending" } });
      return NextResponse.json({ success: true });
    }

    const startMonthNo = firstPending ? firstPending.monthNo : loan.schedule.length + 1;
    await prisma.loanSchedule.deleteMany({ where: { loanId: id, monthNo: { gte: startMonthNo } } });

    // Recalculate
    let currentPrincipal = newPrincipal;
    let monthNo = startMonthNo;
    const newScheduleData = [];
    let nextDueDate = firstPending ? new Date(firstPending.dueDate) : new Date();
    
    while (currentPrincipal > 0) {
      const interestAmount = Number((currentPrincipal * (loan.interestRate / 100)).toFixed(2));
      let principalReduction = loan.termAmount; // Keeps original agreed term amount
      if (currentPrincipal < loan.termAmount) principalReduction = currentPrincipal;

      const closingPrincipal = Number((currentPrincipal - principalReduction).toFixed(2));

      newScheduleData.push({
        loanId: loan.id, monthNo, dueDate: new Date(nextDueDate), openingPrincipal: currentPrincipal,
        interestAmount, termAmount: principalReduction, extra1000: 1000,
        extraRepayment: 0, closingPrincipal, status: "pending",
      });

      currentPrincipal = closingPrincipal;
      monthNo++;
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }

    await prisma.loanSchedule.createMany({ data: newScheduleData });
    await prisma.loan.update({ where: { id }, data: { principalAmount: newPrincipal } });

    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
