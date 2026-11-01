import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  try {
    const investors = await prisma.investor.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } },
          { code: { contains: query, mode: "insensitive" } },
        ],
      },
      orderBy: { code: "asc" }, // 👈 Sort by Investor ID
      include: {
        investments: true,
        withdrawals: true,
        loans: { where: { status: "active" }, include: { schedule: true } },
        profitDistributions: true,
      },
    });

    // Map the data to include the exact totals needed by the frontend
    const enrichedInvestors = investors.map((inv) => {
      // 1. Regular Investment (Sum of actual deposits)
      const totalInvestment = inv.investments.reduce((s, i) => s + i.amount, 0);
      
      // 2. Profit Up to Date (Sum of all profit distributions)
      const totalProfit = inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0);

      // 3. Active Loans (Outstanding principal)
      let totalLoan = 0;
      inv.loans.forEach((loan) => {
        const lastSchedule = loan.schedule[loan.schedule.length - 1];
        totalLoan += lastSchedule ? lastSchedule.closingPrincipal : loan.principalAmount;
      });

      return {
        ...inv,
        totalInvestment,
        totalProfit,
        totalLoan,
      };
    });

    return NextResponse.json(enrichedInvestors);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Failed to fetch investors" }, { status: 500 });
  }
}
