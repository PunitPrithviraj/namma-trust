import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "investor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, purpose } = await req.json();
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: { investor: true }
  });

  if (!user || !user.investor) {
    return NextResponse.json({ error: "Investor not found" }, { status: 404 });
  }

  // Create a pending loan request (Status: "requested")
  await prisma.loan.create({
    data: {
      investorId: user.investor.id,
      principalAmount: amount,
      termAmount: 0, // Admin will fill this during approval
      interestRate: 1.5, // Default rate
      loanTerm: 12, // Default term, Admin can edit
      notes: `REQUEST: ${purpose}`,
      status: "requested",
    }
  });

  return NextResponse.json({ success: true });
}
