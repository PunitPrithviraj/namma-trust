import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const extra = await prisma.expectedIncome.findUnique({
    where: { month_year: { month, year } }
  });

  return NextResponse.json({ amount: extra?.amount || 0 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { amount } = await req.json();
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const extra = await prisma.expectedIncome.upsert({
    where: { month_year: { month, year } },
    update: { amount: Number(amount) },
    create: { month, year, amount: Number(amount) }
  });

  return NextResponse.json(extra);
}
