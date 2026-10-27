import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const investorSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  idProof: z.string().optional(),
  nominee: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const investors = await prisma.investor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      investments: true,
      withdrawals: true,
    },
  });

  const withBalance = investors.map((inv) => {
    const totalInv = inv.investments.reduce((s, i) => s + i.amount, 0);
    const totalWd = inv.withdrawals.reduce((s, w) => s + w.amount, 0);
    return { ...inv, balance: totalInv - totalWd };
  });

  return NextResponse.json(withBalance);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = investorSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

    // 1. Find the latest investor code to generate the next one
    const lastInvestor = await prisma.investor.findFirst({
      where: { code: { startsWith: "INV-" } },
      orderBy: { code: "desc" },
    });

    let nextCode = "INV-001";
    if (lastInvestor && lastInvestor.code) {
      const lastNumber = parseInt(lastInvestor.code.replace("INV-", ""), 10);
      nextCode = `INV-${String(lastNumber + 1).padStart(3, "0")}`;
    }

    // 2. Create the investor with the new code
    const investor = await prisma.investor.create({
      data: {
        code: nextCode,
        ...parsed.data,
        email: parsed.data.email || null,
      },
    });

    return NextResponse.json(investor);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create investor" },
      { status: 500 }
    );
  }
}
