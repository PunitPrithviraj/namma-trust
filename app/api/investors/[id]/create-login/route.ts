import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Valid email and password (6+ chars) required" }, { status: 400 });
  }

  try {
    const investor = await prisma.investor.findUnique({ where: { id } });
    if (!investor) return NextResponse.json({ error: "Investor not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create the user account with role "investor"
    const user = await prisma.user.create({
      data: {
        name: investor.name,
        email: email,
        phone: investor.phone, // <-- THIS LINKS THE PHONE NUMBER
        passwordHash,
        role: "investor",
      },
    });

    // 2. Link the user to the investor
    await prisma.investor.update({
      where: { id },
      data: { userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Email or Phone number already in use" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create login" }, { status: 500 });
  }
}
