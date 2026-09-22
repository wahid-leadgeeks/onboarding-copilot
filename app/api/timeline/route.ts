import { NextResponse } from 'next/server';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc, eq } from 'drizzle-orm';
import { TIMELINE_STAGES } from '@/lib/timeline';

export async function GET() {
  if (isDbConfigured()) {
    try {
      const rows = await db.select().from(schema.timelineStages).orderBy(asc(schema.timelineStages.stageNumber));
      if (rows && rows.length > 0) {
        return NextResponse.json({
          success: true,
          stages: rows,
        });
      }
    } catch (err) {
      console.warn('Database timeline query failed:', err);
    }
  }

  return NextResponse.json({
    success: true,
    stages: TIMELINE_STAGES.map((s) => ({
      id: s.id,
      stageNumber: s.stageNumber,
      stageName: s.stageName,
      startDate: '01/09/2026',
      endDate: '30/09/2026',
      objective: s.objective,
      keyActivities: s.keyActivities,
      outputsEvidence: s.evidenceDeliverables?.map((d) => d.text).join('\n') || '',
      minimumDuration: s.duration || '1 Month',
      completedEvidence: [],
      updatedAt: null,
    })),
  });
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ success: true, message: 'Database not configured' });
  }

  const body = (await request.json().catch(() => null)) as {
    stageId?: string;
    completedEvidence?: string[];
    startDate?: string;
    endDate?: string;
  } | null;

  if (!body?.stageId) {
    return NextResponse.json({ error: 'stageId is required' }, { status: 400 });
  }

  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (Array.isArray(body.completedEvidence)) {
      updateData.completedEvidence = body.completedEvidence;
    }
    if (body.startDate) {
      updateData.startDate = body.startDate;
    }
    if (body.endDate) {
      updateData.endDate = body.endDate;
    }

    await db
      .update(schema.timelineStages)
      .set(updateData)
      .where(eq(schema.timelineStages.id, body.stageId));

    return NextResponse.json({ success: true, stageId: body.stageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update timeline stage';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
