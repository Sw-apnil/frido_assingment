import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const statusMap: Record<string, string> = { 'In review': 'IN_REVIEW', Approved: 'APPROVED', Rejected: 'REJECTED', Completed: 'COMPLETED', Open: 'OPEN' };
const reasonMap: Record<string, string> = { Damaged: 'DAMAGED', 'Wrong Item': 'WRONG_ITEM', 'Size Issue': 'SIZE_ISSUE', 'Not As Described': 'NOT_AS_DESCRIBED', 'Changed Mind': 'CHANGED_MIND', 'Allergic Reaction': 'ALLERGIC_REACTION' };

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams; const page = Math.max(1, Number(p.get('page') || 1)); const pageSize = Math.min(100, Math.max(1, Number(p.get('pageSize') || 20))); const q = p.get('q')?.trim() || undefined; const status = p.get('status') ? statusMap[p.get('status')!] : undefined; const reason = p.get('reason') ? reasonMap[p.get('reason')!] : undefined; const sort = p.get('sort') === 'oldest' ? 'asc' : 'desc';
  const where = { removedAt: null, ...(status ? { status: status as never } : {}), ...(reason ? { reason: reason as never } : {}), ...(q ? { OR: [{ reference: { contains: q, mode: 'insensitive' as const } }, { customerName: { contains: q, mode: 'insensitive' as const } }, { orderNumber: { contains: q, mode: 'insensitive' as const } }, { itemName: { contains: q, mode: 'insensitive' as const } }] } : {}) };
  const [items, total] = await Promise.all([prisma.returnRequest.findMany({ where, include: { notes: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: sort }, skip: (page - 1) * pageSize, take: pageSize }), prisma.returnRequest.count({ where })]);
  return NextResponse.json({ items, page, pageSize, total, pages: Math.ceil(total / pageSize) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.customerName || !body.orderNumber || !body.itemName || !body.reason || !reasonMap[body.reason]) return NextResponse.json({ error: 'customerName, orderNumber, itemName and a valid reason are required.' }, { status: 400 });
  const existing = await prisma.returnRequest.findFirst({ where: { orderNumber: body.orderNumber, itemName: body.itemName, removedAt: null, status: { notIn: ['REJECTED', 'COMPLETED'] } } });
  if (existing) return NextResponse.json({ error: 'A live request already exists for this item on this order.' }, { status: 409 });
  const created = await prisma.returnRequest.create({ data: { reference: `RMA-${Date.now().toString().slice(-6)}`, customerName: body.customerName, customerEmail: body.customerEmail || '', orderNumber: body.orderNumber, itemName: body.itemName, itemVariant: body.itemVariant || '', reason: reasonMap[body.reason] as never } });
  return NextResponse.json(created, { status: 201 });
}
