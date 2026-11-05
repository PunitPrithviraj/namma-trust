import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "investor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      include: { investor: true }
    });

    if (!user || !user.investor) throw new Error("Investor not found");

    const loan = await prisma.loan.findUnique({ where: { id } });

    if (!loan) throw new Error("Loan not found");
    if (loan.investorId !== user.investor.id) throw new Error("Unauthorized");
    if (loan.status !== "requested") throw new Error("Cannot cancel a processed loan");

    // Delete the request completely
    await prisma.loan.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

