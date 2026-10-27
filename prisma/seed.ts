import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config(); // Load .env variables

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { email: "admin@nammatrust.com" },
    update: {
      phone: "7090860793",
    },
    create: {
      name: "Admin",
      email: "admin@nammatrust.com",
      phone: "7090860793",
      passwordHash,
      role: "admin",
    },
  });

  console.log("✅ Admin created/updated: admin@nammatrust.com / admin123");
  console.log("✅ Admin phone number: 7090860793");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
