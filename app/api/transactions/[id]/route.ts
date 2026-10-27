import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  // SECURITY CHECK
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    let deleted = false;
    try {
      const inv = await prisma.investment.delete({ where: { id } });
      await logAction((session.user as any).id, "DELETE", "Investment", inv.investorId, `Deleted Investment ₹${inv.amount}`);
      deleted = true;
    } catch (e) {}

    if (!deleted) {
      const wd = await prisma.withdrawal.delete({ where: { id } });
      await logAction((session.user as any).id, "DELETE", "Withdrawal", wd.investorId, `Deleted Withdrawal ₹${wd.amount}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
