import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestReason, RequestStatus } from '@prisma/client';

async function generateReference(): Promise<string> {
  const year = new Date().getFullYear().toString().slice(-2);
  for (let attempt = 0; attempt < 5; attempt++) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ref = `RET-${year}-${randomNum}`;
    const exists = await prisma.returnRequest.findUnique({ where: { reference: ref } });
    if (!exists) return ref;
  }
  return `RET-${Date.now().toString().slice(-6)}`;
}

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(p.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(p.get('pageSize') || '10', 10)));
    const q = p.get('q')?.trim() || '';
    const statusParam = p.get('status')?.toUpperCase().replace(/ /g, '_');
    const reasonParam = p.get('reason')?.toUpperCase().replace(/ /g, '_');
    const sortParam = p.get('sort') === 'oldest' ? 'asc' : 'desc';

    const validStatuses = Object.values(RequestStatus);
    const validReasons = Object.values(RequestReason);

    const status = validStatuses.includes(statusParam as any) ? (statusParam as RequestStatus) : undefined;
    const reason = validReasons.includes(reasonParam as any) ? (reasonParam as RequestReason) : undefined;

    const where: any = {
      removedAt: null,
      ...(status ? { status } : {}),
      ...(reason ? { reason } : {})
    };

    if (q) {
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { itemName: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.returnRequest.findMany({
        where,
        include: {
          notes: {
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: sortParam },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.returnRequest.count({ where })
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error('Error fetching requests:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching requests.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const { customerName, customerEmail, orderNumber, itemName, itemVariant, units, reason, initialNote } = body;

    if (!customerName || typeof customerName !== 'string' || !customerName.trim()) {
      return NextResponse.json(
        { error: 'Customer name is required.', code: 'INVALID_CUSTOMER_NAME' },
        { status: 400 }
      );
    }
    if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
      return NextResponse.json(
        { error: 'A valid customer email is required to reach the customer.', code: 'INVALID_CUSTOMER_EMAIL' },
        { status: 400 }
      );
    }
    if (!orderNumber || typeof orderNumber !== 'string' || !orderNumber.trim()) {
      return NextResponse.json(
        { error: 'Order number is required.', code: 'INVALID_ORDER_NUMBER' },
        { status: 400 }
      );
    }
    if (!itemName || typeof itemName !== 'string' || !itemName.trim()) {
      return NextResponse.json(
        { error: 'Item name is required.', code: 'INVALID_ITEM_NAME' },
        { status: 400 }
      );
    }

    const parsedUnits = units !== undefined ? parseInt(units, 10) : 1;
    if (isNaN(parsedUnits) || parsedUnits < 1) {
      return NextResponse.json(
        { error: 'Units must be a positive integer of at least 1.', code: 'INVALID_UNITS' },
        { status: 400 }
      );
    }

    // Reason validation (must be one of the 5 allowed reasons)
    const normalizedReason = typeof reason === 'string' ? reason.toUpperCase().replace(/ /g, '_') : '';
    if (!Object.values(RequestReason).includes(normalizedReason as any)) {
      return NextResponse.json(
        {
          error: 'Invalid reason. Must be one of: Damaged, Wrong Item, Size Issue, Not As Described, Changed Mind.',
          code: 'INVALID_REASON'
        },
        { status: 400 }
      );
    }

    // Business Rule 3: One live request per item on an order
    const existingLiveRequest = await prisma.returnRequest.findFirst({
      where: {
        orderNumber: { equals: orderNumber.trim(), mode: 'insensitive' },
        itemName: { equals: itemName.trim(), mode: 'insensitive' },
        removedAt: null,
        status: { notIn: [RequestStatus.REJECTED, RequestStatus.COMPLETED] }
      }
    });

    if (existingLiveRequest) {
      return NextResponse.json(
        {
          error: `A live request (${existingLiveRequest.reference}) already exists for "${itemName.trim()}" on order "${orderNumber.trim()}". Only one active request is allowed per item.`,
          code: 'DUPLICATE_LIVE_REQUEST'
        },
        { status: 409 }
      );
    }

    const reference = await generateReference();

    const created = await prisma.returnRequest.create({
      data: {
        reference,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        orderNumber: orderNumber.trim(),
        itemName: itemName.trim(),
        itemVariant: itemVariant ? itemVariant.trim() : null,
        units: parsedUnits,
        reason: normalizedReason as RequestReason,
        status: RequestStatus.OPEN,
        ...(initialNote && typeof initialNote === 'string' && initialNote.trim()
          ? {
              notes: {
                create: {
                  authorName: customerName.trim(),
                  body: initialNote.trim()
                }
              }
            }
          : {})
      },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the request.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
