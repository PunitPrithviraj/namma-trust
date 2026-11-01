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
  const { newPassword, forceChange } = await req.json();

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: hashed,
      mustChangePassword: !!forceChange,
      forcePasswordReset: !!forceChange,
      lastPasswordChange: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
