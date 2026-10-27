import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const repaymentSchema = z.object({
  scheduleId: z.string(),
  paidDate: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // SECURITY CHECK
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = repaymentSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { scheduleId, paidDate } = parsed.data;

  const schedule = await prisma.loanSchedule.findUnique({
    where: { id: scheduleId },
    include: { loan: true },
  });

  if (!schedule) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  if (schedule.status === "paid") return NextResponse.json({ error: "Already paid" }, { status: 400 });

  const totalPaid = schedule.interestAmount + schedule.termAmount + schedule.extra1000;

  await prisma.repayment.create({
    data: {
      loanId: schedule.loanId, scheduleId: schedule.id,
      paidDate: paidDate ? new Date(paidDate) : new Date(),
      amountPaid: totalPaid, principalPart: schedule.termAmount,
      interestPart: schedule.interestAmount, extra1000Part: schedule.extra1000,
    },
  });

  await prisma.loanSchedule.update({
    where: { id: schedule.id },
    data: { status: "paid" },
  });

  await prisma.investment.create({
    data: {
      investorId: schedule.loan.investorId, amount: schedule.extra1000,
      type: "loan_monthly", sourceLoanId: schedule.loanId,
      notes: `Compulsory investment from Loan month ${schedule.monthNo}`,
    },
  });

  if (schedule.closingPrincipal <= 0) {
    await prisma.loan.update({
      where: { id: schedule.loanId },
      data: { status: "closed" },
    });
  }

  await logAction(
    (session.user as any).id, "UPDATE", "Repayment", schedule.loanId,
    `Marked Month ${schedule.monthNo} as paid (₹${totalPaid})`
  );

  return NextResponse.json({ success: true });
}
