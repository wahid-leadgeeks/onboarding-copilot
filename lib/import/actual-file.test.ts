import fs from 'fs';
import { importScheduleFromFile } from './import-schedule';
import { isActivity } from '@/lib/sheets/types';

describe('Onboarding Kit Final 2026 - IT Staff.xlsx', () => {
  const filePath = '/home/noah/Downloads/Onboarding Kit Final 2026 - IT Staff.xlsx';

  it('successfully imports schedule and diary from actual HR Excel file', () => {
    if (!fs.existsSync(filePath)) {
      console.warn('File not found, skipping integration test');
      return;
    }
    const buf = fs.readFileSync(filePath);
    const result = importScheduleFromFile(new Uint8Array(buf), 'Onboarding Kit Final 2026 - IT Staff.xlsx');

    expect(result.activities).toHaveLength(59);
    expect(result.activities.every(isActivity)).toBe(true);

    console.log('Imported total activities:', result.activities.length);
    console.log('Skipped rows:', result.skipped);
    console.log('Warnings:', result.warnings);

    const doneActivities = result.activities.filter(a => a.status === 'done');
    const upcomingActivities = result.activities.filter(a => a.status === 'not-started');
    console.log('Done activities count:', doneActivities.length);
    console.log('Upcoming activities count:', upcomingActivities.length);

    expect(doneActivities).toHaveLength(18);
    expect(upcomingActivities).toHaveLength(41);

    // Verify first activity
    const first = result.activities[0];
    expect(first.name).toBe('Introduction to Onboarding Framework');
    expect(first.plannedStart).toBe('08:30');
    expect(first.plannedEnd).toBe('09:00');
    expect(first.status).toBe('done');
    expect(first.durationMinutes).toBe(30);
    expect(first.date).toBe('2026-09-01');

    // Verify diary entries
    expect(result.diary?.length).toBe(10);
    console.log('Imported diary entries:', result.diary!.length);
    console.log('Sample diary entry:', result.diary![0]);
  });

  it('tests POST /api/import route with the real file', async () => {
    if (!fs.existsSync(filePath)) return;
    const { POST } = await import('@/app/api/import/route');
    const buf = fs.readFileSync(filePath);
    const file = new File([buf], 'Onboarding Kit Final 2026 - IT Staff.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const formData = new FormData();
    formData.append('file', file);
    const req = new Request('http://localhost:3000/api/import', {
      method: 'POST',
      body: formData,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.activities).toHaveLength(59);
    expect(json.skipped).toBe(0);
    expect(json.diary?.length).toBe(10);
  });
});
