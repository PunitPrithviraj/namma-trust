import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { z } from "zod";

const updateSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional(),
});

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
  const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  const { amount, notes } = parsed.data;

  try {
    let updated = false;
    try {
      const inv = await prisma.investment.update({
        where: { id },
        data: { amount, notes },
      });
      await logAction((session.user as any).id, "UPDATE", "Investment", inv.investorId, `Edited Investment to ₹${amount}`);
      updated = true;
    } catch (e) {}

    if (!updated) {
      const wd = await prisma.withdrawal.update({
        where: { id },
        data: { amount, notes },
      });
      await logAction((session.user as any).id, "UPDATE", "Withdrawal", wd.investorId, `Edited Withdrawal to ₹${amount}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}
