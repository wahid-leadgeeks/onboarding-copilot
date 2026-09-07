/**
 * Master catalog of onboarding training modules and spreadsheet guide
 * aligned with the 'Glossaries' and 'Guide' worksheets in the official HR workbook.
 */

export interface TrainingModule {
  readonly id: string;
  readonly topic: string;
  readonly pic: string;
  readonly objectives: string;
  readonly materials: string;
  readonly media: 'Video' | 'Online Meeting' | 'Document' | 'Interactive';
  readonly durationMinutes: number;
  readonly materialAccess?: string;
  readonly notes?: string;
}

export interface SheetGuideItem {
  readonly tabName: string;
  readonly function: string;
  readonly howToUse: string;
}

export const OFFICIAL_TRAINING_MODULES: readonly TrainingModule[] = [
  {
    id: 'mod-1',
    topic: 'Welcoming Message from Chief Executive Officer (CEO)',
    pic: 'CEO',
    objectives: 'Welcome new employees by highlighting the meaningful impact of their work on real-world innovation in high-tech industries, reinforcing a culture of progress and accountability.',
    materials: 'Key Message: Brief of Our Growth Story · Expectations & Support',
    media: 'Video',
    durationMinutes: 3,
    materialAccess: 'CEO Welcoming Video',
  },
  {
    id: 'mod-2',
    topic: 'Welcoming Message from Managing Directors (MD)',
    pic: 'Managing Director',
    objectives: 'Inspire ownership and inclusion by sharing the company growth story and encouraging active contribution in alignment with HARPS values.',
    materials: 'Key Message: Brief of Our Culture Story · Values & Mindset',
    media: 'Video',
    durationMinutes: 3,
    materialAccess: 'MD Welcoming Video',
  },
  {
    id: 'mod-3',
    topic: 'Introduction to Company',
    pic: 'Managing Director',
    objectives: 'Provide a foundational understanding of company mission, values, structure, milestones, and business direction.',
    materials: 'Who we are · Vision and mission · Values & culture · Company goals · Departments · Our services',
    media: 'Video',
    durationMinutes: 30,
    materialAccess: 'Company Introduction Video & Slide Deck',
    notes: 'Q&A conducted during "Beyond the Slides: Chat with the MD".',
  },
  {
    id: 'mod-4',
    topic: 'Beyond the Slides: Chat with the MD',
    pic: 'Managing Director',
    objectives: 'Personal space to connect directly with the Managing Director, discuss values informally, and ask questions.',
    materials: 'Personal welcome · Ice Breaker · Company founding story · Unfiltered Q&A',
    media: 'Online Meeting',
    durationMinutes: 30,
    materialAccess: 'Live Session on Google Meet',
  },
  {
    id: 'mod-5',
    topic: 'Intro to HRD Department',
    pic: 'HRD',
    objectives: 'Introduce department main functions, core values, strategic goals, personnel roles, and cross-department collaboration.',
    materials: 'Dept Functions · Dept Values · Dept Goals · Structure & Personnel Roles',
    media: 'Video',
    durationMinutes: 20,
    materialAccess: 'HRD Introduction Video & Slide Deck',
  },
  {
    id: 'mod-6',
    topic: 'Company Policy & Code of Conduct',
    pic: 'HRD',
    objectives: 'Understand employment relations, working hours, leave entitlements, wages, and disciplinary procedures.',
    materials: 'Working Hours · Work System · Leave Policy · Disciplinary Action · Peraturan Perusahaan · Kode Etik',
    media: 'Video',
    durationMinutes: 60,
    materialAccess: 'Company Policies Video & Employee Handbook',
  },
  {
    id: 'mod-7',
    topic: 'Personnel Administration',
    pic: 'HRD',
    objectives: 'Clarify administrative procedures including attendance tracking, leave requests, and communication media.',
    materials: 'Time & Task Tracking Spreadsheet · LeadGeeks Media Communication Channels',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'Personnel Administration Video',
  },
  {
    id: 'mod-8',
    topic: 'IT Department Introduction & IT Guidelines',
    pic: 'IT Manager',
    objectives: 'Learn department functions, values, system usage, communication tools, and data security protocols.',
    materials: 'User Account Management · Hardware Devices · Software Management · Network & Data Management',
    media: 'Video',
    durationMinutes: 45,
    materialAccess: 'IT Dept Introduction & SOPs',
  },
  {
    id: 'mod-9',
    topic: 'Introduction to Management Office Department',
    pic: 'Managing Director & Executive Assistant',
    objectives: 'Introduce strategic direction, governance, ELEVATE, EXPAND, and EMPOWER frameworks.',
    materials: 'Dept Functions · Dept Values · 2025/2026 Strategic Goals · Cross-Functional Support',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'Management Office Video & Slide Deck',
  },
  {
    id: 'mod-10',
    topic: 'Introduction to Finance & Accounting Department',
    pic: 'Executive Assistant & Accounting & Tax Staff',
    objectives: 'Understand FP&A, bookkeeping, taxation, cash flow forecasting, and BE4-WE WIN financial controls.',
    materials: 'SOP Financial Transactions · SOP Expense Tracking · BE4-WE WIN Model',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'FAC Introduction Video',
  },
  {
    id: 'mod-11',
    topic: 'Experience Department Introduction',
    pic: 'Experience Manager',
    objectives: 'Learn how Experience bridges clients, management, and employees via PrEACH values.',
    materials: 'Client Relations · Employee Engagement · PrEACH Values · Customer Loyalty',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'Experience Dept Video & Slide Deck',
  },
  {
    id: 'mod-12',
    topic: 'Operations Department Introduction',
    pic: 'Operations Manager',
    objectives: 'Understand full-funnel lead generation engine, service pillars, and A-G SLA fulfillment model.',
    materials: 'Lead Generation & Prospect Mapping · Data Cleaning & Appending · Email Marketing & CRM',
    media: 'Video',
    durationMinutes: 45,
    materialAccess: 'Operations Dept Video & Slide Deck',
  },
  {
    id: 'mod-13',
    topic: 'Growth Department Introduction',
    pic: 'Growth Manager',
    objectives: 'Understand dual-track inbound/outbound growth engine, ICP scoring, and the 8 WEs mindset.',
    materials: 'Inbound vs Outbound · ICP Profiling · 8 WEs Growth Framework',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'Growth Dept Video & Slide Deck',
  },
  {
    id: 'mod-14',
    topic: 'Meeting Preparation with Clients',
    pic: 'External Experience Staff',
    objectives: 'Learn SOP for scheduling, preparing agendas, brief sheets, and conducting professional client meetings.',
    materials: 'Client Briefing Templates · Meeting Conduct · Follow-up SOP',
    media: 'Video',
    durationMinutes: 30,
    materialAccess: 'Client Meeting Preparation Video',
  },
  {
    id: 'mod-15',
    topic: 'ESMR (Employer & Staff Media Representation)',
    pic: 'External Experience Staff',
    objectives: 'Guidelines for social media presence, LinkedIn professional branding, and representing company culture.',
    materials: 'Social Media Guidelines · Professional Branding · Public Interaction Ethics',
    media: 'Video',
    durationMinutes: 25,
    materialAccess: 'ESMR Policy Video',
  },
];

export const OFFICIAL_SHEET_GUIDES: readonly SheetGuideItem[] = [
  {
    tabName: 'Schedule',
    function: 'Day-to-day timeline listing specific daily activities, sessions, and meetings to keep onboarding organized.',
    howToUse: 'Check every morning for today’s agenda. Track actual start/finish times and session durations.',
  },
  {
    tabName: 'Timeline',
    function: 'High-level 90-day onboarding roadmap across 3 key stages: Exploration (M1), Integration (M2), and Execution (M3).',
    howToUse: 'Review monthly objectives, monitor target milestone dates, and verify evidence checklist outputs.',
  },
  {
    tabName: 'Onboarding Diary',
    function: 'Personal documentation space to record daily learnings, key takeaways (3 points), and detailed notes.',
    howToUse: 'Fill Column G (3 things learned) and Column H (your notes) for each of the 28 onboarding topics.',
  },
  {
    tabName: 'Feedback Sheet',
    function: 'Structured evaluations for the 13 mandatory onboarding sessions covering Likert dimensions and feedback.',
    howToUse: 'Submit evaluation ratings (1–5) and qualitative comments immediately after completing each mandatory session.',
  },
  {
    tabName: '1st to 3rd Month Review',
    function: 'Performance and probation evaluations conducted with your Supervisor and HR at 30, 60, and 90 days.',
    howToUse: 'Review technical criteria and HARPS value alignment prior to monthly 1-on-1 probation reviews.',
  },
  {
    tabName: 'Glossaries',
    function: 'Master table of contents cataloging all mandatory training videos, sessions, objectives, and durations.',
    howToUse: 'Use as your master curriculum checklist to ensure all learning modules have been completed.',
  },
];
