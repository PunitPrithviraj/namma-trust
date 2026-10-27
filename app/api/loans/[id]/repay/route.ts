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
  // SECURITY CHECK
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const amount = Number(body.amount);

  if (!amount || amount <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  try {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) return NextResponse.json({ error: "Loan not found" }, { status: 404 });

    await prisma.repayment.create({
      data: {
        loanId: loan.id, paidDate: new Date(), amountPaid: amount,
        principalPart: amount, interestPart: 0, extra1000Part: 0,
        notes: "Extra Principal Repayment"
      }
    });

    const newPrincipal = Math.max(0, loan.principalAmount - amount);
    await prisma.loan.update({
      where: { id: loan.id },
      data: { principalAmount: newPrincipal, status: newPrincipal === 0 ? "closed" : "active" }
    });

    await logAction((session.user as any).id, "CREATE", "Repayment", loan.id, `Extra principal repayment of ₹${amount}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process extra payment" }, { status: 500 });
  }
}
