import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    const updated = await prisma.investor.update({
      where: { id },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email || null,
        address: body.address || null,
        idProof: body.idProof || null,
        nominee: body.nominee || null,
        code: body.code,
        joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}
