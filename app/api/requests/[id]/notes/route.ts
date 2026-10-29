import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json(); if (!body.body?.trim()) return NextResponse.json({ error: 'Note body is required.' }, { status: 400 }); const note = await prisma.note.create({ data: { requestId: id, body: body.body.trim(), authorName: body.authorName || 'Jordan Singh' } }); return NextResponse.json(note, { status: 201 }); }
