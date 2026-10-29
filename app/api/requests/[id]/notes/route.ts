import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
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

    if (!body.body || typeof body.body !== 'string' || !body.body.trim()) {
      return NextResponse.json(
        { error: 'Note text cannot be empty.', code: 'INVALID_NOTE_BODY' },
        { status: 400 }
      );
    }

    const note = await prisma.note.create({
      data: {
        requestId: id,
        body: body.body.trim(),
        authorName: (body.authorName && typeof body.authorName === 'string' && body.authorName.trim()) || 'Jordan Singh'
      }
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error: any) {
    console.error('Error adding note:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while adding the note.', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
