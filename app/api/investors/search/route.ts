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
          { name: { contains: query } },
          { phone: { contains: query } },
          { code: { contains: query } },
        ],
      },
      include: {
        investments: true,
        loans: { where: { status: "active" } },
      },
      orderBy: { name: "asc" },
    });

    const enrichedInvestors = investors.map(inv => {
      const totalInvestment = inv.investments.reduce((sum, i) => sum + i.amount, 0);
      const totalLoan = inv.loans.reduce((sum, l) => sum + l.principalAmount, 0);
      return {
        id: inv.id,
        code: inv.code, // <-- ADDED THIS LINE
        name: inv.name,
        phone: inv.phone,
        totalInvestment,
        totalLoan,
      };
    });

    return NextResponse.json(enrichedInvestors);
  } catch (error) {
    return NextResponse.json({ error: "Failed to search" }, { status: 500 });
  }
}
