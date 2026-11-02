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

// GET: Fetch all cycles
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cycles = await prisma.monthlyCycle.findMany({
    orderBy: { createdAt: "desc" }, // Show newest first
  });
  return NextResponse.json(cycles);
}

// POST: Create a new cycle
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = cycleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const { totalInterestCollected, month, year } = parsed.data;

  const cycleStart = new Date(year, month, 9);
  const cycleEnd = new Date(year, month + 1, 8);

  // 👈 REMOVED THE "EXISTING CYCLE" CHECK TO ALLOW MULTIPLE ENTRIES

  const cycle = await prisma.monthlyCycle.create({
    data: { 
      cycleStart, 
      cycleEnd, 
      totalInterestCollected, 
      status: "open" // Set to open so you can distribute it later
    }
  });

  return NextResponse.json(cycle);
}
