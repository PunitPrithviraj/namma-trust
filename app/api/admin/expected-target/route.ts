import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { emiTarget, invTarget, extraTarget, totalTarget } = await req.json();
  const now = new Date();
  
  // Determine the cycle month (if today is before 10th, it belongs to previous month's cycle)
  let cycleMonth = now.getMonth();
  let cycleYear = now.getFullYear();
  if (now.getDate() < 10) {
    cycleMonth -= 1;
    if (cycleMonth < 0) { cycleMonth = 11; cycleYear -= 1; }
  }

  const target = await prisma.expectedCycleTarget.upsert({
    where: { month_year: { month: cycleMonth, year: cycleYear } },
    update: { emiTarget, invTarget, extraTarget, totalTarget },
    create: { month: cycleMonth, year: cycleYear, emiTarget, invTarget, extraTarget, totalTarget }
  });

  return NextResponse.json(target);
}
