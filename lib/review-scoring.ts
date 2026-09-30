/**
 * Standard Scoring Indicators for Monthly Reviews (Sheet: Monthly Review Score)
 * Official rubric from the Onboarding spreadsheet.
 */

export type ScoringLevel =
  | 'Satisfactory'
  | 'Good'
  | 'Very Competent'
  | 'Excellent'
  | 'Outstanding';

export interface ScoringIndicatorItem {
  level: ScoringLevel;
  score: number;
  formattedScore: string;
  description: string;
  theme: {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
  };
}

export interface ScoringCategory {
  title: string;
  key: 'department-values' | 'technical';
  description: string;
  items: ScoringIndicatorItem[];
}

export const DEPARTMENT_VALUES_SCORING_INDICATORS: ScoringIndicatorItem[] = [
  {
    level: 'Satisfactory',
    score: 60.0,
    formattedScore: '60.0',
    description:
      'Employee occasionally demonstrates adherence to department values and requires regular supervision to stay aligned.',
    theme: {
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      text: 'text-stone-700',
      badgeBg: 'bg-stone-100',
      badgeText: 'text-stone-700',
    },
  },
  {
    level: 'Good',
    score: 70.0,
    formattedScore: '70.0',
    description:
      'Employee consistently demonstrates adherence to department values and is able to maintain alignment with minimal guidance.',
    theme: {
      bg: 'bg-sky-50/50',
      border: 'border-sky-200',
      text: 'text-sky-900',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
    },
  },
  {
    level: 'Very Competent',
    score: 80.0,
    formattedScore: '80.0',
    description:
      'Employee actively applies department values in daily tasks, showing independence and strong commitment without supervision.',
    theme: {
      bg: 'bg-mint-50/50',
      border: 'border-mint-200',
      text: 'text-mint-900',
      badgeBg: 'bg-mint-100',
      badgeText: 'text-mint-800',
    },
  },
  {
    level: 'Excellent',
    score: 90.0,
    formattedScore: '90.0',
    description:
      'Employee upholds department values even in challenging situations, and serves as a positive role model for colleagues.',
    theme: {
      bg: 'bg-peach-50/50',
      border: 'border-peach-200',
      text: 'text-peach-900',
      badgeBg: 'bg-peach-100',
      badgeText: 'text-peach-800',
    },
  },
  {
    level: 'Outstanding',
    score: 100.0,
    formattedScore: '100.0',
    description:
      'Employee embodies and promotes department values across teams, inspiring and influencing others to adopt and uphold these values.',
    theme: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    },
  },
];

export const TECHNICAL_SCORING_INDICATORS: ScoringIndicatorItem[] = [
  {
    level: 'Satisfactory',
    score: 60.0,
    formattedScore: '60.0',
    description:
      'Has the minimum technical knowledge to perform the role. Completes tasks but with frequent errors or need for support.',
    theme: {
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      text: 'text-stone-700',
      badgeBg: 'bg-stone-100',
      badgeText: 'text-stone-700',
    },
  },
  {
    level: 'Good',
    score: 70.0,
    formattedScore: '70.0',
    description:
      'Applies technical knowledge correctly in most situations. Produces reliable results with occasional guidance.',
    theme: {
      bg: 'bg-sky-50/50',
      border: 'border-sky-200',
      text: 'text-sky-900',
      badgeBg: 'bg-sky-100',
      badgeText: 'text-sky-800',
    },
  },
  {
    level: 'Very Competent',
    score: 80.0,
    formattedScore: '80.0',
    description:
      'Demonstrates strong technical ability, solves problems effectively, and works independently with minimal errors.',
    theme: {
      bg: 'bg-mint-50/50',
      border: 'border-mint-200',
      text: 'text-mint-900',
      badgeBg: 'bg-mint-100',
      badgeText: 'text-mint-800',
    },
  },
  {
    level: 'Excellent',
    score: 90.0,
    formattedScore: '90.0',
    description:
      'Consistently delivers high-quality technical work, handles complex issues, and provides solutions that improve team performance.',
    theme: {
      bg: 'bg-peach-50/50',
      border: 'border-peach-200',
      text: 'text-peach-900',
      badgeBg: 'bg-peach-100',
      badgeText: 'text-peach-800',
    },
  },
  {
    level: 'Outstanding',
    score: 100.0,
    formattedScore: '100.0',
    description:
      'Recognized as a technical authority. Creates innovative solutions, mentors others, and sets the benchmark for technical excellence.',
    theme: {
      bg: 'bg-amber-50/50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
    },
  },
];

export const SCORING_CATEGORIES: ScoringCategory[] = [
  {
    title: 'Department Values Assessment',
    key: 'department-values',
    description:
      'Evaluates accountability, collaboration, agility, respect, and department cultural alignment.',
    items: DEPARTMENT_VALUES_SCORING_INDICATORS,
  },
  {
    title: 'Technical Assessment',
    key: 'technical',
    description:
      'Evaluates domain competency, application development, problem-solving, and independent technical execution.',
    items: TECHNICAL_SCORING_INDICATORS,
  },
];

export const STANDARD_SCORES = [60.0, 70.0, 80.0, 90.0, 100.0] as const;

/**
 * Returns level and style information based on a numeric score
 */
export function getScoreMetadata(score?: number): {
  level: ScoringLevel | 'Unrated';
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  if (score === undefined || isNaN(score) || score === 0) {
    return {
      level: 'Unrated',
      label: 'Unrated',
      badgeBg: 'bg-stone-100',
      badgeText: 'text-stone-500',
      badgeBorder: 'border-stone-200',
    };
  }
  if (score >= 95) {
    return {
      level: 'Outstanding',
      label: 'Outstanding (100)',
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-200',
    };
  }
  if (score >= 85) {
    return {
      level: 'Excellent',
      label: 'Excellent (90)',
      badgeBg: 'bg-peach-50',
      badgeText: 'text-peach-800',
      badgeBorder: 'border-peach-200',
    };
  }
  if (score >= 75) {
    return {
      level: 'Very Competent',
      label: 'Very Competent (80)',
      badgeBg: 'bg-mint-50',
      badgeText: 'text-mint-800',
      badgeBorder: 'border-mint-200',
    };
  }
  if (score >= 65) {
    return {
      level: 'Good',
      label: 'Good (70)',
      badgeBg: 'bg-sky-50',
      badgeText: 'text-sky-800',
      badgeBorder: 'border-sky-200',
    };
  }
  return {
    level: 'Satisfactory',
    label: 'Satisfactory (60)',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-700',
    badgeBorder: 'border-stone-200',
  };
}

/**
 * Generates TSV for copying to sheet "Monthly Review Score"
 */
export function clipboardForScoringRubric(): string {
  const lines: string[] = [];
  lines.push('STANDARD SCORING INDICATOR\t\t');
  lines.push('Department Values Assessment\t\t');
  lines.push('Level\tScore\tDescription');
  for (const item of DEPARTMENT_VALUES_SCORING_INDICATORS) {
    lines.push(`${item.level}\t${item.formattedScore}\t${item.description}`);
  }
  lines.push('\t\t');
  lines.push('Technical Assessment\t\t');
  lines.push('Level\tScore\tDescription');
  for (const item of TECHNICAL_SCORING_INDICATORS) {
    lines.push(`${item.level}\t${item.formattedScore}\t${item.description}`);
  }
  return lines.join('\n');
}
