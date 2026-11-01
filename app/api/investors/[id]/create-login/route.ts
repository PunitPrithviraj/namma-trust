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
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { email, password } = await req.json();

  if (!email || !password || password.length < 6) {
    return NextResponse.json(
      { error: "Valid email and password (min 6 chars) are required." },
      { status: 400 }
    );
  }

  try {
    const investor = await prisma.investor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!investor) {
      return NextResponse.json({ error: "Investor not found." }, { status: 404 });
    }

    if (investor.user) {
      return NextResponse.json(
        { error: "This investor already has a login account." },
        { status: 400 }
      );
    }

    // Check if email is already in use by another user
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "This email is already registered to another user." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // Create the user and link it to the investor
    await prisma.user.create({
      data: {
        name: investor.name,
        email: email,
        phone: investor.phone,
        passwordHash: hashed,
        role: "investor",
        status: "active",
        // Connect to the investor using the relation
        investor: {
          connect: { id: investor.id },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Create login error:", error);
    return NextResponse.json(
      { error: "Failed to create login. Please try again." },
      { status: 500 }
    );
  }
}
