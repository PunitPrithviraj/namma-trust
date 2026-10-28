import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// THIS LINE FORCES NEXT.JS TO NEVER CACHE THIS ROUTE
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      investor: true,
      schedule: { orderBy: { monthNo: "asc" } },
      repayments: { orderBy: { paidDate: "desc" } },
    },
  });

  if (!loan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(loan);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.repayment.deleteMany({ where: { loanId: id } });
    await prisma.loanSchedule.deleteMany({ where: { loanId: id } });
    await prisma.investment.deleteMany({ where: { sourceLoanId: id } });
    await prisma.loan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
  }
}
