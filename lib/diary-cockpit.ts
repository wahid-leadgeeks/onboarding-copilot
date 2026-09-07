/**
 * Core business logic, syllabus definitions, storage helpers, and TSV serializer
 * for Milestone 3: Onboarding Diary Cockpit.
 *
 * Aligned with rows 2-29 of the 'Onboarding Diary' worksheet in the official HR workbook.
 * Columns:
 *   A: Day | B: Week | C: Date | D: Activity Count | E: PIC | F: Topic
 *   G: List 3 things you learned from the topic
 *   H: Your Notes
 *   I: ITM Notes
 */

export type DiaryRowStatus = 'completed' | 'needs-notes' | 'todo';

export interface DiaryTopicItem {
  readonly id: string;
  readonly rowNumber: number;
  readonly day: string;
  readonly week: string;
  readonly date: string;
  readonly activityCount?: string;
  readonly pic: string;
  readonly topic: string;
  readonly defaultLearned?: string;
  readonly defaultNotes?: string;
}

export interface DiaryEntryRecord {
  rowNumber: number;
  learned: string;
  notes: string;
  updatedAt: string;
  syncedToSheets?: boolean;
  syncedAt?: string;
}

export interface DiaryCockpitStatus {
  topic: DiaryTopicItem;
  status: DiaryRowStatus;
  entry?: DiaryEntryRecord;
}

export interface DiaryCockpitProgress {
  totalCount: number;
  completedCount: number;
  needsNotesCount: number;
  todoCount: number;
  percentage: number;
  isComplete: boolean;
  rowStatuses: DiaryCockpitStatus[];
}

export const DIARY_COCKPIT_STORAGE_KEY = 'nova-onboarding-diary-cockpit';

/**
 * The 28 official syllabus topics defined in rows 2–29 of the Onboarding Diary worksheet.
 */
export const OFFICIAL_DIARY_TOPICS: readonly DiaryTopicItem[] = [
  {
    id: 'row-2',
    rowNumber: 2,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '1.0',
    pic: 'HRD',
    topic: 'Introduction to Onboarding Framework',
    defaultLearned: '1. The onboarding process is structured for the first 90 days\n2. Tracking daily learning is important\n3. Feedback and regular reviews support improvement',
    defaultNotes: '1. It helps new employees gradually understand their role, responsibilities, and the company.\n2. The Onboarding Diary helps employees record what they learned, session duration, and important takeaways.\n3. Feedback sheets and monthly reviews with supervisors and HR help identify achievements, challenges, and areas for development.',
  },
  {
    id: 'row-3',
    rowNumber: 3,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '2.0',
    pic: 'CEO',
    topic: 'Welcoming Message from Chief Executive Officer (CEO)',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-4',
    rowNumber: 4,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '3.0',
    pic: 'Managing Director',
    topic: 'Welcoming Message from Managing Directors (MD)',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-5',
    rowNumber: 5,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '4.0',
    pic: 'Managing Director',
    topic: 'Introduction to LeadGeeks',
    defaultLearned: '1. Marketing Concept Over Selling Concept\n2. Growth Follows a People-First Sequence\n3. Full-Funnel Bundling Creates Client Stickiness',
    defaultNotes: '1. LeadGeeks entire value proposition is built on the marketing concept rather than the selling concept, and this distinction matters more than it first appears.\n2. The company\'s "Elevate, Expand, Empower" strategic framework and its own timeline reveal a deliberate, staged approach to scaling rather than an opportunistic one.\n3. Rather than offering scattered, standalone services, LeadGeeks packages its work into three integrated categories: Account & Lead Generation, Email Marketing & CRM Optimization, and Data Cleaning & Appending.',
  },
  {
    id: 'row-6',
    rowNumber: 6,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '5.0',
    pic: 'HRD',
    topic: 'Introduction to Human Resources Department',
    defaultLearned: '1. HRD plays a strategic role in the company\n2. Employee development is essential for organizational success\n3. Employee engagement and well-being affect performance',
    defaultNotes: '1. It is not only about administration and hiring, but also about developing talent, improving performance, and supporting the company’s long-term goals.\n2. Training, career growth, talent reviews, and succession planning help employees improve their skills and prepare for future responsibilities.\n3. Rewards, effective communication, feedback, counseling, and a positive work environment can help motivate employees, increase retention, and improve productivity.',
  },
  {
    id: 'row-7',
    rowNumber: 7,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '6.0',
    pic: 'HRD',
    topic: 'Company Policies & Employee Guidelines',
    defaultLearned: '1. The company emphasizes professional and ethical behavior\n2. Employees must respect confidentiality and maintain professional relationships\n3. The company has a structured violation reporting system',
    defaultNotes: '1. The HARPS values—Honest, Adaptive, Responsible, Punctual, and Solution-oriented—guide employees’ behavior and work.\n2. Employees are expected to respect colleagues, protect confidential information, avoid harassment or discrimination, and maintain appropriate personal and professional boundaries.\n3. Employees can report violations confidentially using the 4W1H approach (What, Where, When, Who, and How), with HRD and Experience responsible for following up on reports.',
  },
  {
    id: 'row-8',
    rowNumber: 8,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '7.0',
    pic: 'HRD',
    topic: 'Personnel Administration',
    defaultLearned: '1. Different communication channels have different purposes\n2. Formal matters should be handled through email\n3. Employee work activities and time need to be tracked',
    defaultNotes: '1. Telegram, WhatsApp, and email are used differently depending on the type of communication, from official announcements to informal updates and social interaction.\n2. Email is used for formal requests, important documents, salary slips, and formal meeting invitations, providing proper documentation.\n3. The Time & Task Spreadsheet is used to record working hours and categorize activities such as HR, Compensation & Benefits, Administration, Meetings, Training, and other tasks.',
  },
  {
    id: 'row-9',
    rowNumber: 9,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '8.0',
    pic: 'Experience',
    topic: 'Welcoming Event from All Staff',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-10',
    rowNumber: 10,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '9.0',
    pic: 'Managing Director',
    topic: 'Team Introduction',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-11',
    rowNumber: 11,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '10.0',
    pic: 'Managing Director & Executive Assistant',
    topic: 'Introduction to Management Office Department',
    defaultLearned: '1. The Management Office provides strategic direction and oversees the organization\n2. The department focuses on ELEVATE, EXPAND, and EMPOWER\n3. Management coordinates shared goals across departments',
    defaultNotes: '1. The Management Office oversees areas such as strategic planning, financial stewardship, leadership and culture, governance and risk, operations, market leadership, and stakeholder engagement.\n2. The 2025 focus is ELEVATE customer satisfaction and retention, EXPAND through business development and new opportunities, and EMPOWER the team through strong talent, technology, and organizational development.\n3. Management works with Operations, Growth, Experience, HRD, FAC, and IT through shared goals such as CBR identification, profitability, CSAT, Leadership Camp, SMART Goals SOP, integrated databases, and financial and organizational risk management.',
  },
  {
    id: 'row-12',
    rowNumber: 12,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '11.0',
    pic: 'Executive Assistant & Accounting & Tax Staff',
    topic: 'Introduction to Finance & Accounting Department',
    defaultLearned: '1. Comprehensive Financial Planning & Analysis (FP&A)\n2.  General Ledger, Taxation & Treasury Management\n3.  Financial Controls & Values (`BE4-WE WIN`)',
    defaultNotes: '1. F&A leads multi-year revenue and cash flow forecasting, monitors budget versus actual performance variances, and delivers semi-annual executive reviews to optimize capital allocation and project profitability.\n2. The department ensures systematic daily transaction bookkeeping, generates audited financial statements (P&L, Balance Sheet, Cash Flow), manages multi-currency liquidity, and oversees full corporate/withholding tax compliance.\n3. Operating under SOP Financial Transactions and SOP Expense Tracking, F&A prevents fraud and enforces fiscal discipline guided by BE4-WE WIN (Being Analytical, Breadth-thinking, Compliant, Dignified, We do improvement, Win-win outcomes).',
  },
  {
    id: 'row-13',
    rowNumber: 13,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '12.0',
    pic: 'Experience Manager',
    topic: 'Experience Department Introduction',
    defaultLearned: '1. The Experience Department connects clients, employees, and other departments\n2. Client and employee relationships are managed through structured programs\n3. PrEACH values guide the department\'s professional behavior',
    defaultNotes: '1. The Experience Department acts as a bridge between the company and clients while focusing on client relations, management development, employee relations, and employer branding.\n2. Client relationships are strengthened through project supervision, client satisfaction surveys, customer loyalty programs, contract management, and project retention, while employee relations include individual calls, feedback, reviews, exit calls, and special events.\n3. The PrEACH values emphasize a positive and receptive mindset, effective communication, agile working ethics, convergent thinking, and accountability in working with colleagues and clients.',
  },
  {
    id: 'row-14',
    rowNumber: 14,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '13.0',
    pic: 'Operations Manager',
    topic: 'Operations Department Introduction',
    defaultLearned: '1. Full-Funnel Lead Generation & Execution Engine\n2. 3 Core Service Pillars: Lead Generation & Prospect Mapping, Data Cleaning & Appending, and CRM & Automated\n  Email Marketing.\n3. A–G Value Model & SLA Fulfillment: Accountability, Consistency, Focus, and Integrity in meeting client\n  deliverability SLAs.',
    defaultNotes: '1. LeadGeeks manages the end-to-end lead qualification journey, from Information Qualified Leads (IQLs) with verified, ICP-aligned data to Marketing Qualified Leads (MQLs) showing clear interest and Sales Qualified Leads (SQLs) demonstrating genuine purchase intent, authority, and budget.',
  },
  {
    id: 'row-15',
    rowNumber: 15,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '14.0',
    pic: 'Growth Manager',
    topic: 'Growth Department Introduction',
    defaultLearned: '1. Dual-Track Revenue Engine (Inbound + Outbound)\n2. Targeted ICP Scoring & Market Penetration\n3. The 8 WEs Growth Mindset',
    defaultNotes: '',
  },
  {
    id: 'row-16',
    rowNumber: 16,
    day: 'Tuesday',
    week: '1.0',
    date: 'Day 1',
    activityCount: '15.0',
    pic: 'Managing Director',
    topic: 'Beyond the Slides: Chat with the Managing Director',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-17',
    rowNumber: 17,
    day: 'Wednesday',
    week: '1.0',
    date: 'Day 2',
    activityCount: '16.0',
    pic: 'IT Manager',
    topic: 'Introduction to the IT Department\n- Structure of IT Department\n- Roles and Responsibilities\n- IT Department Values\n- IT Department Functions',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-18',
    rowNumber: 18,
    day: 'Thursday',
    week: '1.0',
    date: 'Day 3',
    activityCount: '17.0',
    pic: 'IT Manager',
    topic: 'How IT Works at LeadGeeks\n- IT Workflow & Working Approach\n- Cross-Department Collaboration\n- Current IT Priorities & Ongoing Initiatives\n- IT Guidelines & SOP',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-19',
    rowNumber: 19,
    day: 'Friday',
    week: '1.0',
    date: 'Day 4',
    activityCount: '18.0',
    pic: 'IT Manager',
    topic: 'Understanding the Current IT Ecosystem\n- Main Tools & Platforms\n- Systems & Services\n- Key Dependencies\n- Basic IT Environment',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-20',
    rowNumber: 20,
    day: 'Monday',
    week: '2.0',
    date: 'Day 5',
    activityCount: '19.0',
    pic: 'IT Manager',
    topic: 'Understanding LeadGeeks IT Department Functions\n- Infrastructure Management\n- Website Management\n- Technology Optimization & Innovation\n- Cybersecurity\n- Relationships & Dependencies Between Functions',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-21',
    rowNumber: 21,
    day: 'Tuesday',
    week: '2.0',
    date: 'Day 6',
    activityCount: '20.0',
    pic: 'IT Manager',
    topic: 'Infrastructure Management at LeadGeeks\n- Current Environment\n- Core Services (Google Workspace)\n- User & Device Management\n- Standards & Operational Scope',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-22',
    rowNumber: 22,
    day: 'Wednesday',
    week: '2.0',
    date: 'Day 7',
    activityCount: '21.0',
    pic: 'IT Manager',
    topic: 'Technology Optimization & Innovation at LeadGeeks\n- AI & Automation\n- Google Apps Script & Workflow Automation\n- System Development & Process Improvement\n- Existing Initiatives & Future Direction',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-23',
    rowNumber: 23,
    day: 'Thursday',
    week: '2.0',
    date: 'Day 8',
    activityCount: '22.0',
    pic: 'IT Manager',
    topic: 'Cybersecurity at LeadGeeks\n- Current Security Practices\n- Data Protection & GDPR\n- Security Risks & Priorities\n- Security Assessment & Basic Response',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-24',
    rowNumber: 24,
    day: 'Friday',
    week: '2.0',
    date: 'Day 9',
    activityCount: '23.0',
    pic: 'IT Manager',
    topic: 'Website Management at LeadGeeks\n- Website Ecosystem & Dependencies\n- CMS / WordPress\n- Website Structure & Content Management\n- Technical SEO & Digital Presence',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-25',
    rowNumber: 25,
    day: 'Monday',
    week: '3.0',
    date: 'Day 10',
    activityCount: '24.0',
    pic: 'IT Manager',
    topic: 'Introduction to IT Department 2026 SMART Goals and Understanding How IT Support LeadGeeks Business Objectives',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-26',
    rowNumber: 26,
    day: 'Tuesday',
    week: '3.0',
    date: 'Day 11',
    activityCount: '25.0',
    pic: 'IT Manager',
    topic: 'Infrastructure Management Goals and Initiatives\n- Google Workspace Assessment and Enhancement\n- Google Cloud Exploration\n- Email Domain Migration',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-27',
    rowNumber: 27,
    day: 'Wednesday',
    week: '3.0',
    date: 'Day 12',
    activityCount: '26.0',
    pic: 'IT Manager',
    topic: 'Technology Optimization & Innovation Goals and Initiatives\n- Existing Automation Evaluation and Optimization\n- New Automation Implementation\n- Integrated Database Implementation\n- Technology Support for Service Development and Innovation',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-28',
    rowNumber: 28,
    day: 'Thursday',
    week: '3.0',
    date: 'Day 13',
    activityCount: '27.0',
    pic: 'IT Manager',
    topic: 'Cybersecurity Goals and Initiatives\n- Security Assessment & Optimization\n- Company Account Implementation\n- Data Security Enhancement',
    defaultLearned: '',
    defaultNotes: '',
  },
  {
    id: 'row-29',
    rowNumber: 29,
    day: 'Friday',
    week: '3.0',
    date: 'Day 14',
    activityCount: '28.0',
    pic: 'IT Manager',
    topic: 'Website Management Goals and Initiatives\n- Website Enhancement\n- Technical SEO & Digital Presence',
    defaultLearned: '',
    defaultNotes: '',
  },
] as const;

export const DIARY_TOPICS = OFFICIAL_DIARY_TOPICS;

/**
 * Deserializes diary cockpit records from JSON string.
 */
export function readDiaryCockpitEntries(raw: string | null): DiaryEntryRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DiaryEntryRecord =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.rowNumber === 'number' &&
        typeof item.learned === 'string' &&
        typeof item.notes === 'string'
    );
  } catch {
    return [];
  }
}

/**
 * Serializes diary cockpit records to JSON string.
 */
export function writeDiaryCockpitEntries(entries: DiaryEntryRecord[]): string {
  return JSON.stringify(entries);
}

/**
 * Upserts a diary entry record by rowNumber.
 */
export function upsertDiaryCockpitEntry(
  entries: DiaryEntryRecord[],
  entry: DiaryEntryRecord
): DiaryEntryRecord[] {
  const index = entries.findIndex((e) => e.rowNumber === entry.rowNumber);
  if (index >= 0) {
    const next = [...entries];
    next[index] = entry;
    return next;
  }
  return [...entries, entry];
}

/**
 * Calculates progress and status for all syllabus topics based on saved records and workbook defaults.
 */
export function calculateDiaryCockpitProgress(
  savedEntries: DiaryEntryRecord[],
  topics: readonly DiaryTopicItem[] = OFFICIAL_DIARY_TOPICS
): DiaryCockpitProgress {
  const totalCount = topics.length;
  const rowStatuses: DiaryCockpitStatus[] = [];
  let completedCount = 0;
  let needsNotesCount = 0;
  let todoCount = 0;

  for (const topic of topics) {
    const saved = savedEntries.find((e) => e.rowNumber === topic.rowNumber);
    const learned = (saved ? saved.learned : topic.defaultLearned || '').trim();
    const notes = (saved ? saved.notes : topic.defaultNotes || '').trim();

    let status: DiaryRowStatus = 'todo';
    if (learned && notes) {
      status = 'completed';
      completedCount++;
    } else if (learned && !notes) {
      status = 'needs-notes';
      needsNotesCount++;
    } else {
      status = 'todo';
      todoCount++;
    }

    rowStatuses.push({
      topic,
      status,
      entry: saved || {
        rowNumber: topic.rowNumber,
        learned,
        notes,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  return {
    totalCount,
    completedCount,
    needsNotesCount,
    todoCount,
    percentage,
    isComplete,
    rowStatuses,
  };
}

/**
 * Formats a TSV string suitable for copying and pasting directly into Google Sheets
 * covering Column G (List 3 things you learned) and Column H (Your Notes).
 */
export function clipboardRowForDiary(
  rowNumber: number,
  learned: string,
  notes: string
): string {
  const escapeTsv = (val: string) => {
    if (val.includes('\n') || val.includes('\t') || val.includes('"')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  return `${escapeTsv(learned.trim())}\t${escapeTsv(notes.trim())}`;
}

/**
 * Generates an AI draft for learnings (Column G) tailored to the topic and PIC.
 */
export function suggestAiLearnings(topic: DiaryTopicItem): string {
  const title = topic.topic.split('\n')[0].trim();
  if (topic.rowNumber === 15 || title.includes('Growth')) {
    return '1. Dual-Track Revenue Engine (Inbound + Outbound)\n2. Targeted ICP Scoring & Market Penetration\n3. The 8 WEs Growth Mindset';
  }
  if (topic.rowNumber === 16 || title.includes('Managing Director') || title.includes('Beyond the Slides')) {
    return '1. Company Vision & Market Positioning for 2026\n2. Open Communication & Core Leadership Principles\n3. Aligning Daily Execution with Long-Term Business Strategy';
  }
  if (topic.rowNumber === 17 || title.includes('Introduction to the IT')) {
    return '1. IT Department Structure, Roles, and Core Responsibilities\n2. Fundamental Values Guiding IT Operations & Service Delivery\n3. Core IT Functions Supporting Cross-Departmental Workflows';
  }
  if (topic.rowNumber === 18 || title.includes('How IT Works')) {
    return '1. Agile IT Working Approach & Structured Sprint Cycles\n2. Cross-Departmental Collaboration and Issue Escalation\n3. Standard Operating Procedures (SOP) and IT Guidelines';
  }
  if (topic.rowNumber === 19 || title.includes('IT Ecosystem')) {
    return '1. Core Cloud Infrastructure & Enterprise Tool Architecture\n2. Third-Party Integrations & Critical Data Pipelines\n3. Environment Separation (Production, Staging, Local) & Security Baselines';
  }
  if (title.includes('Cybersecurity')) {
    return '1. Principle of Least Privilege and Access Governance\n2. Data Privacy Compliance (GDPR/Personal Data Protection)\n3. Incident Response Protocol & Phishing Defense';
  }
  if (title.includes('Infrastructure')) {
    return '1. Cloud Infrastructure Reliability and Scalability Benchmarks\n2. Google Workspace Administration & Fleet Management\n3. Backup Redundancy and Business Continuity Planning';
  }
  if (title.includes('Website')) {
    return '1. CMS Architecture, Content Governance & Web Performance\n2. Technical SEO Best Practices & Lighthouse Optimization\n3. CI/CD Deployment Pipeline for Company Web Assets';
  }
  if (title.includes('SMART Goals')) {
    return '1. Strategic Alignment of IT Initiatives with 2026 Company Revenue Targets\n2. Measurable Key Results (KPIs) for System Uptime & Engineering Velocity\n3. Proactive IT Support as a Business Enabler Across All Functions';
  }

  return `1. Strategic purpose and core operational role of ${title}\n2. Key workflows, tools, and cross-functional dependencies\n3. Actionable takeaways to apply in daily responsibilities`;
}

/**
 * Generates an AI draft for notes (Column H) tailored to the topic and PIC.
 */
export function suggestAiNotes(topic: DiaryTopicItem): string {
  const title = topic.topic.split('\n')[0].trim();
  if (topic.rowNumber === 15 || title.includes('Growth')) {
    return '1. Growth operates both inbound (content, brand, social) and outbound (targeted prospect mapping, multi-touch campaigns) to maintain a steady revenue pipeline.\n2. The team scores prospects against an Ideal Customer Profile (ICP) to maximize conversion rates and outreach ROI.\n3. The 8 WEs mindset fosters team ownership, continuous data-driven experimentation, accountability, and agile iteration across growth initiatives.';
  }
  if (topic.rowNumber === 16 || title.includes('Managing Director') || title.includes('Beyond the Slides')) {
    return '1. Discussed leadership vision and the evolution of LeadGeeks from service agency to end-to-end partner.\n2. Emphasized high ownership, curiosity, and transparent communication across all seniority levels.\n3. Clarified expectations for personal initiative during the first 90 days of onboarding.';
  }
  if (topic.rowNumber === 17 || title.includes('Introduction to the IT')) {
    return '1. Reviewed IT hierarchy and escalation matrices between infrastructure, software, and end-user support.\n2. Understood how the IT department acts as a foundational pillar for Operations, Growth, and FAC teams.\n3. Familiarized with department documentation and internal knowledge base resources.';
  }
  if (topic.rowNumber === 18 || title.includes('How IT Works')) {
    return '1. Learned how sprint planning, tickets, and ad-hoc requests are prioritized to prevent bottlenecks.\n2. Walked through internal SLA guidelines for resolving urgent technical blockers.\n3. Reviewed SOPs for deploying updates and communicating downtime to team members.';
  }
  if (topic.rowNumber === 19 || title.includes('IT Ecosystem')) {
    return '1. Documented current tool stack including Google Workspace, automation tools, and internal scripts.\n2. Identified key data integrations connecting lead generation data with CRM platforms.\n3. Noted security and compliance configurations required for local development environments.';
  }

  return `1. Attended deep-dive session on ${title} led by ${topic.pic}.\n2. Reviewed internal documentation, standard operating procedures, and relevant workflows.\n3. Identified immediate areas where IT solutions and technical optimizations can assist this department.`;
}
