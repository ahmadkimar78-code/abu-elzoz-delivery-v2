import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.create({
    data: {
      name: "أحمد صاحب المطعم",
      email: "owner@abuelzoz.com",
      phone: "01000000001",
      passwordHash,
      role: Role.RESTAURANT,
    },
  });

  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: owner.id,
      name: "مطعم الأصايل",
      description: "أكل بيتي أصيل",
      city: "اللاذقية",
      lat: 35.5317,
      lng: 35.7797,
      menuItems: {
        create: [
          { name: "كشري", price: 45, category: "أطباق رئيسية" },
          { name: "فراخ مشوية", price: 90, category: "أطباق رئيسية" },
          { name: "عصير مانجو", price: 25, category: "مشروبات" },
        ],
      },
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      name: "محمد السائق",
      email: "driver@abuelzoz.com",
      phone: "01000000002",
      passwordHash,
      role: Role.DRIVER,
    },
  });

  await prisma.driver.create({
    data: {
      userId: driverUser.id,
      isAvailable: true,
      lastLat: 35.535,
      lastLng: 35.785,
      vehicleType: "motorcycle",
    },
  });

  const customer = await prisma.user.create({
    data: {
      name: "سارة العميلة",
      email: "customer@abuelzoz.com",
      phone: "01000000003",
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  await prisma.address.create({
    data: {
      userId: customer.id,
      label: "المنزل",
      street: "شارع الملعب البلدي",
      city: "اللاذقية",
      lat: 35.529,
      lng: 35.775,
      isDefault: true,
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@abuelzoz.com",
      phone: "01000000004",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("✅ Seed complete. Restaurant ID:", restaurant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
