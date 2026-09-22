import { NextResponse } from 'next/server';
import { db, schema, isDbConfigured } from '@/lib/db';
import { asc } from 'drizzle-orm';
import { OFFICIAL_TRAINING_MODULES, type TrainingModule } from '@/lib/glossary';

export async function GET() {
  if (isDbConfigured()) {
    try {
      const rows = await db.select().from(schema.trainingModules).orderBy(asc(schema.trainingModules.id));
      if (rows && rows.length > 0) {
        const modules: TrainingModule[] = rows.map((r) => ({
          id: r.id,
          topic: r.topic,
          pic: r.pic,
          objectives: r.objectives,
          frameworkMaterials: r.frameworkMaterials,
          materials: r.materials,
          media: r.media,
          durationMinutes: r.durationMinutes,
          materialAccess: r.materialAccess || undefined,
          materialLinks: (r.materialLinks as any) || undefined,
          notes: r.notes || undefined,
        }));
        return NextResponse.json({
          success: true,
          modules,
        });
      }
    } catch (err) {
      console.warn('Database training modules query failed:', err);
    }
  }

  return NextResponse.json({
    success: true,
    modules: OFFICIAL_TRAINING_MODULES,
  });
}
