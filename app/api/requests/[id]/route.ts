import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RequestReason, RequestStatus, Resolution } from '@prisma/client';

const transitions: Record<RequestStatus, RequestStatus[]> = {
  OPEN: [RequestStatus.IN_REVIEW],
  IN_REVIEW: [RequestStatus.APPROVED, RequestStatus.REJECTED],
  APPROVED: [RequestStatus.COMPLETED],
  REJECTED: [],
  COMPLETED: []
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!item || item.removedAt !== null) {
      return NextResponse.json(
        { error: 'Return request not found or has been removed.', code: 'REQUEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error: any) {
    console.error('Error fetching request by id:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching the request.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request payload.', code: 'INVALID_PAYLOAD' },
        { status: 400 }
      );
    }

    const current = await prisma.returnRequest.findUnique({ where: { id } });
    if (!current || current.removedAt !== null) {
      return NextResponse.json(
        { error: 'Return request not found or has been removed.', code: 'REQUEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // 1. Status Flow Validation (Rule 1)
    if (body.status && body.status !== current.status) {
      const validStatuses = Object.values(RequestStatus);
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status: "${body.status}".`, code: 'INVALID_STATUS' },
          { status: 400 }
        );
      }

      const allowedTransitions = transitions[current.status] || [];
      if (!allowedTransitions.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition request from ${current.status} to ${body.status}. Legal lifecycle: Open → In Review → Approved/Rejected → Completed. Rejected and Completed are final.`,
            code: 'ILLEGAL_STATUS_TRANSITION'
          },
          { status: 409 }
        );
      }

      updateData.status = body.status;
    }

    const targetStatus: RequestStatus = updateData.status ?? current.status;

    // 2. Approval & Resolution Validation (Rule 2)
    if (targetStatus === RequestStatus.APPROVED) {
      const resolution = body.resolution !== undefined ? body.resolution : current.resolution;
      if (!resolution || !Object.values(Resolution).includes(resolution)) {
        return NextResponse.json(
          {
            error: 'A request cannot become Approved without a resolution of Refund, Replacement or Store Credit.',
            code: 'RESOLUTION_REQUIRED'
          },
          { status: 422 }
        );
      }

      updateData.resolution = resolution;

      if (resolution === Resolution.REFUND) {
        const amount = body.refundAmount !== undefined ? Number(body.refundAmount) : (current.refundAmount ? Number(current.refundAmount) : 0);
        if (isNaN(amount) || amount <= 0) {
          return NextResponse.json(
            {
              error: 'If the resolution is Refund, a refund amount greater than zero is required.',
              code: 'REFUND_AMOUNT_REQUIRED'
            },
            { status: 422 }
          );
        }
        updateData.refundAmount = amount;
      } else {
        // If resolution is not Refund, no refund amount may be recorded.
        if (body.refundAmount !== undefined && body.refundAmount !== null && Number(body.refundAmount) > 0) {
          return NextResponse.json(
            {
              error: 'If the resolution is not Refund, no refund amount may be recorded.',
              code: 'INVALID_REFUND_AMOUNT'
            },
            { status: 422 }
          );
        }
        updateData.refundAmount = null;
      }
    } else if (body.resolution !== undefined && targetStatus !== RequestStatus.COMPLETED) {
      // Trying to set resolution when not Approved or Completed
      if (body.resolution !== null) {
        return NextResponse.json(
          {
            error: 'Resolution can only be set when approving a request.',
            code: 'RESOLUTION_NOT_ALLOWED'
          },
          { status: 422 }
        );
      }
      updateData.resolution = null;
      updateData.refundAmount = null;
    }

    // 3. Locked Once Decided Validation (Rule 4)
    const isDecided = ([RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.COMPLETED] as RequestStatus[]).includes(current.status);
    const detailFields = ['customerName', 'customerEmail', 'orderNumber', 'itemName', 'itemVariant', 'units', 'reason'] as const;

    if (isDecided) {
      for (const field of detailFields) {
        if (body[field] !== undefined) {
          const currentVal = current[field as keyof typeof current];
          const newVal = field === 'units' ? Number(body[field]) : (body[field] === '' ? null : body[field]);
          if (String(newVal ?? '') !== String(currentVal ?? '')) {
            return NextResponse.json(
              {
                error: `Once a request reaches ${current.status}, its customer and item details can no longer be edited.`,
                code: 'REQUEST_LOCKED'
              },
              { status: 409 }
            );
          }
        }
      }
    } else {
      // 4. Undecided request: Editing details is allowed, but check Rule 3 (One live request per item)
      let targetOrder = current.orderNumber;
      let targetItem = current.itemName;
      let orderOrItemChanged = false;

      if (body.customerName !== undefined) {
        if (!body.customerName?.trim()) {
          return NextResponse.json({ error: 'Customer name cannot be empty.', code: 'INVALID_CUSTOMER_NAME' }, { status: 400 });
        }
        updateData.customerName = body.customerName.trim();
      }

      if (body.customerEmail !== undefined) {
        if (!body.customerEmail?.trim() || !body.customerEmail.includes('@')) {
          return NextResponse.json({ error: 'Valid customer email is required.', code: 'INVALID_CUSTOMER_EMAIL' }, { status: 400 });
        }
        updateData.customerEmail = body.customerEmail.trim().toLowerCase();
      }

      if (body.orderNumber !== undefined && body.orderNumber.trim() !== current.orderNumber) {
        if (!body.orderNumber.trim()) {
          return NextResponse.json({ error: 'Order number cannot be empty.', code: 'INVALID_ORDER_NUMBER' }, { status: 400 });
        }
        targetOrder = body.orderNumber.trim();
        updateData.orderNumber = targetOrder;
        orderOrItemChanged = true;
      }

      if (body.itemName !== undefined && body.itemName.trim() !== current.itemName) {
        if (!body.itemName.trim()) {
          return NextResponse.json({ error: 'Item name cannot be empty.', code: 'INVALID_ITEM_NAME' }, { status: 400 });
        }
        targetItem = body.itemName.trim();
        updateData.itemName = targetItem;
        orderOrItemChanged = true;
      }

      if (body.itemVariant !== undefined) {
        updateData.itemVariant = body.itemVariant ? body.itemVariant.trim() : null;
      }

      if (body.units !== undefined) {
        const unitsVal = parseInt(body.units, 10);
        if (isNaN(unitsVal) || unitsVal < 1) {
          return NextResponse.json({ error: 'Units must be at least 1.', code: 'INVALID_UNITS' }, { status: 400 });
        }
        updateData.units = unitsVal;
      }

      if (body.reason !== undefined) {
        const normalizedReason = typeof body.reason === 'string' ? body.reason.toUpperCase().replace(/ /g, '_') : '';
        if (!Object.values(RequestReason).includes(normalizedReason as any)) {
          return NextResponse.json(
            { error: 'Invalid reason. Must be one of: Damaged, Wrong Item, Size Issue, Not As Described, Changed Mind.', code: 'INVALID_REASON' },
            { status: 400 }
          );
        }
        updateData.reason = normalizedReason as RequestReason;
      }

      // Check Rule 3 if order or item name changed
      if (orderOrItemChanged) {
        const duplicate = await prisma.returnRequest.findFirst({
          where: {
            id: { not: current.id },
            orderNumber: { equals: targetOrder, mode: 'insensitive' },
            itemName: { equals: targetItem, mode: 'insensitive' },
            removedAt: null,
            status: { notIn: [RequestStatus.REJECTED, RequestStatus.COMPLETED] }
          }
        });

        if (duplicate) {
          return NextResponse.json(
            {
              error: `A live request (${duplicate.reference}) already exists for "${targetItem}" on order "${targetOrder}". A customer cannot have two live requests for the same item on the same order.`,
              code: 'DUPLICATE_LIVE_REQUEST'
            },
            { status: 409 }
          );
        }
      }
    }

    const updated = await prisma.returnRequest.update({
      where: { id },
      data: updateData,
      include: {
        notes: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while updating the request.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const current = await prisma.returnRequest.findUnique({ where: { id } });

    if (!current || current.removedAt !== null) {
      return NextResponse.json(
        { error: 'Return request not found or has already been removed.', code: 'REQUEST_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Rule 5: Only requests that are Open or Rejected may be removed; anything else must be refused.
    if (!([RequestStatus.OPEN, RequestStatus.REJECTED] as RequestStatus[]).includes(current.status)) {
      return NextResponse.json(
        {
          error: `Only requests that are Open or Rejected can be removed from the desk. Requests in '${current.status}' status cannot be removed.`,
          code: 'CANNOT_REMOVE_REQUEST'
        },
        { status: 409 }
      );
    }

    // Soft delete: record remains in database, removedAt is set
    await prisma.returnRequest.update({
      where: { id },
      data: { removedAt: new Date() }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error('Error removing request:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while removing the request.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
