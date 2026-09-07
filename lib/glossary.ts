/**
 * Master catalog of onboarding training modules and spreadsheet guide
 * aligned with the 'Glossaries' and 'Guide' worksheets in the official HR workbook.
 */

export interface TrainingModule {
  readonly id: string;
  readonly topic: string;
  readonly pic: string;
  readonly objectives: string;
  readonly frameworkMaterials: string;
  readonly materials: string;
  readonly media: 'Video' | 'Online Meeting' | 'Document' | 'Interactive' | string;
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
    topic: 'Welcoming Message from Chief Excecutive Officer (CEO)',
    pic: 'CEO',
    objectives:
      'To welcome new employees by highlighting the meaningful impact of their work on real-world innovation in high-tech industries, while reinforcing a culture that values progress and accountability.',
    frameworkMaterials: 'Key Message:\n- Brief of Our Growth Story\n- Expectations & Support',
    materials: 'Key Message:\n- Brief of Our Growth Story\n- Expectations & Support',
    media: 'Video',
    durationMinutes: 3,
    materialAccess: 'Video Link: CEO Welcoming Video',
    notes: 'Watch during morning onboarding orientation on Day 1.',
  },
  {
    id: 'mod-2',
    topic: 'Welcoming Message from Managing Directors (MD)',
    pic: 'Managing Director',
    objectives:
      'To inspire a sense of ownership and inclusion by sharing the company\'s growth story and encouraging employees to actively contribute their ideas and voices in alignment with the HARPS values.',
    frameworkMaterials: 'Key Message:\n- Brief of Our Culture Story\n- Values & Mindset',
    materials: 'Key Message:\n- Brief of Our Culture Story\n- Values & Mindset',
    media: 'Video',
    durationMinutes: 3,
    materialAccess: 'Video Link: MD Welcoming Video',
    notes: 'Aligns with HARPS values introduction.',
  },
  {
    id: 'mod-3',
    topic: 'Introduction to Company',
    pic: 'Managing Director',
    objectives:
      'To provide new hires with a foundational understanding of the company’s mission, values, structure, key milestones, and overall business direction, enabling them to align personally and professionally with LeadGeeks’ vision.',
    frameworkMaterials:
      'Materials :\n- Congratulations & welcome!\n- Who we are\n- Vision and mission\n- Value, culture, and story\n- Company goals\n- Departments and team\n- Our services',
    materials:
      'Materials :\n- Congratulations & welcome!\n- Who we are\n- Vision and mission\n- Value, culture, and story\n- Company goals\n- Departments and team\n- Our services',
    media: 'Video',
    durationMinutes: 30,
    materialAccess: '- Video Link : Company Introduction\n- PPT : Company Introduction',
    notes:
      'Session Notes:\n"Beyond the Slides: Chat with the MD" will be held in W3 or W4 before the 1st Monthly Review.\n\nEvaluation & Feedback:\n- After watching the videos, New Hires must fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- The Q&A session regarding the Company Introduction will be held during the 30 minutes online meeting "Beyond the Slides: Chat with the MD" session with the Managing Director.\n- All the questions asked about Introduction to Company should still be included in the Daily Evaluation.',
  },
  {
    id: 'mod-4',
    topic: 'Beyond the Slides: Chat with the MD',
    pic: 'Managing Director',
    objectives:
      'To create a warm and personal space for new hires to connect directly with the Managing Director, reinforce the company’s mission and values in a more human way, and allow both sides to begin building mutual trust and engagement beyond formal structures. This session also gives the MD an opportunity to personally welcome new hires and gain insight into who they are and what drives them.',
    frameworkMaterials:
      'Session Activity:\n- MD gives personal welcome\n- Ice Breaker: Who Are You?\n- MD shares a personal story behind building the company\n- Unfiltered Q&A: Ask Me Anything\n- Wrap-Up & Message from the MD',
    materials:
      'Session Activity:\n- MD gives personal welcome\n- Ice Breaker: Who Are You?\n- MD shares a personal story behind building the company\n- Unfiltered Q&A: Ask Me Anything\n- Wrap-Up & Message from the MD',
    media: 'Online Meeting',
    durationMinutes: 30,
    materialAccess: 'Live Session on Google Meet',
    notes: 'Interactive session; prepare questions in advance.',
  },
  {
    id: 'mod-5',
    topic: 'Intro to HRD Department',
    pic: 'HRD',
    objectives:
      'To introduce the department’s main functions, core values, strategic goals relevant to all employees, internal structure, team members’ roles and responsibilities, and expected collaboration across departments.',
    frameworkMaterials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals that are relevant to all employees\n- Structure, Personnel\n- Personnel Roles & Responsibilities',
    materials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals that are relevant to all employees\n- Structure, Personnel\n- Personnel Roles & Responsibilities',
    media: 'Video',
    durationMinutes: 20,
    materialAccess: '- Video Link: HRD Department Introduction\n- PPT: HRD Dept Introduction',
    notes:
      'Evaluation & Feedback:\n- After watching the videos, New Hires must fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- If the Department PIC is present at the in-person onboarding event, questions can be addressed directly.\n- If the Q&A session is to be held as part of a meeting, meeting duration will be 15 to 30 minutes.\n- All the questions asked should still be included in the Daily Evaluation.',
  },
  {
    id: 'mod-6',
    topic: 'Company Policy',
    pic: 'HRD',
    objectives:
      'To ensure that new hires understand the company’s rules, code of conduct, working hours, leave entitlements, and other essential workplace regulations, enabling them to comply confidently and operate responsibly within the organizational culture.',
    frameworkMaterials:
      'Company Policies Material:\n- Employment Relations\n- Working Hours\n- Work System\n- Holidays, Annual Leave, and Permission to Leave\n- Wages\n- Disciplinary Action',
    materials:
      'Company Policies Material:\n- Employment Relations\n- Working Hours\n- Work System\n- Holidays, Annual Leave, and Permission to Leave\n- Wages\n- Disciplinary Action',
    media: 'Video',
    durationMinutes: 60,
    materialAccess: 'Video Link: Company Policies\nMaterial:\n- Peraturan Perusahaan\n- Kode Etik Perusahaan',
    notes: 'Reference company handbook for detailed leave policy and code of conduct provisions.',
  },
  {
    id: 'mod-7',
    topic: 'Personnel Administration',
    pic: 'HRD',
    objectives:
      'To provide clarity on administrative procedures including time tracking attendance record, leave record, and company\'s media communication.',
    frameworkMaterials:
      'Personnel Administration Materials :\n- Time & Task Tracking\n- LeadGeeks Media Communication',
    materials:
      'Personnel Administration Materials :\n- Time & Task Tracking\n- LeadGeeks Media Communication',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: 'Video Link: Personnel Administration',
    notes: 'Ensure your daily attendance and time tracking sheet bookmark is configured.',
  },
  {
    id: 'mod-8',
    topic: 'IT Department Introduction & IT Guidelines',
    pic: 'IT Manager',
    objectives:
      'To introduce the department’s main functions, core values, strategic goals, internal structure, team members’ roles, and expected cross-department collaboration.\n\nIT Guidelines:\nTo guide new hires on proper usage of company systems, communication tools, data security protocols, and IT support procedures, ensuring safe, efficient, and responsible use of technology in daily operations.',
    frameworkMaterials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals relevant to all employees\n- Structure & Personnel Roles\n\nIT Guidelines Material:\n- User Account Management\n- Hardware Devices Management\n- Software Management\n- Network Management\n- Data Management',
    materials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals relevant to all employees\n- Structure & Personnel Roles\n\nIT Guidelines Material:\n- User Account Management\n- Hardware Devices Management\n- Software Management\n- Network Management\n- Data Management',
    media: 'Video',
    durationMinutes: 45,
    materialAccess: '- Video Link: IT Department Introduction dan IT Guidelines\n- PPT: IT Guidelines Deck',
    notes:
      'Evaluation & Feedback:\n- After watching the videos, New Hires must fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- For the IT Department the QnA mostly will be conducted via Telegram chat.\n- However, if the questions need further explanation the Q&A session is to be held as part of a meeting (15 to 30 minutes).\n- All questions should be included on the Daily Evaluation form.',
  },
  {
    id: 'mod-9',
    topic: 'Introduction to Management Office Department',
    pic: 'Managing Director & Executive Assistant',
    objectives:
      'To introduce the department’s main functions, core values, strategic goals relevant to all employees, internal structure, team members’ roles and responsibilities, and expected collaboration across departments.',
    frameworkMaterials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals\n- Structure & Personnel\n- Support Us',
    materials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Goals\n- Structure & Personnel\n- Support Us',
    media: 'Video',
    durationMinutes: 40,
    materialAccess: '- Video Link: Management Office Department Introduction\n- PPT : Management Office Department Introduction',
    notes:
      'Evaluation & Feedback:\n- After watching the videos, New Hires must fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- Management Office Q&A will be conducted via Telegram chat; no separate meeting will be held.\n- Include any questions in the Daily Evaluation form.',
  },
  {
    id: 'mod-10',
    topic: 'Introduction to Finance & Accounting Department',
    pic: 'Executive Assistant & Accounting and Tax Staff',
    objectives:
      'To understand department functions, values, reimbursement SOPs, budget approvals, and financial collaboration workflows across LeadGeeks.',
    frameworkMaterials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Collaboration\n- Structure & Personnel\n- Support Us',
    materials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Dept Collaboration\n- Structure & Personnel\n- Support Us',
    media: 'Video',
    durationMinutes: 30,
    materialAccess: '- Video Link: Finance & Accounting Department Introduction\n- PPT : Finance & Accounting Department Introduction',
    notes: 'Q&A conducted via Telegram chat or through the Daily Evaluation form.',
  },
  {
    id: 'mod-11',
    topic: 'Experience Department Introduction',
    pic: 'Experience Manager',
    objectives:
      'To understand how Experience bridges clients, management, and employees via PrEACH values, fostering internal community and client satisfaction.',
    frameworkMaterials:
      'Dept Intro Material:\n- Structure & Team Members\n- Goals & Functions (Programs that we provide from each function)\n- Values and Special Messages',
    materials:
      'Dept Intro Material:\n- Structure & Team Members\n- Goals & Functions (Programs that we provide from each function)\n- Values and Special Messages',
    media: 'Online Meeting',
    durationMinutes: 90,
    materialAccess: '- PPT : PPT Materials, Experience Dept Intro',
    notes:
      'Evaluation & Feedback:\n- Fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- Q&A will be held directly during the Online Live Session.\n- All questions asked should be included in the Daily Evaluation.',
  },
  {
    id: 'mod-12',
    topic: 'Operations Department Introduction',
    pic: 'Operations Manager',
    objectives:
      'To grasp the core engine of LeadGeeks: lead generation methodologies, operational standards, service fulfillment pipelines, and client delivery SLAs.',
    frameworkMaterials:
      'Dept Intro Material:\n- Department Purpose\n- Team Structure\n- Clients\n- Department Function\n- Service Provided\n- Department\'s culture & A-G Value\n- Assessment in Operations Department\n- Department Fun Facts',
    materials:
      'Dept Intro Material:\n- Department Purpose\n- Team Structure\n- Clients\n- Department Function\n- Service Provided\n- Department\'s culture & A-G Value\n- Assessment in Operations Department\n- Department Fun Facts',
    media: 'Video',
    durationMinutes: 30,
    materialAccess: '- Video Link: Operations Dept Introduction\n- PPT: Materials, Operations Dept Intro',
    notes:
      'Evaluation & Feedback:\n- Fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session (Optional):\n- Meeting duration 15 to 30 minutes if needed, or via Telegram chat.',
  },
  {
    id: 'mod-13',
    topic: 'Growth Department Introduction',
    pic: 'Growth Manager',
    objectives:
      'To understand the dual-engine growth strategy (Inbound & Outbound), Ideal Customer Profile (ICP) targeting, and how marketing drives revenue.',
    frameworkMaterials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Structure & Personnel\n- SMART Goals',
    materials:
      'Dept Intro Material:\n- Dept Functions\n- Dept Values\n- Structure & Personnel\n- SMART Goals',
    media: 'Video',
    durationMinutes: 25,
    materialAccess: '- Video Link: Growth Department Introduction\n- PPT: Growth Department Introduction',
    notes: 'Understand the 8 WEs growth framework and sales-marketing alignment.',
  },
  {
    id: 'mod-14',
    topic: 'Individual Call with Internal Experience Staff',
    pic: 'Experience Department',
    objectives:
      'To create a personal, open, and confidential space for employees to share their personal and professional experiences, challenges, aspirations, and feedback, while strengthening connection, supporting development, and reinforcing the Company’s Culture and Values.',
    frameworkMaterials:
      'Session Materials :\n- Purpose of Individual Call\n- Informal & Safe Conversation Setting\n- Personal & Professional Check-in\n- Career Development & Growth Awareness\n- Engagement & Participation Reflection\n- Culture & Values Alignment\n- Confidentiality & Consent Agreement\n- Escalation & Reporting Mechanism\n- Follow-Up & Action from Management\n- Program Schedule (Half 1 & Half 2)',
    materials:
      'Session Materials :\n- Purpose of Individual Call\n- Informal & Safe Conversation Setting\n- Personal & Professional Check-in\n- Career Development & Growth Awareness\n- Engagement & Participation Reflection\n- Culture & Values Alignment\n- Confidentiality & Consent Agreement\n- Escalation & Reporting Mechanism\n- Follow-Up & Action from Management\n- Program Schedule (Half 1 & Half 2)',
    media: 'Online Meeting',
    durationMinutes: 60,
    materialAccess: 'Live 1-on-1 Session on Google Meet',
    notes:
      'Evaluation & Feedback:\n- Fill out General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- Questions can be addressed directly during the 1-on-1 session.',
  },
  {
    id: 'mod-15',
    topic: 'Anonymous Feedback with Internal Experience Staff',
    pic: 'Experience Department',
    objectives:
      'To provide a secure and anonymous channel for employees to express concerns, suggestions, criticism, and appreciation without fear of identification, ensuring issues are addressed promptly and transparently through appropriate management actions.',
    frameworkMaterials:
      'Session Materials :\n- Purpose of Anonymous Feedback\n- Anonymity & Data Protection\n- Feedback Classification: Appreciation, Suggestion, Criticism, Issue\n- Context Analysis & Root Cause Understanding\n- Coordination with HRD & Management Office\n- Solution Design & Corrective Action\n- Reporting Cycle & Update Timeline\n- Transparency to Employees',
    materials:
      'Session Materials :\n- Purpose of Anonymous Feedback\n- Anonymity & Data Protection\n- Feedback Classification: Appreciation, Suggestion, Criticism, Issue\n- Context Analysis & Root Cause Understanding\n- Coordination with HRD & Management Office\n- Solution Design & Corrective Action\n- Reporting Cycle & Update Timeline\n- Transparency to Employees',
    media: 'Document / Portal',
    durationMinutes: 15,
    materialAccess: 'LeadGeeks Anonymous Feedback Submission Portal',
    notes: 'Submissions are strictly confidential and reviewed directly by Management.',
  },
  {
    id: 'mod-16',
    topic: 'Meeting Preparation with Clients with External Experience Staff',
    pic: 'External Experience Staff',
    objectives:
      'To equip employees with the essential skills and mindset to prepare for and participate effectively in client meetings by building professional communication habits, active engagement, and respectful meeting behavior, ensuring productive discussions and positive client experiences.',
    frameworkMaterials:
      'Session Materials :\n- Preparation is key\n- Speak clearly and concisely.\n- Active listening is essential.\n- Avoid interruptions.\n- Be confident in your language skills.\n- Use online tools effectively.\n- Be respectful and professional.',
    materials:
      'Session Materials :\n- Preparation is key\n- Speak clearly and concisely.\n- Active listening is essential.\n- Avoid interruptions.\n- Be confident in your language skills.\n- Use online tools effectively.\n- Be respectful and professional.',
    media: 'Online Meeting',
    durationMinutes: 60,
    materialAccess: 'PPT : Tips and Tricks for Meeting Culture, Behaviours, Expectations, and Engagement',
    notes:
      'Evaluation & Feedback:\n- Fill out General Onboarding Kit Feedback Sheet.\n\nQ&A Session:\n- Addressed directly during meeting or via Telegram.',
  },
  {
    id: 'mod-17',
    topic: 'ESMR (Employer & Staff Media Representation) with External Experience Staff',
    pic: 'External Experience Staff',
    objectives:
      'To encourage employees to actively participate in employer branding efforts through professional social media engagement, while strengthening LeadGeeks’ visibility, credibility, and network within relevant industries.',
    frameworkMaterials:
      'Session Materials :\n- Purpose of ESMR Program\n- Employee Role as Brand Ambassador\n- Social Media Engagement Standards (React, Comment, Repost, Connect, Follow)\n- Target Activity & Consistency\n- Tracking & Documentation System',
    materials:
      'Session Materials :\n- Purpose of ESMR Program\n- Employee Role as Brand Ambassador\n- Social Media Engagement Standards (React, Comment, Repost, Connect, Follow)\n- Target Activity & Consistency\n- Tracking & Documentation System',
    media: 'Document & Policy',
    durationMinutes: 25,
    materialAccess: 'ESMR Guidelines & LinkedIn Standards Deck',
    notes: 'Guides employees on representing LeadGeeks professionally on LinkedIn and professional media.',
  },
  {
    id: 'mod-18',
    topic: 'Basic Digital Marketing Training',
    pic: 'HRD & Operations Manager',
    objectives:
      'To provide an introductory understanding of digital marketing principles, tools, and strategies, enabling new hires to grasp how the company builds brand presence and generates leads online.',
    frameworkMaterials:
      'Training Materials :\n- Introduction to digital marketing\n- Marketing funnel\n- Metrics and measurement\n- Organic vs paid\n- Digital Marketing at LeadGeeks\n- Email Marketing\n- Lead generation\n- Data cleaning\n- What\'s Next?\n- SEO service and E-commerce',
    materials:
      'Training Materials :\n- Introduction to digital marketing\n- Marketing funnel\n- Metrics and measurement\n- Organic vs paid\n- Digital Marketing at LeadGeeks\n- Email Marketing\n- Lead generation\n- Data cleaning\n- What\'s Next?\n- SEO service and E-commerce',
    media: 'Video & Online Live Session QnA',
    durationMinutes: 60,
    materialAccess: '- Video Link: Basic Digital Marketing Training\n- PPT: Basic Digital Marketing Training Deck',
    notes:
      'Session Notes:\nTraining will be held Quarterly or Bi-annually.\n\nEvaluation & Feedback:\n- After watching the videos, New Hires must fill out the General Onboarding Kit Feedback Sheet.\n\nQ&A Session (Optional):\n- Meeting duration 15 to 30 minutes if needed.',
  },
  {
    id: 'mod-19',
    topic: 'Business English Training',
    pic: 'HRD & Experience Manager',
    objectives:
      'To strengthen professional communication skills in English, with a focus on real workplace scenarios such as email writing, meetings, reporting, or collaboration.',
    frameworkMaterials:
      'Training Materials :\n- Understanding LeadGeeks and English Proficiency Baseline\n- Verbal and Written Reporting Skills\n- Effective Presentation Building and Delivery\n- Enhancing Relevance and Impact in Presentations\n- Capstone Presentation and Evaluation',
    materials:
      'Training Materials :\n- Understanding LeadGeeks and English Proficiency Baseline\n- Verbal and Written Reporting Skills\n- Effective Presentation Building and Delivery\n- Enhancing Relevance and Impact in Presentations\n- Capstone Presentation and Evaluation',
    media: 'Online Meeting',
    durationMinutes: 90,
    materialAccess: '- Framework Link: Business English Training Materials',
    notes:
      'Session Notes:\nTraining will be held Quarterly or Bi-annually.\n\nQ&A Session (Optional):\n- Meeting duration 15 to 30 minutes if needed.\n- Include questions in the Daily Evaluation.',
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

export function findTrainingModule(idOrTopic: string): TrainingModule | undefined {
  if (!idOrTopic) return undefined;
  const q = idOrTopic.trim().toLowerCase();
  return OFFICIAL_TRAINING_MODULES.find(
    (m) => m.id.toLowerCase() === q || m.topic.toLowerCase().includes(q)
  );
}

export function clipboardRowForModule(mod: TrainingModule): string {
  return [
    mod.pic,
    mod.topic,
    mod.objectives.replace(/[\t\r\n]+/g, ' '),
    mod.frameworkMaterials.replace(/[\t\r\n]+/g, ' '),
    mod.media,
    mod.durationMinutes,
    (mod.materialAccess || '').replace(/[\t\r\n]+/g, ' '),
    (mod.notes || '').replace(/[\t\r\n]+/g, ' '),
  ].join('\t');
}
