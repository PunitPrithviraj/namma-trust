import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Find the investor linked to the logged-in user
    const investor = await prisma.investor.findFirst({
      where: { userId: (session.user as any).id },
      include: {
        investments: { orderBy: { date: "desc" } },
        withdrawals: { orderBy: { date: "desc" } },
        loans: { 
          orderBy: { startDate: "desc" },
          include: {
            schedule: { orderBy: { monthNo: "asc" } },
            repayments: { orderBy: { paidDate: "desc" } },
          }
        },
        profitDistributions: { 
          orderBy: { cycle: { cycleStart: "desc" } },
          include: { cycle: true }
        },
      },
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor profile not found for this user." }, { status: 404 });
    }

    return NextResponse.json(investor);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load portal data" }, { status: 500 });
  }
}
