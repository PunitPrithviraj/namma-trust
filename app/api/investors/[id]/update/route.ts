import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { z } from "zod";

// Allow updating both joinDate and code
const updateSchema = z.object({
  joinDate: z.string().optional(),
  code: z.string().optional(),
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

  try {
    const dataToUpdate: any = {};
    if (parsed.data.joinDate) dataToUpdate.joinDate = new Date(parsed.data.joinDate);
    if (parsed.data.code) dataToUpdate.code = parsed.data.code;

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const updated = await prisma.investor.update({
      where: { id },
      data: dataToUpdate,
    });

    await logAction(
      (session.user as any).id, 
      "UPDATE", 
      "Investor", 
      id, 
      `Updated investor details (Code: ${updated.code || 'N/A'})`
    );

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    // Catch unique constraint errors (if they try to use an existing code)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "This ID is already taken by another investor." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update investor" }, { status: 500 });
  }
}
