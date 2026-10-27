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
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    // 1. Delete all profit distributions tied to this cycle
    await prisma.profitDistribution.deleteMany({
      where: { cycleId: id }
    });

    // 2. Delete the cycle itself
    await prisma.monthlyCycle.delete({
      where: { id }
    });

    await logAction((session.user as any).id, "DELETE", "Cycle", id, "Deleted a monthly profit cycle");

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete cycle" }, { status: 500 });
  }
}
