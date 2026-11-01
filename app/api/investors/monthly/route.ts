import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { investorId } = await req.json();
  if (!investorId) return NextResponse.json({ error: "Investor ID required" }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // 1. Check if already added this month
      const existing = await tx.investment.findFirst({
        where: {
          investorId,
          type: "monthly",
          date: { gte: startOfMonth, lte: endOfMonth }
        }
      });

      if (existing) {
        throw new Error("Monthly investment already added for this month.");
      }

      // 2. Create the investment
      const investment = await tx.investment.create({
        data: {
          investorId,
          amount: 1000,
          type: "monthly",
          notes: "Monthly ₹1,000 Admin Entry",
          date: now,
        }
      });

      return investment;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
