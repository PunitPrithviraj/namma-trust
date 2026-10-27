import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@nammatrust.com" },
    update: {
      phone: "8970089722", // Adding phone to existing admin
    },
    create: {
      name: "Admin",
      email: "admin@nammatrust.com",
      phone: "8970089722", // Added phone number here
      passwordHash,
      role: "admin",
    },
  });

  console.log("✅ Admin created/updated: admin@nammatrust.com / admin123");
  console.log("✅ Admin phone number: 8970089722");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
