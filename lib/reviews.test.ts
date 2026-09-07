import {
  OFFICIAL_MONTHLY_REVIEWS,
  HARPS_VALUES,
  readReviewAssessments,
  writeReviewAssessments,
  upsertReviewAssessment,
  clipboardRowForReview,
  type ReviewSelfAssessment,
} from './reviews';

describe('Monthly Reviews sheet logic', () => {
  it('contains 3 probation review milestones for Month 1, Month 2, Month 3', () => {
    expect(OFFICIAL_MONTHLY_REVIEWS).toHaveLength(3);
    expect(OFFICIAL_MONTHLY_REVIEWS[0].month).toBe(1);
    expect(OFFICIAL_MONTHLY_REVIEWS[1].month).toBe(2);
    expect(OFFICIAL_MONTHLY_REVIEWS[2].month).toBe(3);
  });

  it('contains all 5 HARPS values', () => {
    expect(HARPS_VALUES).toHaveLength(5);
    const names = HARPS_VALUES.map((v) => v.name);
    expect(names).toEqual(['Honest', 'Adaptive', 'Responsible', 'Punctual', 'Solution-oriented']);
  });

  it('serializes and deserializes review assessments correctly', () => {
    const assessments: ReviewSelfAssessment[] = [
      {
        month: 1,
        achievements: 'Learned system architecture',
        challenges: 'Adapting to fast pace',
        goalsNextMonth: 'Deploy 2 automations',
        updatedAt: '2026-09-07T12:00:00Z',
      },
    ];
    const raw = writeReviewAssessments(assessments);
    const parsed = readReviewAssessments(raw);
    expect(parsed).toEqual(assessments);
  });

  it('upserts review assessments without duplicating month', () => {
    const initial: ReviewSelfAssessment[] = [
      {
        month: 1,
        achievements: 'Old achievement',
        challenges: '',
        goalsNextMonth: '',
        updatedAt: '2026-09-07T10:00:00Z',
      },
    ];
    const updated = upsertReviewAssessment(initial, {
      month: 1,
      achievements: 'New achievement',
      challenges: 'Time management',
      goalsNextMonth: 'Deliver project',
      updatedAt: '2026-09-07T12:00:00Z',
    });
    expect(updated).toHaveLength(1);
    expect(updated[0].achievements).toBe('New achievement');

    const added = upsertReviewAssessment(updated, {
      month: 2,
      achievements: 'Month 2 victory',
      challenges: '',
      goalsNextMonth: '',
      updatedAt: '2026-09-07T13:00:00Z',
    });
    expect(added).toHaveLength(2);
  });

  it('generates a clean 7-column TSV row for clipboard copy', () => {
    const milestone = OFFICIAL_MONTHLY_REVIEWS[0];
    const assessment: ReviewSelfAssessment = {
      month: 1,
      achievements: 'Built NOVA single view pages',
      challenges: 'Fast iteration',
      goalsNextMonth: 'Deploy to staging',
      updatedAt: '2026-09-07T12:00:00Z',
    };
    const tsv = clipboardRowForReview(milestone, assessment, { criteria1: 5, criteria2: 4 });
    const cols = tsv.split('\t');
    expect(cols).toHaveLength(7);
    expect(cols[0]).toBe('Month 1');
    expect(cols[1]).toBe(milestone.stageTitle);
    expect(cols[3]).toBe('Built NOVA single view pages');
    expect(cols[6]).toBe('4.5');
  });
});

