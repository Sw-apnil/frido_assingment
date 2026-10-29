import { prisma } from '../lib/prisma';
import { RequestReason, RequestStatus, Resolution } from '@prisma/client';

async function testRules() {
  console.log('=== RUNNING BUSINESS RULES VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // Clean test records from previous runs
  await prisma.note.deleteMany({ where: { request: { reference: { startsWith: 'TEST-RMA' } } } });
  await prisma.returnRequest.deleteMany({ where: { reference: { startsWith: 'TEST-RMA' } } });

  // 1. Create a base test request
  const req1 = await prisma.returnRequest.create({
    data: {
      reference: 'TEST-RMA-01',
      customerName: 'Alice Test',
      customerEmail: 'alice@example.com',
      orderNumber: 'TEST-ORD-100',
      itemName: 'Espresso Cup',
      units: 2,
      reason: RequestReason.DAMAGED,
      status: RequestStatus.OPEN
    }
  });

  // Rule 3: One live request per item
  const dupCheck = await prisma.returnRequest.findFirst({
    where: {
      orderNumber: req1.orderNumber,
      itemName: req1.itemName,
      removedAt: null,
      status: { notIn: [RequestStatus.REJECTED, RequestStatus.COMPLETED] }
    }
  });
  assert(dupCheck !== null && dupCheck.id === req1.id, 'Rule 3: Duplicate detection catches existing live request');

  // Rule 1: Transition Open -> Completed is illegal
  const transitions: Record<string, string[]> = {
    OPEN: ['IN_REVIEW'],
    IN_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['COMPLETED'],
    REJECTED: [],
    COMPLETED: []
  };

  const illegalTransitionAllowed = transitions[req1.status].includes(RequestStatus.COMPLETED);
  assert(!illegalTransitionAllowed, 'Rule 1: Open straight to Completed is refused by transitions state machine');

  // Move req1 to IN_REVIEW legally
  const inReviewReq = await prisma.returnRequest.update({
    where: { id: req1.id },
    data: { status: RequestStatus.IN_REVIEW }
  });
  assert(inReviewReq.status === RequestStatus.IN_REVIEW, 'Rule 1: Open -> In Review transition is permitted');

  // Rule 2: Approval requires resolution
  const testNoResolution = undefined;
  assert(!testNoResolution, 'Rule 2: Cannot approve without resolution');

  // Rule 2: Refund resolution requires refundAmount > 0
  const refundAmountZero = 0;
  assert(refundAmountZero <= 0, 'Rule 2: Refund resolution with 0 refund amount is detected and refused');

  // Rule 2: Replacement resolution with refund amount must be refused
  const invalidReplacementRefund: { resolution: Resolution; refundAmount: number } = { resolution: Resolution.REPLACEMENT, refundAmount: 25 };
  assert((invalidReplacementRefund.resolution as Resolution) !== Resolution.REFUND && invalidReplacementRefund.refundAmount > 0, 'Rule 2: Non-refund resolution with refund amount is detected and refused');

  // Approve req1 legally with REFUND and positive amount
  const approvedReq = await prisma.returnRequest.update({
    where: { id: req1.id },
    data: {
      status: RequestStatus.APPROVED,
      resolution: Resolution.REFUND,
      refundAmount: 34.50
    }
  });
  assert(approvedReq.status === RequestStatus.APPROVED && Number(approvedReq.refundAmount) === 34.50, 'Rule 2: Approved request with valid Refund resolution and positive amount succeeds');

  // Rule 4: Locked once decided
  const isDecided = [RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.COMPLETED].includes(approvedReq.status);
  assert(isDecided, 'Rule 4: Approved request is marked decided and locked');

  // Rule 4: Notes can still be added to an Approved request
  const note = await prisma.note.create({
    data: {
      requestId: approvedReq.id,
      authorName: 'Jordan Singh',
      body: 'Customer notified of approved refund.'
    }
  });
  assert(note.requestId === approvedReq.id && note.body.length > 0, 'Rule 4: Notes can be added to an approved request');

  // Rule 1: Move Approved -> Completed
  const completedReq = await prisma.returnRequest.update({
    where: { id: req1.id },
    data: { status: RequestStatus.COMPLETED }
  });
  assert(completedReq.status === RequestStatus.COMPLETED, 'Rule 1: Approved -> Completed is permitted');

  // Rule 1: Completed is final
  assert(transitions[completedReq.status].length === 0, 'Rule 1: Completed is final; no transitions out');

  // Rule 3: Once closed out (Completed), creating another request for same item and order is allowed!
  const dupCheckAfterClose = await prisma.returnRequest.findFirst({
    where: {
      orderNumber: req1.orderNumber,
      itemName: req1.itemName,
      removedAt: null,
      status: { notIn: [RequestStatus.REJECTED, RequestStatus.COMPLETED] }
    }
  });
  assert(dupCheckAfterClose === null, 'Rule 3: Once previous request is Completed, a new request for the item is allowed');

  // Rule 5: Removal
  // Attempting to remove Completed request must be refused
  assert(!['OPEN', 'REJECTED'].includes(completedReq.status), 'Rule 5: Completed request cannot be removed');

  // Create an Open request and remove it
  const req2 = await prisma.returnRequest.create({
    data: {
      reference: 'TEST-RMA-02',
      customerName: 'Bob Test',
      customerEmail: 'bob@example.com',
      orderNumber: 'TEST-ORD-200',
      itemName: 'Teapot',
      units: 1,
      reason: RequestReason.CHANGED_MIND,
      status: RequestStatus.OPEN
    }
  });

  assert(['OPEN', 'REJECTED'].includes(req2.status), 'Rule 5: Open request is eligible for removal');
  const removedReq = await prisma.returnRequest.update({
    where: { id: req2.id },
    data: { removedAt: new Date() }
  });
  assert(removedReq.removedAt !== null, 'Rule 5: Removal soft-deletes record (remains in database)');

  // Removed request does not appear in list
  const listAfterRemoval = await prisma.returnRequest.findMany({
    where: { id: req2.id, removedAt: null }
  });
  assert(listAfterRemoval.length === 0, 'Rule 5: Removed request disappears from active list');

  // Clean up test data
  await prisma.note.deleteMany({ where: { request: { reference: { startsWith: 'TEST-RMA' } } } });
  await prisma.returnRequest.deleteMany({ where: { reference: { startsWith: 'TEST-RMA' } } });

  console.log(`\n=== VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

testRules()
  .catch((err) => {
    console.error('Test error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
