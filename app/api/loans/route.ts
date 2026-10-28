import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loanSchema = z.object({
  investorId: z.string(),
  principalAmount: z.number().positive(),
  termAmount: z.number().positive(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = loanSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { investorId, principalAmount, termAmount } = parsed.data;

  // 1. Check trust funds
  const investors = await prisma.investor.findMany({
    include: { investments: true, withdrawals: true },
  });
  
  let totalIn = 0;
  let totalOut = 0;
  investors.forEach(inv => {
    totalIn += inv.investments.reduce((s, i) => s + i.amount, 0);
    totalOut += inv.withdrawals.reduce((s, w) => s + w.amount, 0);
  });

  const activeLoans = await prisma.loan.findMany({ where: { status: "active" } });
  const totalPrincipalLoaned = activeLoans.reduce((s, l) => s + l.principalAmount, 0);
  const cashInHand = totalIn - totalOut - totalPrincipalLoaned;

  if (principalAmount > cashInHand) {
    return NextResponse.json(
      { error: `Insufficient trust funds. Cash in hand: ₹${cashInHand.toLocaleString("en-IN")}` }, 
      { status: 400 }
    );
  }

  // 2. Generate Loan Code
  const lastLoan = await prisma.loan.findFirst({
    where: { code: { startsWith: "LN-" } },
    orderBy: { code: "desc" },
  });

  let nextLoanCode = "LN-001";
  if (lastLoan && lastLoan.code) {
    const lastNumber = parseInt(lastLoan.code.replace("LN-", ""), 10);
    nextLoanCode = `LN-${String(lastNumber + 1).padStart(3, "0")}`;
  }

  // 3. Create the Loan
  const loan = await prisma.loan.create({
    data: {
      code: nextLoanCode,
      investorId,
      principalAmount,
      termAmount,
      status: "active",
    },
  });

  // 4. Generate Schedule (with 9th of the month due dates)
  let currentPrincipal = principalAmount;
  let monthNo = 1;
  const scheduleData = [];

  // Get the current date
  const today = new Date();
  
  // Set the first due date to the 9th of NEXT month
  let nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 9);

  while (currentPrincipal > 0) {
    const interestAmount = currentPrincipal * 0.015;
    const extra1000 = 1000;
    let principalReduction = termAmount;

    if (currentPrincipal < termAmount) {
      principalReduction = currentPrincipal;
    }

    const closingPrincipal = currentPrincipal - principalReduction;

    scheduleData.push({
      loanId: loan.id,
      monthNo,
      dueDate: new Date(nextDueDate), // Set to 9th
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
    
    // Move to the 9th of the next month
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
  }

  await prisma.loanSchedule.createMany({
    data: scheduleData,
  });

  return NextResponse.json({ success: true, loanId: loan.id });
}
