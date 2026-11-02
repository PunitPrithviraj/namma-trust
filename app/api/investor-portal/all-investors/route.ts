import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const investors = await prisma.investor.findMany({
      where: { status: "active" }, // Only active investors
      orderBy: { code: "asc" }, // Sort by Investor ID
      include: {
        investments: true,
        profitDistributions: true,
        loans: {
          include: { repayments: true },
        },
      },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const sharedData = investors.map((inv) => {
      const totalRegular = inv.investments.reduce((s, i) => s + i.amount, 0);
      const totalProfit = inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0);
      const totalInvested = totalRegular + totalProfit;

      const thisMonthInvestment = inv.investments
        .filter((i) => {
          const d = new Date(i.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, i) => s + i.amount, 0);

      const loanTaken = inv.loans.reduce((s, l) => s + l.principalAmount, 0);

      const repaymentsMade = inv.loans.reduce((sum, loan) => {
        return sum + loan.repayments.reduce((rs, rep) => rs + rep.amountPaid, 0);
      }, 0);

      return {
        id: inv.id,
        code: inv.code || "N/A",
        name: inv.name,
        totalInvested,
        thisMonthInvestment,
        loanTaken,
        repaymentsMade,
      };
    });

    return NextResponse.json(sharedData);
  } catch (error) {
    console.error("All Investors API error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
