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

  const loan = await prisma.loan.findUnique({ where: { id } });
  if (!loan || loan.status !== "active") {
    return NextResponse.json({ error: "Loan not found or not active" }, { status: 400 });
  }

  const paidDate = date ? new Date(date) : new Date();

  // 1. Create an Extra Repayment record
  await prisma.repayment.create({
    data: {
      loanId: id,
      amountPaid: amount,
      principalPart: amount, // Extra payments go purely to principal
      interestPart: 0,
      extra1000Part: 0,
      paidDate: paidDate,
      notes: "Extra Principal Repayment",
    },
  });

  // 2. Update the loan's schedule to reduce the outstanding principal
  // (This logic assumes you are handling the principal reduction somewhere else, 
  // but this ensures the repayment is logged with the correct date)
  
  return NextResponse.json({ success: true });
}
