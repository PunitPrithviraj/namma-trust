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

    // Prevent double processing
    const lastRepayment = await prisma.repayment.findFirst({
      where: { loanId: loan.id },
      orderBy: { paidDate: "desc" }
    });
    
    if (lastRepayment && lastRepayment.amountPaid === amount && 
       (new Date().getTime() - new Date(lastRepayment.paidDate).getTime() < 5000)) {
      return NextResponse.json({ error: "Duplicate payment detected. Please wait." }, { status: 400 });
    }

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

    // 2. Calculate new principal
    const newPrincipal = Math.max(0, loan.principalAmount - amount);
    
    // 3. Find where to start recalculating
    const firstPending = loan.schedule.find((s: any) => s.status === "pending");
    const startMonthNo = firstPending ? firstPending.monthNo : loan.schedule.length + 1;

    // 4. Delete future pending schedules
    await prisma.loanSchedule.deleteMany({
      where: { 
        loanId: loan.id, 
        monthNo: { gte: startMonthNo } 
      }
    });

    // 5. Recalculate remaining schedule
    let currentPrincipal = newPrincipal;
    let monthNo = startMonthNo;
    const newScheduleData = [];
    
    // Get the date of the last pending payment to calculate the next 9th
    const lastPending = loan.schedule.find((s: any) => s.status === "pending");
    const baseDate = lastPending ? new Date(lastPending.dueDate) : new Date(loan.startDate);
    
    // Set the first recalculated due date to the 9th of the following month
    let nextDueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 9);

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
        dueDate: new Date(nextDueDate),
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
      nextDueDate.setMonth(nextDueDate.getMonth() + 1); // Move to next month's 9th
    }

    // 6. Save new schedule
    await prisma.loanSchedule.createMany({ data: newScheduleData });

    // 7. Update loan status
    await prisma.loan.update({
      where: { id: loan.id },
      data: { 
        principalAmount: newPrincipal,
        status: newPrincipal === 0 ? "closed" : "active"
      }
    });

    await logAction((session.user as any).id, "CREATE", "Repayment", loan.id, `Extra principal repayment of ₹${amount} applied.`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to process extra payment" }, { status: 500 });
  }
}
