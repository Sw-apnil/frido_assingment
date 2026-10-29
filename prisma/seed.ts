import { PrismaClient, RequestReason, RequestStatus, Resolution } from '@prisma/client';

const prisma = new PrismaClient();

const mockRequests = [
  // 1. OPEN requests (various reasons)
  {
    reference: 'RET-1001',
    customerName: 'Priya Shah',
    customerEmail: 'priya.shah@example.com',
    orderNumber: 'ORD-8821',
    itemName: 'Stoneware Ceramic Mug',
    itemVariant: 'Sand · Set of 2',
    units: 2,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.OPEN,
    notes: [
      { authorName: 'Customer Portal', body: 'Customer submitted return: One mug arrived cracked at the handle. Packaging was intact.' }
    ]
  },
  {
    reference: 'RET-1002',
    customerName: 'Elena Garcia',
    customerEmail: 'elena.g@example.com',
    orderNumber: 'ORD-8819',
    itemName: 'Linen Pillow Cover',
    itemVariant: 'Oatmeal · 18x18',
    units: 1,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.OPEN,
    notes: [
      { authorName: 'Customer Portal', body: 'Customer received cotton canvas cover instead of requested French linen.' }
    ]
  },
  {
    reference: 'RET-1003',
    customerName: 'Marcus Vance',
    customerEmail: 'm.vance@example.com',
    orderNumber: 'ORD-8814',
    itemName: 'Merino Wool Throw Blanket',
    itemVariant: 'Forest Green · 50x70',
    units: 1,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.OPEN,
    notes: []
  },
  {
    reference: 'RET-1004',
    customerName: 'Sophia Chen',
    customerEmail: 'sophia.c@example.com',
    orderNumber: 'ORD-8809',
    itemName: 'Ribbed Knit Beanie',
    itemVariant: 'Charcoal · One Size',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.OPEN,
    notes: [
      { authorName: 'Customer Portal', body: 'Customer says the fit is much tighter than expected.' }
    ]
  },
  {
    reference: 'RET-1005',
    customerName: 'David Miller',
    customerEmail: 'david.m@example.com',
    orderNumber: 'ORD-8802',
    itemName: 'Minimalist Wall Clock',
    itemVariant: 'Natural Oak · 12 inch',
    units: 1,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.OPEN,
    notes: [
      { authorName: 'Customer Portal', body: 'Customer notes the finish is glossy varnish rather than matte natural wood shown in catalog.' }
    ]
  },
  {
    reference: 'RET-1006',
    customerName: 'Amina Al-Mansoor',
    customerEmail: 'amina.m@example.com',
    orderNumber: 'ORD-8798',
    itemName: 'Waffle Bath Towel Set',
    itemVariant: 'Terracotta · Set of 2',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.OPEN,
    notes: []
  },
  {
    reference: 'RET-1007',
    customerName: 'Liam O’Connor',
    customerEmail: 'liam.oc@example.com',
    orderNumber: 'ORD-8793',
    itemName: 'Cast Iron Skillet',
    itemVariant: '10 inch Pre-seasoned',
    units: 1,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.OPEN,
    notes: [
      { authorName: 'Customer Portal', body: 'Received 8 inch skillet instead of 10 inch.' }
    ]
  },

  // 2. IN_REVIEW requests (under investigation by agent)
  {
    reference: 'RET-1008',
    customerName: 'Daniel Kim',
    customerEmail: 'daniel.k@example.com',
    orderNumber: 'ORD-8785',
    itemName: 'Ceramic Table Lamp',
    itemVariant: 'Ash Gray · US Plug',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Customer Portal', body: 'Base diameter is too wide for standard nightstand.' },
      { authorName: 'Jordan Singh', body: 'Checked specs against product listing. Verifying dimension tolerances with warehouse.' }
    ]
  },
  {
    reference: 'RET-1009',
    customerName: 'Maya Patel',
    customerEmail: 'maya.patel@example.com',
    orderNumber: 'ORD-8780',
    itemName: 'Hand-blown Glass Carafe',
    itemVariant: 'Smoked Amber · 1L',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Customer Portal', body: 'Arrived with hairline fracture along neck.' },
      { authorName: 'Jordan Singh', body: 'Requested damage verification photos from customer via email.' }
    ]
  },
  {
    reference: 'RET-1010',
    customerName: 'Lucas Nguyen',
    customerEmail: 'lucas.n@example.com',
    orderNumber: 'ORD-8774',
    itemName: 'Walnut Bedside Tray',
    itemVariant: 'Solid Walnut · Medium',
    units: 2,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Jordan Singh', body: 'Reviewing customer photo upload. Stain tone looks lighter than showroom batch.' }
    ]
  },
  {
    reference: 'RET-1011',
    customerName: 'Clara Dubois',
    customerEmail: 'clara.d@example.com',
    orderNumber: 'ORD-8769',
    itemName: 'Brass Candle Sconce',
    itemVariant: 'Antique Brass · Pair',
    units: 1,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Jordan Singh', body: 'Customer requesting store credit. Checking if return is within 30-day policy.' }
    ]
  },
  {
    reference: 'RET-1012',
    customerName: 'Oliver Smith',
    customerEmail: 'oliver.s@example.com',
    orderNumber: 'ORD-8763',
    itemName: 'Japanese Steel Chef Knife',
    itemVariant: '8 inch Gyuto',
    units: 1,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Jordan Singh', body: 'Fulfillment error confirmed with shipping partner. Ready for replacement approval.' }
    ]
  },
  {
    reference: 'RET-1013',
    customerName: 'Zoe Kravitz',
    customerEmail: 'zoe.k@example.com',
    orderNumber: 'ORD-8758',
    itemName: 'Organic Linen Sheet Set',
    itemVariant: 'Flax · King',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Jordan Singh', body: 'Customer measured depth at 14"; mattress requires 16" deep pocket.' }
    ]
  },
  {
    reference: 'RET-1014',
    customerName: 'Ethan Wright',
    customerEmail: 'ethan.w@example.com',
    orderNumber: 'ORD-8752',
    itemName: 'Porcelain Dinner Plates',
    itemVariant: 'Matte Bone · Set of 4',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.IN_REVIEW,
    notes: [
      { authorName: 'Jordan Singh', body: 'Two plates broken in transit. Carrier claim filed.' }
    ]
  },

  // 3. APPROVED requests (with valid resolutions)
  {
    reference: 'RET-1015',
    customerName: 'Taylor Brooks',
    customerEmail: 'taylor.b@example.com',
    orderNumber: 'ORD-8745',
    itemName: 'Waffle Organic Robe',
    itemVariant: 'Natural Sand · L/XL',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.APPROVED,
    resolution: Resolution.REPLACEMENT,
    refundAmount: null,
    notes: [
      { authorName: 'Customer Portal', body: 'Customer requested size exchange to S/M.' },
      { authorName: 'Jordan Singh', body: 'Approved exchange. Replacement shipment queued in warehouse.' }
    ]
  },
  {
    reference: 'RET-1016',
    customerName: 'Noah Carter',
    customerEmail: 'noah.c@example.com',
    orderNumber: 'ORD-8739',
    itemName: 'Charcoal Ceramic Planter',
    itemVariant: 'Medium · 8 inch',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.APPROVED,
    resolution: Resolution.REFUND,
    refundAmount: 48.50,
    notes: [
      { authorName: 'Jordan Singh', body: 'Damage photos verified. Approved full refund of $48.50.' }
    ]
  },
  {
    reference: 'RET-1017',
    customerName: 'Isabella Rossi',
    customerEmail: 'isabella.r@example.com',
    orderNumber: 'ORD-8733',
    itemName: 'Handmade Wool Rug',
    itemVariant: 'Ivory/Grey · 4x6 ft',
    units: 1,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.APPROVED,
    resolution: Resolution.STORE_CREDIT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Customer agreed to $180 store credit in lieu of return shipping.' }
    ]
  },
  {
    reference: 'RET-1018',
    customerName: 'Ravi Joshi',
    customerEmail: 'ravi.j@example.com',
    orderNumber: 'ORD-8728',
    itemName: 'Pour-Over Glass Kettle',
    itemVariant: 'Matte Black · 800ml',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.APPROVED,
    resolution: Resolution.REFUND,
    refundAmount: 62.00,
    notes: [
      { authorName: 'Jordan Singh', body: 'Handle damaged during courier transit. Full refund approved.' }
    ]
  },
  {
    reference: 'RET-1019',
    customerName: 'Hannah Abbott',
    customerEmail: 'hannah.a@example.com',
    orderNumber: 'ORD-8721',
    itemName: 'Cotton Percale Pillowcase Pair',
    itemVariant: 'Crisp White · Standard',
    units: 2,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.APPROVED,
    resolution: Resolution.REPLACEMENT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Correct color pair being dispatched today.' }
    ]
  },
  {
    reference: 'RET-1020',
    customerName: 'Gabriel Santos',
    customerEmail: 'gabriel.s@example.com',
    orderNumber: 'ORD-8715',
    itemName: 'Aroma Oil Diffuser',
    itemVariant: 'Stone Grey · Ultrasonic',
    units: 1,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.APPROVED,
    resolution: Resolution.STORE_CREDIT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Unopened box returned. Store credit issued per customer request.' }
    ]
  },
  {
    reference: 'RET-1021',
    customerName: 'Rachel Green',
    customerEmail: 'rachel.g@example.com',
    orderNumber: 'ORD-8709',
    itemName: 'Teak Wood Cutting Board',
    itemVariant: 'End-grain · Large',
    units: 1,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.APPROVED,
    resolution: Resolution.REFUND,
    refundAmount: 75.00,
    notes: [
      { authorName: 'Jordan Singh', body: 'Wood grain differed substantially from promotional images. Approved refund.' }
    ]
  },

  // 4. REJECTED requests (final state, no resolution/refund)
  {
    reference: 'RET-1022',
    customerName: 'Benjamin Scott',
    customerEmail: 'ben.scott@example.com',
    orderNumber: 'ORD-8702',
    itemName: 'Scented Soy Candle',
    itemVariant: 'Cedar & Amber · 12oz',
    units: 1,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Candle was burned over halfway down. Outside store policy on consumable home goods. Request rejected.' }
    ]
  },
  {
    reference: 'RET-1023',
    customerName: 'Chloe Bennett',
    customerEmail: 'chloe.b@example.com',
    orderNumber: 'ORD-8697',
    itemName: 'Leather Journal Notebook',
    itemVariant: 'Cognac · Lined',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Photos show pet bite marks, not transit damage. Return rejected per policy.' }
    ]
  },
  {
    reference: 'RET-1024',
    customerName: 'Samuel Jackson',
    customerEmail: 'samuel.j@example.com',
    orderNumber: 'ORD-8691',
    itemName: 'Cashmere Knit Scarf',
    itemVariant: 'Heather Gray · 70 inch',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Return filed 85 days after delivery date (policy is 30 days). Rejected.' }
    ]
  },
  {
    reference: 'RET-1025',
    customerName: 'Mei-Ling Zhou',
    customerEmail: 'meiling.z@example.com',
    orderNumber: 'ORD-8685',
    itemName: 'Handmade Stoneware Teapot',
    itemVariant: 'Unglazed Clay · 600ml',
    units: 1,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Item in photo matches ordered SKU and specifications accurately. Request rejected.' }
    ]
  },
  {
    reference: 'RET-1026',
    customerName: 'Alex Rivera',
    customerEmail: 'alex.r@example.com',
    orderNumber: 'ORD-8679',
    itemName: 'Stainless Steel Water Bottle',
    itemVariant: 'Matte Olive · 24oz',
    units: 1,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Customer claimed bottle was plastic; verified high-grade 18/8 stainless steel. Rejection confirmed with customer.' }
    ]
  },
  {
    reference: 'RET-1027',
    customerName: 'Fiona Gallagher',
    customerEmail: 'fiona.g@example.com',
    orderNumber: 'ORD-8672',
    itemName: 'Linen Napkins Set',
    itemVariant: 'Sage · Set of 4',
    units: 2,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.REJECTED,
    notes: [
      { authorName: 'Jordan Singh', body: 'Purchased during final clearance final-sale event. Rejected per sale terms.' }
    ]
  },

  // 5. COMPLETED requests (final state, resolved and closed out)
  {
    reference: 'RET-1028',
    customerName: 'Sophie Martin',
    customerEmail: 'sophie.m@example.com',
    orderNumber: 'ORD-8668',
    itemName: 'Linen Duvet Cover',
    itemVariant: 'Natural Linen · Queen',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REFUND,
    refundAmount: 135.00,
    notes: [
      { authorName: 'Customer Portal', body: 'Item returned to warehouse.' },
      { authorName: 'Jordan Singh', body: 'Inspected by warehouse staff. Tag attached and intact.' },
      { authorName: 'Jordan Singh', body: 'Refund of $135.00 processed to customer original payment method. Request completed.' }
    ]
  },
  {
    reference: 'RET-1029',
    customerName: 'Marcus Lee',
    customerEmail: 'marcus.lee@example.com',
    orderNumber: 'ORD-8661',
    itemName: 'Ceramic Serving Bowl',
    itemVariant: 'Speckled White · 11 inch',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REPLACEMENT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Replacement bowl delivered to customer. Tracking confirmed signed. Request closed.' }
    ]
  },
  {
    reference: 'RET-1030',
    customerName: 'Aisha Khan',
    customerEmail: 'aisha.k@example.com',
    orderNumber: 'ORD-8655',
    itemName: 'Woven Storage Basket',
    itemVariant: 'Jute & Cotton · Large',
    units: 2,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.STORE_CREDIT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Store credit voucher #SC-9921 for $88.00 emailed to customer. Return closed.' }
    ]
  },
  {
    reference: 'RET-1031',
    customerName: 'Tyler Ward',
    customerEmail: 'tyler.w@example.com',
    orderNumber: 'ORD-8649',
    itemName: 'Enamel Pouring Pan',
    itemVariant: 'Buttercup Yellow · 1.5qt',
    units: 1,
    reason: RequestReason.NOT_AS_DESCRIBED,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REFUND,
    refundAmount: 42.00,
    notes: [
      { authorName: 'Jordan Singh', body: 'Warehouse verified return receipt. $42.00 refund executed.' }
    ]
  },
  {
    reference: 'RET-1032',
    customerName: 'Grace Hopper',
    customerEmail: 'grace.h@example.com',
    orderNumber: 'ORD-8642',
    itemName: 'Mechanical Desk Clock',
    itemVariant: 'Brushed Brass',
    units: 1,
    reason: RequestReason.DAMAGED,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REPLACEMENT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Replacement clock shipped via priority courier. Confirmed received.' }
    ]
  },
  {
    reference: 'RET-1033',
    customerName: 'Nora Wilson',
    customerEmail: 'nora.w@example.com',
    orderNumber: 'ORD-8636',
    itemName: 'Cotton Bath Mat',
    itemVariant: 'Fog Gray · 20x30 inch',
    units: 2,
    reason: RequestReason.WRONG_ITEM,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REFUND,
    refundAmount: 54.00,
    notes: [
      { authorName: 'Jordan Singh', body: 'Wrong color received by customer. Full refund issued.' }
    ]
  },
  {
    reference: 'RET-1034',
    customerName: 'Carlos Mendoza',
    customerEmail: 'carlos.m@example.com',
    orderNumber: 'ORD-8629',
    itemName: 'Stoneware Flower Vase',
    itemVariant: 'Terracotta Matte · 10 inch',
    units: 1,
    reason: RequestReason.SIZE_ISSUE,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.STORE_CREDIT,
    refundAmount: null,
    notes: [
      { authorName: 'Jordan Singh', body: 'Store credit $38.00 issued. Case resolved.' }
    ]
  },
  {
    reference: 'RET-1035',
    customerName: 'Jessica Biel',
    customerEmail: 'jessica.b@example.com',
    orderNumber: 'ORD-8621',
    itemName: 'Organic Cotton Kitchen Towels',
    itemVariant: 'Stripe Indigo · Set of 3',
    units: 1,
    reason: RequestReason.CHANGED_MIND,
    status: RequestStatus.COMPLETED,
    resolution: Resolution.REFUND,
    refundAmount: 26.00,
    notes: [
      { authorName: 'Jordan Singh', body: 'Unwashed return checked into inventory. Refund issued.' }
    ]
  }
];

async function main() {
  console.log('Seeding ReturnDesk database...');

  // Clean existing tables in correct order
  await prisma.note.deleteMany();
  await prisma.returnRequest.deleteMany();

  for (const item of mockRequests) {
    const { notes, ...requestData } = item;
    const request = await prisma.returnRequest.create({
      data: {
        reference: requestData.reference,
        customerName: requestData.customerName,
        customerEmail: requestData.customerEmail,
        orderNumber: requestData.orderNumber,
        itemName: requestData.itemName,
        itemVariant: requestData.itemVariant,
        units: requestData.units,
        reason: requestData.reason,
        status: requestData.status,
        resolution: requestData.resolution,
        refundAmount: requestData.refundAmount,
      }
    });

    if (notes && notes.length > 0) {
      for (const note of notes) {
        await prisma.note.create({
          data: {
            requestId: request.id,
            authorName: note.authorName,
            body: note.body
          }
        });
      }
    }
  }

  const count = await prisma.returnRequest.count();
  const notesCount = await prisma.note.count();
  console.log(`Successfully seeded ${count} return requests with ${notesCount} notes.`);
}

main()
  .catch((e) => {
    console.error('Failed to seed database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
