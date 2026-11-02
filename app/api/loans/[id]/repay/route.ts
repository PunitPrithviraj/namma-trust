import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { amount, date } = await req.json();

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ 
        where: { id },
        include: { schedule: { orderBy: { monthNo: "asc" } } }
      });

      if (!loan || loan.status !== "active") throw new Error("Loan not found or not active");

      const paidDate = date ? new Date(date) : new Date();

      // 1. Record the Extra Repayment
      await tx.repayment.create({
        data: {
          loanId: id,
          amountPaid: amount,
          principalPart: amount,
          interestPart: 0,
          extra1000Part: 0,
          paidDate: paidDate,
          notes: "Extra Principal Repayment",
        },
      });

      // 2. Find all PENDING schedules for future months
      const pendingSchedules = loan.schedule.filter(s => s.status === "pending");
      
      if (pendingSchedules.length === 0) return; // Loan is already fully scheduled or paid

      // 3. Calculate the NEW opening principal for the next pending month
      // The extra amount directly reduces the principal.
      let newOpeningPrincipal = pendingSchedules[0].openingPrincipal - amount;
      
      // If the extra payment is more than the remaining principal, cap it at 0
      if (newOpeningPrincipal < 0) newOpeningPrincipal = 0;

      // 4. Recalculate interest and closing principal for all upcoming months
      const updatedSchedules = pendingSchedules.map((sch, index) => {
        // Interest = New Opening Principal * (Interest Rate / 100)
        const newInterestAmount = Number((newOpeningPrincipal * (loan.interestRate / 100)).toFixed(2));
        
        let principalReduction = sch.termAmount;
        // If the remaining principal is less than the term amount, only reduce what's left
        if (newOpeningPrincipal < principalReduction) principalReduction = newOpeningPrincipal;

        const newClosingPrincipal = Number((newOpeningPrincipal - principalReduction).toFixed(2));

        const updatedSch = {
          ...sch,
          openingPrincipal: newOpeningPrincipal,
          interestAmount: newInterestAmount,
          termAmount: principalReduction,
          closingPrincipal: Math.max(0, newClosingPrincipal),
        };

        // Set up the opening principal for the NEXT month in the loop
        newOpeningPrincipal = newClosingPrincipal;

        return updatedSch;
      });

      // 5. Save the updated schedules back to the database
      for (const sch of updatedSchedules) {
        await tx.loanSchedule.update({
          where: { id: sch.id },
          data: {
            openingPrincipal: sch.openingPrincipal,
            interestAmount: sch.interestAmount,
            termAmount: sch.termAmount,
            closingPrincipal: sch.closingPrincipal,
          },
        });
      }

      // 6. If the principal reaches 0, close the loan early
      const finalSchedules = updatedSchedules.filter(s => s.closingPrincipal > 0);
      if (finalSchedules.length === 0) {
        await tx.loan.update({
          where: { id },
          data: { status: "closed", closureDate: new Date() },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Extra repayment error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
