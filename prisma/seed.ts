import { PrismaClient, RequestReason, RequestStatus, Resolution } from '@prisma/client';
const prisma = new PrismaClient();
const reasons = Object.values(RequestReason);
const statuses = Object.values(RequestStatus);
const names = ['Priya Shah','Marcus Lee','Elena Garcia','Daniel Kim','Taylor Brooks','Aisha Khan','Noah Carter','Sophie Martin','Lucas Nguyen','Maya Patel','Ravi Joshi','Nora Wilson'];
const items = ['Stoneware Mug','Linen Throw','Canvas Pillow Cover','Table Lamp','Waffle Towel Set','Ceramic Bowl','Planter','Linen Duvet Cover','Bedside Table','Scented Candle'];
async function main() {
  await prisma.note.deleteMany(); await prisma.returnRequest.deleteMany();
  for (let i=0;i<36;i++) {
    const status = statuses[i % statuses.length];
    const request = await prisma.returnRequest.create({ data: { reference: `RMA-${10432-i}`, customerName: names[i % names.length], customerEmail: `${names[i % names.length].toLowerCase().replace(' ','')}@example.com`, orderNumber: `#${12983-i}`, itemName: items[i % items.length], itemVariant: i % 2 ? 'Natural · Standard' : 'Sand · Set of 2', reason: reasons[i % reasons.length], status, resolution: status === 'APPROVED' || status === 'COMPLETED' ? (i % 2 ? Resolution.REPLACEMENT : Resolution.REFUND) : undefined, refundAmount: status === 'COMPLETED' && i % 2 === 0 ? 36 : undefined } });
    if (i % 3 === 0) await prisma.note.create({ data: { requestId: request.id, authorName: 'Jordan Singh', body: 'Customer details reviewed and request is ready for the next step.' } });
  }
}
main().finally(() => prisma.$disconnect());
