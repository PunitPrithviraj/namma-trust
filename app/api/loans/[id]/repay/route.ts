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
      include: { schedule: { orderBy: { monthNo: "asc" } } }
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

    // 2. Reduce the loan's main principal amount
    const newPrincipal = Math.max(0, loan.principalAmount - amount);
    
    // 3. Find the first unpaid month to start recalculating from
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    const startMonthNo = firstPending ? firstPending.monthNo : loan.schedule.length + 1;

    // 4. Delete future pending schedules (we will regenerate them)
    await prisma.loanSchedule.deleteMany({
      where: { 
        loanId: loan.id, 
        monthNo: { gte: startMonthNo } 
      }
    });

    // 5. Recalculate the remaining schedule
    let currentPrincipal = newPrincipal;
    let monthNo = startMonthNo;
    const newScheduleData = [];
    
    // Set start date to the 9th of the current month
    const now = new Date();
    let dueDate = new Date(now.getFullYear(), now.getMonth(), 9);
    // If the 9th has already passed this month, start from next month
    if (now.getDate() >= 9) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    while (currentPrincipal > 0) {
      const interestAmount = currentPrincipal * 0.015;
      const extra1000 = 1000;
      
      let principalReduction = loan.termAmount;
      if (currentPrincipal < loan.termAmount) {
        principalReduction = currentPrincipal;
      }

      const closingPrincipal = currentPrincipal - principalReduction;

      newScheduleData.push({
        loanId: loan.id,
        monthNo,
        dueDate: new Date(dueDate), // Set to 9th
        openingPrincipal: currentPrincipal,
        interestAmount,
        termAmount: principalReduction,
        extra1000,
        extraRepayment: 0,
        closingPrincipal,
        status: "pending",
      });

      currentPrincipal = closingPrincipal;
      monthNo++;
      dueDate.setMonth(dueDate.getMonth() + 1); // Move to next month's 9th
    }

    // 6. Save the new schedule
    await prisma.loanSchedule.createMany({ data: newScheduleData });

    // 7. Update the loan (close if fully paid)
    await prisma.loan.update({
      where: { id: loan.id },
      data: { 
        principalAmount: newPrincipal,
        status: newPrincipal === 0 ? "closed" : "active"
      }
    });

    await logAction((session.user as any).id, "CREATE", "Repayment", loan.id, `Extra principal repayment of ₹${amount} and schedule recalculated`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process extra payment" }, { status: 500 });
  }
}
