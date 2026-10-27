import { prisma } from "./prisma";

export async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  details: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entity, entityId, details },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
