import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const transitions: Record<string, string[]> = { OPEN: ['IN_REVIEW'], IN_REVIEW: ['APPROVED', 'REJECTED'], APPROVED: ['COMPLETED'], REJECTED: [], COMPLETED: [] };
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const body = await request.json(); const current = await prisma.returnRequest.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Return request not found.' }, { status: 404 });
  if (body.status && !transitions[current.status].includes(body.status)) return NextResponse.json({ error: `Cannot move a ${current.status} request to ${body.status}.` }, { status: 409 });
  if (body.status === 'APPROVED' && !body.resolution && !current.resolution) return NextResponse.json({ error: 'A resolution is required before approval.' }, { status: 422 });
  const resolution = body.resolution ?? current.resolution;
  if (body.status === 'APPROVED' && resolution === 'REFUND' && Number(body.refundAmount ?? current.refundAmount ?? 0) <= 0) return NextResponse.json({ error: 'Refund amount must be greater than zero.' }, { status: 422 });
  if (resolution && resolution !== 'REFUND' && (body.refundAmount !== undefined || current.refundAmount !== null)) return NextResponse.json({ error: 'Only refund resolutions may have a refund amount.' }, { status: 422 });
  if (['APPROVED', 'REJECTED', 'COMPLETED'].includes(current.status) && (body.customerName || body.customerEmail || body.orderNumber || body.itemName || body.itemVariant)) return NextResponse.json({ error: 'Decisioned request details are locked.' }, { status: 409 });
  const updated = await prisma.returnRequest.update({ where: { id }, data: { status: body.status, resolution: body.resolution, refundAmount: body.refundAmount, customerName: body.customerName, customerEmail: body.customerEmail, orderNumber: body.orderNumber, itemName: body.itemName, itemVariant: body.itemVariant } });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const current = await prisma.returnRequest.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: 'Return request not found.' }, { status: 404 });
  if (!['OPEN', 'REJECTED'].includes(current.status)) return NextResponse.json({ error: 'Only Open or Rejected requests can be removed.' }, { status: 409 });
  await prisma.returnRequest.update({ where: { id }, data: { removedAt: new Date() } }); return new NextResponse(null, { status: 204 });
}
