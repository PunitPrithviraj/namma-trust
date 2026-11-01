import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { logAction } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { newPassword, forceChange } = await req.json();

  const err = validatePasswordStrength(newPassword);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id },
    data: { password: hashed, mustChangePassword: !!forceChange },
  });

  await logAction(
    (session.user as any).id,
    "UPDATE",
    "User",
    id,
    `Admin reset password for ${target.email}${forceChange ? " (force change on next login)" : ""}`
  );
  return NextResponse.json({ success: true });
}
