import { PrismaClient, Role, CardCategory, CardStatus, MovementReason, TxnStatus, VerificationMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting development database seeding...');

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Create System Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@pds.gov.in' },
    update: {},
    create: {
      name: 'Central PDS Administrator',
      email: 'admin@pds.gov.in',
      phone: '+919876543210',
      passwordHash: defaultPasswordHash,
      role: Role.ADMIN,
      status: 'ACTIVE'
    }
  });

  // 2. Create FPS Shop Dealer User
  const shopkeeperUser = await prisma.user.upsert({
    where: { email: 'shopkeeper1@pds.gov.in' },
    update: {},
    create: {
      name: 'Ramesh Kumar (FPS Dealer)',
      email: 'shopkeeper1@pds.gov.in',
      phone: '+919876543211',
      passwordHash: defaultPasswordHash,
      role: Role.SHOPKEEPER,
      status: 'ACTIVE'
    }
  });

  // 3. Create Ration Shop (Fair Price Shop)
  const fpsShop = await prisma.rationShop.upsert({
    where: { shopCode: 'FPS_DELHI_001' },
    update: {},
    create: {
      shopCode: 'FPS_DELHI_001',
      shopName: 'Central Fair Price Shop #1',
      address: 'Sector 12, RK Puram',
      district: 'New Delhi',
      pincode: '110022',
      contactNumber: '+919876543211',
      status: 'ACTIVE'
    }
  });

  // Assign Shopkeeper Profile
  await prisma.shopkeeperProfile.upsert({
    where: { userId: shopkeeperUser.id },
    update: { rationShopId: fpsShop.id },
    create: {
      userId: shopkeeperUser.id,
      rationShopId: fpsShop.id
    }
  });

  // 4. Create Commodities / Ration Items
  const rice = await prisma.rationItem.upsert({
    where: { itemCode: 'RICE_PR11' },
    update: {},
    create: {
      itemCode: 'RICE_PR11',
      name: 'Fine Boiled Rice',
      unit: 'KG',
      standardPricePerUnit: 35.00,
      status: 'ACTIVE'
    }
  });

  const wheat = await prisma.rationItem.upsert({
    where: { itemCode: 'WHEAT_S30' },
    update: {},
    create: {
      itemCode: 'WHEAT_S30',
      name: 'Wheat Grain',
      unit: 'KG',
      standardPricePerUnit: 25.00,
      status: 'ACTIVE'
    }
  });

  const sugar = await prisma.rationItem.upsert({
    where: { itemCode: 'SUGAR_M30' },
    update: {},
    create: {
      itemCode: 'SUGAR_M30',
      name: 'Refined Sugar',
      unit: 'KG',
      standardPricePerUnit: 40.00,
      status: 'ACTIVE'
    }
  });

  // 5. Configurable Entitlements (Effective Month: 10-2026)
  const currentMonthYear = '10-2026';
  await prisma.rationEntitlement.deleteMany({ where: { effectiveMonthYear: currentMonthYear } });

  await prisma.rationEntitlement.createMany({
    data: [
      { category: CardCategory.BPL, rationItemId: rice.id, quotaPerMember: 5.00, quotaFlatPerCard: 0.00, subsidizedPricePerUnit: 3.00, effectiveMonthYear: currentMonthYear },
      { category: CardCategory.BPL, rationItemId: wheat.id, quotaPerMember: 3.00, quotaFlatPerCard: 0.00, subsidizedPricePerUnit: 2.00, effectiveMonthYear: currentMonthYear },
      { category: CardCategory.BPL, rationItemId: sugar.id, quotaPerMember: 0.00, quotaFlatPerCard: 1.00, subsidizedPricePerUnit: 13.50, effectiveMonthYear: currentMonthYear },

      { category: CardCategory.AAY, rationItemId: rice.id, quotaPerMember: 0.00, quotaFlatPerCard: 20.00, subsidizedPricePerUnit: 1.00, effectiveMonthYear: currentMonthYear },
      { category: CardCategory.AAY, rationItemId: wheat.id, quotaPerMember: 0.00, quotaFlatPerCard: 15.00, subsidizedPricePerUnit: 1.00, effectiveMonthYear: currentMonthYear },

      { category: CardCategory.APL, rationItemId: rice.id, quotaPerMember: 2.00, quotaFlatPerCard: 0.00, subsidizedPricePerUnit: 15.00, effectiveMonthYear: currentMonthYear },
      { category: CardCategory.APL, rationItemId: wheat.id, quotaPerMember: 2.00, quotaFlatPerCard: 0.00, subsidizedPricePerUnit: 10.00, effectiveMonthYear: currentMonthYear }
    ]
  });

  // 6. Shop Stock Inventory & Log Initial Movements
  const stockItems = [
    { item: rice, qty: 500.000 },
    { item: wheat, qty: 400.000 },
    { item: sugar, qty: 150.000 }
  ];

  for (const st of stockItems) {
    await prisma.stock.upsert({
      where: {
        rationShopId_rationItemId: {
          rationShopId: fpsShop.id,
          rationItemId: st.item.id
        }
      },
      update: { quantityAvailable: st.qty },
      create: {
        rationShopId: fpsShop.id,
        rationItemId: st.item.id,
        quantityAvailable: st.qty
      }
    });

    await prisma.stockMovement.create({
      data: {
        rationShopId: fpsShop.id,
        rationItemId: st.item.id,
        reason: MovementReason.REPLENISHMENT,
        quantityChange: st.qty,
        previousBalance: 0.000,
        newBalance: st.qty,
        referenceId: `STOCK_SEED_INIT_${st.item.itemCode}`,
        operatorId: adminUser.id
      }
    });
  }

  // 7. Create Beneficiary User & Ration Card
  const beneficiaryUser = await prisma.user.upsert({
    where: { email: 'beneficiary@gmail.com' },
    update: {},
    create: {
      name: 'Suresh Verma',
      email: 'beneficiary@gmail.com',
      phone: '+919876543212',
      passwordHash: defaultPasswordHash,
      role: Role.BENEFICIARY,
      status: 'ACTIVE'
    }
  });

  const cardNo = 'RC_DELHI_100293';
  const qrToken = `CARD_${cardNo}_SEED_TOKEN`;

  const rationCard = await prisma.rationCard.upsert({
    where: { rationCardNumber: cardNo },
    update: {},
    create: {
      rationCardNumber: cardNo,
      qrToken,
      category: CardCategory.BPL,
      familyMembersCount: 4,
      address: 'H.No 45, R.K Puram, Sector 12, New Delhi',
      status: CardStatus.ACTIVE,
      rationShopId: fpsShop.id
    }
  });

  await prisma.beneficiary.upsert({
    where: { userId: beneficiaryUser.id },
    update: { rationCardId: rationCard.id },
    create: {
      userId: beneficiaryUser.id,
      rationCardId: rationCard.id
    }
  });

  console.log('✅ Development Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
