import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cycleSchema = z.object({
  totalInterestCollected: z.number().positive(),
  month: z.number().min(0).max(11),
  year: z.number().min(2020),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // SECURITY CHECK
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = cycleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { totalInterestCollected, month, year } = parsed.data;

  const cycleStart = new Date(year, month, 9);
  const cycleEnd = new Date(year, month + 1, 8);

  const existing = await prisma.monthlyCycle.findFirst({ where: { cycleStart, cycleEnd } });
  if (existing) return NextResponse.json({ error: "A cycle for this month already exists." }, { status: 400 });

  const cycle = await prisma.monthlyCycle.create({
    data: { cycleStart, cycleEnd, totalInterestCollected, status: "collection" }
  });

  return NextResponse.json(cycle);
}
