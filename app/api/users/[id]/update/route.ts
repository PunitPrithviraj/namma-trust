import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["admin", "user"]),
  password: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  
  const { name, email, role, password } = parsed.data;

  // Safety check: Prevent admin from demoting themselves
  if (id === (session.user as any).id && role !== "admin") {
    return NextResponse.json({ error: "You cannot change your own role to User." }, { status: 400 });
  }

  try {
    const dataToUpdate: any = { name, email, role };
    
    // If a new password was provided, hash it and update it
    if (password && password.length >= 6) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "This email is already in use." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

