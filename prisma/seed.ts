import { PrismaClient } from "@prisma/client";
import { COURT_NAME } from "../src/lib/config";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.court.findFirst();
  if (!existing) {
    await prisma.court.create({ data: { name: COURT_NAME } });
    console.log(`Seeded court: ${COURT_NAME}`);
  } else {
    console.log(`Court already exists: ${existing.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
