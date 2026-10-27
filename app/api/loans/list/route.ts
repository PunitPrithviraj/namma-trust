import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // "active" or null
  const search = searchParams.get("q") || "";

  try {
    const loans = await prisma.loan.findMany({
      where: {
        AND: [
          status === "active" ? { status: "active" } : {},
          search ? {
            OR: [
              { investor: { name: { contains: search } } },
              { id: { contains: search } },
            ]
          } : {}
        ]
      },
      include: {
        investor: true,
        schedule: { orderBy: { monthNo: "asc" } },
        repayments: true,
      },
      orderBy: { startDate: "desc" },
    });

    // Enrich loans with calculated metrics
    const enrichedLoans = loans.map((loan) => {
      const totalRepaid = loan.repayments.reduce((sum, r) => sum + r.amountPaid, 0);
      
      // Outstanding Principal Calculation
      let outstandingPrincipal = loan.principalAmount;
      loan.repayments.forEach((r) => {
        if (!r.notes?.includes("Extra Principal")) {
          outstandingPrincipal -= r.principalPart;
        }
      });
      outstandingPrincipal = Math.max(0, outstandingPrincipal);

      // Next Due Date
      const nextPending = loan.schedule.find((s) => s.status === "pending");
      const nextDueDate = nextPending ? nextPending.dueDate : null;

      // Pending Installments
      const pendingInstallmentsCount = loan.schedule.filter((s) => s.status === "pending").length;

      return {
        ...loan,
        totalRepaid,
        outstandingPrincipal,
        nextDueDate,
        pendingInstallmentsCount,
        interestRate: "1.5% / month",
        durationMonths: loan.schedule.length,
        monthlyInstallment: loan.termAmount + 1000, // Term + Compulsory Investment
      };
    });

    return NextResponse.json(enrichedLoans);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load loans" }, { status: 500 });
  }
}
