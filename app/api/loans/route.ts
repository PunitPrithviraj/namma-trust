import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loanSchema = z.object({
  investorId: z.string(),
  principalAmount: z.number().positive(),
  termAmount: z.number().positive(),
  interestRate: z.number().positive(),
  loanTerm: z.number().positive(),
  startDate: z.string(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = loanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { investorId, principalAmount, termAmount, interestRate, loanTerm, startDate, notes } = parsed.data;

  // Validation: Ensure termAmount * loanTerm covers the principal
  if (termAmount * loanTerm < principalAmount) {
    return NextResponse.json({ error: "Monthly principal × term is less than total loan. Increase term or monthly amount." }, { status: 400 });
  }

  // Code Generation
  const lastLoan = await prisma.loan.findFirst({ where: { code: { startsWith: "LN-" } }, orderBy: { code: "desc" } });
  const nextCode = lastLoan?.code ? `LN-${String(parseInt(lastLoan.code.replace("LN-", ""), 10) + 1).padStart(3, "0")}` : "LN-001";

  // Create Loan
  const loan = await prisma.loan.create({
    data: { code: nextCode, investorId, principalAmount, termAmount, interestRate, loanTerm, startDate: new Date(startDate), notes, status: "active" }
  });

  // Generate Schedule (Math uses 1.5% on outstanding)
  let currentPrincipal = principalAmount;
  let monthNo = 1;
  const scheduleData = [];
  
  // First due date: 9th of next month
  const loanDate = new Date(startDate);
  let nextDueDate = new Date(loanDate.getFullYear(), loanDate.getMonth() + 1, 9);

  while (currentPrincipal > 0) {
    const interestAmount = Number((currentPrincipal * (interestRate / 100)).toFixed(2));
    let principalReduction = termAmount;
    if (currentPrincipal < termAmount) principalReduction = currentPrincipal;

    const closingPrincipal = Number((currentPrincipal - principalReduction).toFixed(2));

    scheduleData.push({
      loanId: loan.id, monthNo, dueDate: new Date(nextDueDate),
      openingPrincipal: currentPrincipal, interestAmount,
      termAmount: principalReduction, extra1000: 1000, // Compulsory investment retained
      extraRepayment: 0, closingPrincipal, status: "pending",
    });

    currentPrincipal = closingPrincipal;
    monthNo++;
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }

  await prisma.loanSchedule.createMany({ data: scheduleData });
  return NextResponse.json({ success: true, loanId: loan.id });
}
