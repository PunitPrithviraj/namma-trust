import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // 1. Fetch Investors (Strip private data)
    const investorsRaw = await prisma.investor.findMany({
      where: { status: "active" },
      orderBy: { code: "asc" },
      include: { investments: true, profitDistributions: true, loans: { include: { repayments: true } } },
    });

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const investors = investorsRaw.map((inv) => {
      const totalRegular = inv.investments.reduce((s, i) => s + i.amount, 0);
      const totalProfit = inv.profitDistributions.reduce((s, p) => s + p.shareAmount, 0);
      const thisMonthInvestment = inv.investments
        .filter((i) => {
          const d = new Date(i.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((s, i) => s + i.amount, 0);
      const loanTaken = inv.loans.reduce((s, l) => s + l.principalAmount, 0);
      const repaymentsMade = inv.loans.reduce((sum, loan) => 
        sum + loan.repayments.reduce((rs, rep) => rs + rep.amountPaid, 0), 0);

      return {
        id: inv.id,
        code: inv.code || "N/A",
        name: inv.name,
        totalInvested: totalRegular + totalProfit,
        thisMonthInvestment,
        loanTaken,
        repaymentsMade,
      };
    });

    // 2. Fetch Loans
    const loansRaw = await prisma.loan.findMany({
      orderBy: { code: "asc" },
      include: { investor: true, schedule: true },
    });

    const loans = loansRaw.map((loan) => {
      let outstanding = 0;
      if (loan.status === "active") {
        const pending = loan.schedule.find((s) => s.status === "pending");
        outstanding = pending ? pending.openingPrincipal : loan.principalAmount;
      }
      return {
        id: loan.id,
        code: loan.code || "N/A",
        investorName: loan.investor.name,
        principalAmount: loan.principalAmount,
        interestRate: loan.interestRate,
        loanTerm: loan.loanTerm,
        status: loan.status,
        outstanding,
        startDate: loan.startDate,
      };
    });

    // 3. Fetch Profit Cycles
    const cyclesRaw = await prisma.monthlyCycle.findMany({
      orderBy: { cycleStart: "desc" },
      where: { status: "distributed" },
    });

    const profits = cyclesRaw.map((c) => ({
      id: c.id,
      month: new Date(c.cycleStart).toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      totalCollected: c.totalInterestCollected,
      totalDistributed: c.totalDistributed,
      distributedAt: c.distributedAt,
    }));

    // 4. 👈 FETCH PENDING LOAN REQUESTS
    const pendingRequestsRaw = await prisma.loan.findMany({
      where: { status: "requested" },
      include: { investor: true },
      orderBy: { createdAt: "desc" },
    });

    const pendingRequests = pendingRequestsRaw.map((req) => ({
      id: req.id,
      borrower: req.investor.name,
      amount: req.principalAmount,
      purpose: req.notes?.replace("REQUEST: ", "") || "N/A",
      date: req.createdAt,
    }));

    return NextResponse.json({ investors, loans, profits, pendingRequests });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch shared data" }, { status: 500 });
  }
}
