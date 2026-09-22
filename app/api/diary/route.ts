import { NextResponse } from 'next/server';
import { writeDiary } from '@/lib/sheets/client';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
  if (isDbConfigured()) {
    try {
      const [topics, entries] = await Promise.all([
        db.select().from(schema.diaryTopics).orderBy(asc(schema.diaryTopics.rowNumber)),
        db.select().from(schema.diaryEntries).orderBy(asc(schema.diaryEntries.rowNumber)),
      ]);
      return NextResponse.json({
        success: true,
        topics,
        entries: entries.map((e) => ({
          rowNumber: e.rowNumber,
          learned: e.learned,
          notes: e.notes,
          updatedAt: e.updatedAt,
          syncedToSheets: true,
          syncedAt: e.updatedAt,
        })),
      });
    } catch (err) {
      console.warn('Failed to fetch diary from database:', err);
    }
  }

  return NextResponse.json({ success: true, topics: [], entries: [] });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Learning content is required' }, { status: 400 });
  }

  const data = body as {
    content?: string;
    rowNumber?: number;
    learned?: string;
    notes?: string;
  };

  // If saving structured diary entry with rowNumber
  if (isDbConfigured() && typeof data.rowNumber === 'number') {
    const row = data.rowNumber;
    const learned = data.learned ?? '';
    const notes = data.notes ?? data.content ?? '';
    const updatedAt = new Date().toISOString();

    try {
      await db
        .insert(schema.diaryEntries)
        .values({
          id: `entry-${row}`,
          rowNumber: row,
          learned,
          notes,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: schema.diaryEntries.rowNumber,
          set: {
            learned,
            notes,
            updatedAt,
          },
        });

      return NextResponse.json(
        {
          success: true,
          rowNumber: row,
          learned,
          notes,
          syncStatus: 'synced',
        },
        { status: 201 }
      );
    } catch (err) {
      console.warn('Database diary write failed:', err);
    }
  }

  // Standard legacy content payload
  if (typeof data.content !== 'string') {
    return NextResponse.json({ error: 'Learning content is required' }, { status: 400 });
  }

  const content = data.content.trim();
  if (!content) return NextResponse.json({ error: 'Learning content cannot be empty' }, { status: 400 });
  if (content.length > 10_000) return NextResponse.json({ error: 'Learning content is too long' }, { status: 413 });

  try {
    const synced = await writeDiary(content);
    return NextResponse.json({ content, syncStatus: synced ? 'synced' : 'pending' }, { status: 201 });
  } catch {
    return NextResponse.json({ content, syncStatus: 'pending' }, { status: 201 });
  }
}
