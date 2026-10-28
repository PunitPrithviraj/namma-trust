import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  try {
    const loan = await prisma.loan.findUnique({ 
      where: { id },
      include: { schedule: { orderBy: { monthNo: "asc" } }, repayments: true } 
    });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    // 1. Record the extra payment
    await prisma.repayment.create({
      data: {
        loanId: loan.id, 
        paidDate: new Date(), 
        amountPaid: amount,
        principalPart: amount, 
        interestPart: 0, 
        extra1000Part: 0,
        notes: "Extra Principal Repayment"
      }
    });

    // 2. Calculate TRUE outstanding principal
    const totalPrincipalRepaid = loan.repayments.reduce((sum, r) => sum + r.principalPart, 0) + amount;
    const trueOutstandingPrincipal = Math.max(0, loan.principalAmount - totalPrincipalRepaid);
    
    // 3. Find where to start recalculating
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    const startMonthNo = firstPending ? firstPending.monthNo : loan.schedule.length + 1;

    // 4. Delete future pending schedules
    await prisma.loanSchedule.deleteMany({
      where: { loanId: loan.id, monthNo: { gte: startMonthNo } }
    });

    // 5. Recalculate remaining schedule
    let currentPrincipal = trueOutstandingPrincipal;
    let monthNo = startMonthNo;
    const newScheduleData = [];
    
    let nextDueDate = firstPending ? new Date(firstPending.dueDate) : new Date();

    while (currentPrincipal > 0) {
      const interestAmount = Number((currentPrincipal * (loan.interestRate / 100)).toFixed(2));
      let principalReduction = loan.termAmount;
      if (currentPrincipal < loan.termAmount) principalReduction = currentPrincipal;

      const closingPrincipal = Number((currentPrincipal - principalReduction).toFixed(2));

      newScheduleData.push({
        loanId: loan.id, monthNo, dueDate: new Date(nextDueDate),
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

    // 6. Update status ONLY. DO NOT overwrite principalAmount!
    await prisma.loan.update({
      where: { id: loan.id },
      data: { status: trueOutstandingPrincipal === 0 ? "completed" : "active", closureDate: trueOutstandingPrincipal === 0 ? new Date() : null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process extra payment" }, { status: 500 });
  }
}
