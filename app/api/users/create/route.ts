import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "user"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = userSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid data. Password must be at least 6 characters." }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user with all required fields explicitly set
    const user = await prisma.user.create({
      data: { 
        name, 
        email, 
        passwordHash, 
        role,
        language: "en" // Setting default language explicitly
      },
    });

    return NextResponse.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
    
  } catch (error: any) {
    // Print the actual error to the terminal so we can see it
    console.error("USER CREATION ERROR:", error);

    if (error.code === 'P2002') {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
  }
}
