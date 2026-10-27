import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAction } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, userId, newPassword } = body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (action === "LOCK") {
      await prisma.user.update({ where: { id: userId }, data: { status: "locked" } });
      await logAction((session.user as any).id, "UPDATE", "User", userId, `Locked account for ${user.email}`);
    } 
    else if (action === "UNLOCK") {
      await prisma.user.update({ where: { id: userId }, data: { status: "active" } });
      await logAction((session.user as any).id, "UPDATE", "User", userId, `Unlocked account for ${user.email}`);
    } 
    else if (action === "RESET_PASSWORD") {
      if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password must be 6+ chars" }, { status: 400 });
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ 
        where: { id: userId }, 
        data: { passwordHash, forcePasswordReset: true, lastPasswordChange: new Date() } 
      });
      await logAction((session.user as any).id, "UPDATE", "User", userId, `Emergency password reset for ${user.email}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to manage user" }, { status: 500 });
  }
}
