import {
  DEPARTMENT_VALUES_SCORING_INDICATORS,
  TECHNICAL_SCORING_INDICATORS,
  getScoreMetadata,
  clipboardForScoringRubric,
} from './review-scoring';

describe('Review Scoring Rubric', () => {
  it('contains all 5 scoring levels for Department Values', () => {
    expect(DEPARTMENT_VALUES_SCORING_INDICATORS).toHaveLength(5);
    const levels = DEPARTMENT_VALUES_SCORING_INDICATORS.map((i) => i.level);
    expect(levels).toEqual([
      'Satisfactory',
      'Good',
      'Very Competent',
      'Excellent',
      'Outstanding',
    ]);
  });

  it('contains all 5 scoring levels for Technical Assessment', () => {
    expect(TECHNICAL_SCORING_INDICATORS).toHaveLength(5);
    const levels = TECHNICAL_SCORING_INDICATORS.map((i) => i.level);
    expect(levels).toEqual([
      'Satisfactory',
      'Good',
      'Very Competent',
      'Excellent',
      'Outstanding',
    ]);
  });

  it('correctly categorizes scores into levels and metadata', () => {
    expect(getScoreMetadata(100).level).toBe('Outstanding');
    expect(getScoreMetadata(90).level).toBe('Excellent');
    expect(getScoreMetadata(80).level).toBe('Very Competent');
    expect(getScoreMetadata(70).level).toBe('Good');
    expect(getScoreMetadata(60).level).toBe('Satisfactory');
    expect(getScoreMetadata(undefined).level).toBe('Unrated');
    expect(getScoreMetadata(0).level).toBe('Unrated');
  });

  it('generates accurate TSV for clipboard copy', () => {
    const tsv = clipboardForScoringRubric();
    expect(tsv).toContain('STANDARD SCORING INDICATOR');
    expect(tsv).toContain('Department Values Assessment');
    expect(tsv).toContain('Technical Assessment');
    expect(tsv).toContain('Satisfactory\t60.0');
    expect(tsv).toContain('Outstanding\t100.0');
  });
});
