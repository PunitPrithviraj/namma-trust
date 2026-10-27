import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { logAction } from "@/lib/audit";

const txSchema = z.object({
  investorId: z.string(),
  amount: z.number().positive(),
  type: z.enum(["investment", "withdrawal"]),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // SECURITY CHECK
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = txSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { investorId, amount, type, notes } = parsed.data;

  if (type === "investment") {
    await prisma.investment.create({
      data: { investorId, amount, type: "topup", notes },
    });
  } else {
    const invs = await prisma.investment.findMany({ where: { investorId } });
    const wds = await prisma.withdrawal.findMany({ where: { investorId } });
    const balance = invs.reduce((s, i) => s + i.amount, 0) - wds.reduce((s, w) => s + w.amount, 0);

    if (amount > balance) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    }

    await prisma.withdrawal.create({
      data: { investorId, amount, notes },
    });
  }

  await logAction(
    (session.user as any).id,
    type === "investment" ? "CREATE" : "DELETE",
    "Transaction",
    investorId,
    `${type === "investment" ? "Added" : "Withdrew"} ₹${amount}`
  );

  return NextResponse.json({ success: true });
}
