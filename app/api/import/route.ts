import { NextResponse } from 'next/server';
import { importScheduleFromFile } from '@/lib/import/import-schedule';
import { ImportError } from '@/lib/import/error';
import { isActivity } from '@/lib/sheets/types';

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'The file is larger than 2 MB.' }, { status: 413 });
  let result: ReturnType<typeof importScheduleFromFile>;
  try {
    result = importScheduleFromFile(new Uint8Array(await file.arrayBuffer()), file.name);
  } catch (error) {
    if (error instanceof ImportError) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ error: 'The file could not be processed.' }, { status: 500 });
  }
  if (!result.activities.every(isActivity)) return NextResponse.json({ error: 'The imported schedule contained invalid rows.' }, { status: 422 });
  return NextResponse.json({ activities: result.activities, skipped: result.skipped, warnings: result.warnings, diary: result.diary });
}
