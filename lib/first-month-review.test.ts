import {
  OFFICIAL_FIRST_MONTH_REVIEW,
  readFirstMonthReview,
  writeFirstMonthReview,
  getAverageScore,
  clipboardForTechnicalAssessment,
  clipboardForValuesAssessment,
  clipboardForFeedbackRatings,
  clipboardForQualitativeFeedback,
  clipboardForHrdQuestions,
} from './first-month-review';

describe('First Month Review Model', () => {
  it('contains complete metadata for Mohammad Noor Wahid', () => {
    expect(OFFICIAL_FIRST_MONTH_REVIEW.metadata.employeeName).toBe('Mohammad Noor Wahid');
    expect(OFFICIAL_FIRST_MONTH_REVIEW.metadata.department).toBe('Information Technology');
    expect(OFFICIAL_FIRST_MONTH_REVIEW.metadata.supervisorName).toBe('Ardhian Agung Prasetyo');
    expect(OFFICIAL_FIRST_MONTH_REVIEW.metadata.reviewPeriod).toBe('1 - 30 September, 2026');
  });

  it('contains 11 technical assessments and 8 values assessments', () => {
    expect(OFFICIAL_FIRST_MONTH_REVIEW.technicalAssessment).toHaveLength(11);
    expect(OFFICIAL_FIRST_MONTH_REVIEW.valuesAssessment).toHaveLength(8);
  });

  it('contains 7 additional questions for supervisor evaluation', () => {
    expect(OFFICIAL_FIRST_MONTH_REVIEW.additionalQuestions).toHaveLength(7);
  });

  it('contains 10 feedback rating items and 3 qualitative items', () => {
    expect(OFFICIAL_FIRST_MONTH_REVIEW.feedbackRatings).toHaveLength(10);
    expect(OFFICIAL_FIRST_MONTH_REVIEW.qualitativeFeedback).toHaveLength(3);
    expect(OFFICIAL_FIRST_MONTH_REVIEW.hrdQuestions).toHaveLength(6);
  });

  it('calculates average score accurately', () => {
    const avgTech = getAverageScore(OFFICIAL_FIRST_MONTH_REVIEW.technicalAssessment);
    expect(avgTech).toBeGreaterThanOrEqual(70);
    expect(avgTech).toBeLessThanOrEqual(100);

    const emptyAvg = getAverageScore([]);
    expect(emptyAvg).toBe(0);
  });

  it('persists and restores review via json', () => {
    const serialized = writeFirstMonthReview(OFFICIAL_FIRST_MONTH_REVIEW);
    const restored = readFirstMonthReview(serialized);
    expect(restored.metadata.employeeName).toBe(OFFICIAL_FIRST_MONTH_REVIEW.metadata.employeeName);
    expect(restored.technicalAssessment).toHaveLength(11);
  });

  it('generates cell-accurate TSVs for copy-pasting into Google Sheets', () => {
    const techTsv = clipboardForTechnicalAssessment(OFFICIAL_FIRST_MONTH_REVIEW.technicalAssessment);
    const techRows = techTsv.split('\n');
    expect(techRows).toHaveLength(11);
    expect(techRows[0]).toContain('\t');

    const valTsv = clipboardForValuesAssessment(OFFICIAL_FIRST_MONTH_REVIEW.valuesAssessment);
    expect(valTsv.split('\n')).toHaveLength(8);

    const rateTsv = clipboardForFeedbackRatings(OFFICIAL_FIRST_MONTH_REVIEW.feedbackRatings);
    expect(rateTsv.split('\n')).toHaveLength(10);

    const qualTsv = clipboardForQualitativeFeedback(OFFICIAL_FIRST_MONTH_REVIEW.qualitativeFeedback);
    expect(qualTsv).toContain('TETRA');
    expect(qualTsv).toContain('LeadGeeks');

    const hrdTsv = clipboardForHrdQuestions(OFFICIAL_FIRST_MONTH_REVIEW.hrdQuestions);
    expect(hrdTsv).toContain('Artificial Intelligence');
    expect(hrdTsv).toContain('software architect');
  });
});
