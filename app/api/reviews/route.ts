import { NextResponse } from 'next/server';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';

export async function GET() {
  if (isDbConfigured()) {
    try {
      const rows = await db.select().from(schema.monthlyReviews).orderBy(asc(schema.monthlyReviews.month));
      return NextResponse.json({
        success: true,
        reviews: rows,
      });
    } catch (err) {
      console.warn('Database reviews query failed:', err);
    }
  }

  return NextResponse.json({
    success: true,
    reviews: [1, 2, 3].map((month) => ({
      id: `month-${month}`,
      month,
      achievements: '',
      challenges: '',
      goalsNextMonth: '',
      technicalRatings: {},
      valuesRatings: {},
      updatedAt: new Date().toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ success: true, message: 'Database not configured' });
  }

  const body = (await request.json().catch(() => null)) as {
    month?: number;
    achievements?: string;
    challenges?: string;
    goalsNextMonth?: string;
    technicalRatings?: Record<string, number>;
    valuesRatings?: Record<string, number>;
  } | null;

  if (typeof body?.month !== 'number' || body.month < 1 || body.month > 3) {
    return NextResponse.json({ error: 'Valid month (1, 2, or 3) is required' }, { status: 400 });
  }

  try {
    const updatedAt = new Date().toISOString();
    await db
      .insert(schema.monthlyReviews)
      .values({
        id: `month-${body.month}`,
        month: body.month,
        achievements: body.achievements ?? '',
        challenges: body.challenges ?? '',
        goalsNextMonth: body.goalsNextMonth ?? '',
        technicalRatings: body.technicalRatings as any,
        valuesRatings: body.valuesRatings as any,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: schema.monthlyReviews.month,
        set: {
          achievements: body.achievements ?? undefined,
          challenges: body.challenges ?? undefined,
          goalsNextMonth: body.goalsNextMonth ?? undefined,
          technicalRatings: (body.technicalRatings as any) ?? undefined,
          valuesRatings: (body.valuesRatings as any) ?? undefined,
          updatedAt,
        },
      });

    return NextResponse.json({ success: true, month: body.month });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update monthly review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
