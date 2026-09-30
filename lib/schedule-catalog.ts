import type { Activity, ActivityStatus } from '@/lib/types/activity';

/**
 * Official master schedule activities from worksheet 'Schedule' (Rows 3–70)
 * in the HR onboarding workbook.
 */

export type ScheduleProgress = 'Done' | 'In Progress' | 'On-Hold' | 'Reschedule' | '';

export interface ScheduleActivity {
  readonly id: string;
  readonly rowNumber: number; // Row number in sheet 'Schedule' (e.g. 3, 4, 20...)
  readonly week: string; // 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Month 1 Review', etc.
  readonly day: string; // 'Tuesday', 'Wednesday', etc.
  readonly date: string; // DD/MM/YYYY
  readonly activityCount?: number; // 1, 2, 3...
  readonly pic: string; // HRD, CEO, MD, IT Manager, IT Staff, Experience...
  readonly topic: string;
  readonly mainMedia: string; // Online Meeting, Video, Knowledge Sharing...
  readonly durationMinutes?: number; // Column G
  readonly startTime?: string; // Column H (HH:MM)
  readonly endTime?: string; // Column I (HH:MM)
  readonly progress: ScheduleProgress | string; // Column J: 'Done' | 'In Progress' | 'On-Hold' | 'Reschedule' | ''
  readonly materialsLink?: string; // Column K: Link to the Materials or Recording
  readonly notes?: string; // Column L: Notes
}

export const SCHEDULE_CUSTOMIZATIONS_STORAGE_KEY = 'nova-schedule-customizations';

export const OFFICIAL_SCHEDULE_ACTIVITIES: readonly ScheduleActivity[] = [
  {
    "id": "sched-row-3",
    "rowNumber": 3,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 1,
    "pic": "HRD",
    "topic": "Introduction to Onboarding Framework",
    "mainMedia": "Online Meeting",
    "durationMinutes": 30,
    "startTime": "08:30",
    "endTime": "09:00",
    "progress": "Done"
  },
  {
    "id": "sched-row-4",
    "rowNumber": 4,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 2,
    "pic": "CEO",
    "topic": "Welcoming Message from Chief Executive Officer (CEO)",
    "mainMedia": "Video",
    "durationMinutes": 3,
    "startTime": "09:15",
    "endTime": "09:18",
    "progress": "Done"
  },
  {
    "id": "sched-row-5",
    "rowNumber": 5,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 3,
    "pic": "Managing Director",
    "topic": "Welcoming Message from Managing Directors (MD)",
    "mainMedia": "Video",
    "durationMinutes": 3,
    "startTime": "09:19",
    "endTime": "09:22",
    "progress": "Done"
  },
  {
    "id": "sched-row-6",
    "rowNumber": 6,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 4,
    "pic": "Managing Director",
    "topic": "Introduction to LeadGeeks",
    "mainMedia": "Video",
    "durationMinutes": 30,
    "startTime": "09:23",
    "endTime": "09:53",
    "progress": "Done"
  },
  {
    "id": "sched-row-7",
    "rowNumber": 7,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 5,
    "pic": "HRD",
    "topic": "Introduction to Human Resources Department",
    "mainMedia": "Video",
    "durationMinutes": 20,
    "startTime": "10:00",
    "endTime": "10:20",
    "progress": "Done"
  },
  {
    "id": "sched-row-8",
    "rowNumber": 8,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 6,
    "pic": "HRD",
    "topic": "Company Policies & Employee Guidelines",
    "mainMedia": "Video",
    "durationMinutes": 60,
    "startTime": "10:30",
    "endTime": "11:30",
    "progress": "Done"
  },
  {
    "id": "sched-row-9",
    "rowNumber": 9,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 7,
    "pic": "HRD",
    "topic": "Personnel Administration",
    "mainMedia": "Video",
    "durationMinutes": 40,
    "startTime": "13:00",
    "endTime": "13:40",
    "progress": "Done"
  },
  {
    "id": "sched-row-10",
    "rowNumber": 10,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 8,
    "pic": "Experience",
    "topic": "Welcoming Event from All Staff",
    "mainMedia": "Online Meeting",
    "durationMinutes": 20,
    "startTime": "12:30",
    "endTime": "12:50",
    "progress": "Done"
  },
  {
    "id": "sched-row-11",
    "rowNumber": 11,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 9,
    "pic": "Managing Director",
    "topic": "Team Introduction",
    "mainMedia": "Online Meeting",
    "progress": "Reschedule"
  },
  {
    "id": "sched-row-12",
    "rowNumber": 12,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 10,
    "pic": "Managing Director & Executive Assistant",
    "topic": "Introduction to Management Office Department",
    "mainMedia": "Video",
    "durationMinutes": 40,
    "startTime": "19:30",
    "endTime": "20:10",
    "progress": "Done"
  },
  {
    "id": "sched-row-13",
    "rowNumber": 13,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 11,
    "pic": "Experience Manager",
    "topic": "Experience Department Introduction",
    "mainMedia": "Online Meeting",
    "durationMinutes": 90,
    "startTime": "15:00",
    "endTime": "16:30",
    "progress": "Done"
  },
  {
    "id": "sched-row-14",
    "rowNumber": 14,
    "week": "Week 1",
    "day": "Tuesday",
    "date": "01/09/2026",
    "activityCount": 12,
    "pic": "HRD Staff",
    "topic": "Filling Time and Task Tracking (Practice)",
    "mainMedia": "Online Meeting",
    "durationMinutes": 40,
    "startTime": "16:30",
    "endTime": "17:10",
    "progress": "Done"
  },
  {
    "id": "sched-row-15",
    "rowNumber": 15,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 13,
    "pic": "IT Manager",
    "topic": "Introduction to the IT Department\n- Structure of IT Department\n- Roles and Responsibilites\n- IT Department Values\n- IT Department Functions",
    "mainMedia": "Knowledge Sharing",
    "durationMinutes": 125,
    "startTime": "09:00",
    "endTime": "11:05",
    "progress": "Done"
  },
  {
    "id": "sched-row-16",
    "rowNumber": 16,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 14,
    "pic": "IT Staff",
    "topic": "Independent Learning",
    "mainMedia": "Independent Learning",
    "durationMinutes": 210,
    "startTime": "13:30",
    "endTime": "17:00",
    "progress": "Done"
  },
  {
    "id": "sched-row-17",
    "rowNumber": 17,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 15,
    "pic": "Growth Manager",
    "topic": "Growth Department Introduction",
    "mainMedia": "Video",
    "durationMinutes": 25,
    "startTime": "11:05",
    "endTime": "11:30",
    "progress": "Done"
  },
  {
    "id": "sched-row-18",
    "rowNumber": 18,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 16,
    "pic": "Operations Manager",
    "topic": "Operations Department Introduction",
    "mainMedia": "Video",
    "durationMinutes": 30,
    "startTime": "11:30",
    "endTime": "12:00",
    "progress": "Done"
  },
  {
    "id": "sched-row-19",
    "rowNumber": 19,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 17,
    "pic": "Executive Assistant & Accounting & Tax Staff",
    "topic": "Introduction to Finance & Accounting Department",
    "mainMedia": "Video",
    "durationMinutes": 30,
    "startTime": "14:00",
    "endTime": "14:30",
    "progress": "Done"
  },
  {
    "id": "sched-row-20",
    "rowNumber": 20,
    "week": "Week 1",
    "day": "Thursday",
    "date": "03/09/2026",
    "activityCount": 18,
    "pic": "IT Manager",
    "topic": "How IT Works at LeadGeeks\n- IT Workflow & Working Approach\n- Cross-Department Collaboration\n- Current IT Priorities & Ongoing Initiatives\n- IT Guidelines & SOP",
    "mainMedia": "Knowledge Sharing",
    "durationMinutes": 155,
    "startTime": "10:00",
    "endTime": "12:35",
    "progress": "Done",
    "materialsLink": "https://drive.google.com/drive/folders/1vqgl2skPDySh-IEBajNKyRVXkOh2RQrH?usp=sharing"
  },
  {
    "id": "sched-row-21",
    "rowNumber": 21,
    "week": "Week 1",
    "day": "Thursday",
    "date": "03/09/2026",
    "activityCount": 19,
    "pic": "IT Staff",
    "topic": "Independent Learning",
    "mainMedia": "Independent Learning",
    "durationMinutes": 325,
    "startTime": "14:05",
    "endTime": "18:00",
    "progress": "Done",
    "materialsLink": "https://drive.google.com/drive/folders/1H3Far06NyOVsLKn_0v1_1ko044n6QUGF?usp=sharing"
  },
  {
    "id": "sched-row-22",
    "rowNumber": 22,
    "week": "Week 1",
    "day": "Friday",
    "date": "04/09/2026",
    "activityCount": 20,
    "pic": "IT Manager",
    "topic": "Understanding the Current IT Ecosystem\n- Main Tools & Platforms\n- Systems & Services\n- Key Dependencies\n- Basic IT Environment",
    "mainMedia": "Knowledge Sharing & Demonstration",
    "durationMinutes": 175,
    "progress": "Done"
  },
  {
    "id": "sched-row-23",
    "rowNumber": 23,
    "week": "Week 1",
    "day": "Friday",
    "date": "04/09/2026",
    "activityCount": 21,
    "pic": "IT Staff",
    "topic": "Independent Learning",
    "mainMedia": "Independent Learning",
    "progress": "Done"
  },
  {
    "id": "sched-row-25",
    "rowNumber": 25,
    "week": "Week 2",
    "day": "Monday",
    "date": "07/09/2026",
    "activityCount": 22,
    "pic": "IT Manager",
    "topic": "Understanding LeadGeeks IT Department Functions\n- Infrastructure Management\n- Website Management\n- Technology Optimization & Innovation\n- Cybersecurity\n- Relationships & Dependencies Between Functions",
    "mainMedia": "Knowledge Sharing & Discussion",
    "durationMinutes": 105,
    "startTime": "10:00",
    "endTime": "11:45",
    "progress": "Done"
  },
  {
    "id": "sched-row-26",
    "rowNumber": 26,
    "week": "Week 2",
    "day": "Monday",
    "date": "07/09/2026",
    "activityCount": 23,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Identify and map each IT function, its responsibilities, main systems/tools, and dependencies.",
    "mainMedia": "Personal Learning and Task",
    "durationMinutes": 50,
    "startTime": "23:44",
    "endTime": "00:34",
    "progress": "Done"
  },
  {
    "id": "sched-row-27",
    "rowNumber": 27,
    "week": "Week 2",
    "day": "Tuesday",
    "date": "08/09/2026",
    "activityCount": 24,
    "pic": "IT Manager",
    "topic": "Infrastructure Management at LeadGeeks\n- Current Environment\n- Core Services (Google Workspace)\n- User & Device Management\n- Standards & Operational Scope",
    "mainMedia": "Knowledge Sharing & Discussion",
    "progress": "Done"
  },
  {
    "id": "sched-row-28",
    "rowNumber": 28,
    "week": "Week 2",
    "day": "Tuesday",
    "date": "08/09/2026",
    "activityCount": 25,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Create a simple web app based on data from user account management, hardware device management, and software management.",
    "mainMedia": "Personal Learning and Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-29",
    "rowNumber": 29,
    "week": "Week 2",
    "day": "Wednesday",
    "date": "09/09/2026",
    "activityCount": 26,
    "pic": "IT Manager",
    "topic": "Technology Optimization & Innovation at LeadGeeks\n- AI & Automation\n- Google Apps Script & Workflow Automation\n- System Development & Process Improvement\n- Existing Initiatives & Future Direction",
    "mainMedia": "Knowledge Sharing & Discussion",
    "progress": "Done"
  },
  {
    "id": "sched-row-30",
    "rowNumber": 30,
    "week": "Week 2",
    "day": "Wednesday",
    "date": "09/09/2026",
    "activityCount": 27,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Create a simple web app to optimize and automate workflows/processes for time and task tracking.",
    "mainMedia": "Personal Learning and Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-31",
    "rowNumber": 31,
    "week": "Week 2",
    "day": "Thursday",
    "date": "10/09/2026",
    "activityCount": 28,
    "pic": "IT Manager",
    "topic": "Cybersecurity at LeadGeeks\n- Current Security Practices\n- Data Protection & GDPR\n- Security Risks & Priorities\n- Security Assessment & Basic Response",
    "mainMedia": "Knowledge Sharing & Discussion",
    "progress": "Done"
  },
  {
    "id": "sched-row-32",
    "rowNumber": 32,
    "week": "Week 2",
    "day": "Thursday",
    "date": "10/09/2026",
    "activityCount": 29,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Review security recommendation tools and identify potential security tools for implementation this year.",
    "mainMedia": "Personal Learning and Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-33",
    "rowNumber": 33,
    "week": "Week 2",
    "day": "Friday",
    "date": "11/09/2026",
    "activityCount": 30,
    "pic": "IT Manager",
    "topic": "Website Management at LeadGeeks\n- Website Ecosystem & Dependencies\n- CMS / WordPress\n- Website Structure & Content Management\n- Technical SEO & Digital Presence",
    "mainMedia": "Knowledge Sharing & Discussion",
    "progress": "Done"
  },
  {
    "id": "sched-row-34",
    "rowNumber": 34,
    "week": "Week 2",
    "day": "Friday",
    "date": "11/09/2026",
    "activityCount": 31,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Identify and explore processes and features in the website CMS (Wordpress) that can be optimized using AI.",
    "mainMedia": "Personal Learning and Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-36",
    "rowNumber": 36,
    "week": "Week 3",
    "day": "Monday",
    "date": "14/09/2026",
    "activityCount": 32,
    "pic": "IT Staff",
    "topic": "Contact and conduct meetings with 3 relevant other department members (Operations and Growth) to understand Lead Generation processes and AI Optimization efforts in 2025 and 2026",
    "mainMedia": "Personal Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-37",
    "rowNumber": 37,
    "week": "Week 3",
    "day": "Tuesday",
    "date": "15/09/2026",
    "activityCount": 33,
    "pic": "IT Staff",
    "topic": "Observe the processes and identify potential opportunities for AI optimization, then develop solution proposals for discussion in the Technology Optimization meeting",
    "mainMedia": "Personal Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-38",
    "rowNumber": 38,
    "week": "Week 3",
    "day": "Wednesday",
    "date": "16/09/2026",
    "activityCount": 33,
    "pic": "IT Staff",
    "topic": "Prepare the presentation for proposed technology optimization using AI",
    "mainMedia": "Personal Task",
    "progress": "Done"
  },
  {
    "id": "sched-row-39",
    "rowNumber": 39,
    "week": "Week 3",
    "day": "Thursday",
    "date": "17/09/2026",
    "activityCount": 34,
    "pic": "IT Staff",
    "topic": "Identify and explore proposed solutions for the optimization and automation of the AI Email Template Creation process",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-40",
    "rowNumber": 40,
    "week": "Week 3",
    "day": "Thursday",
    "date": "17/09/2026",
    "activityCount": 35,
    "pic": "IT Staff",
    "topic": "Explore Beanstalk application to check the functionality",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-41",
    "rowNumber": 41,
    "week": "Week 3",
    "day": "Friday",
    "date": "18/09/2026",
    "activityCount": 36,
    "pic": "IT Manager",
    "topic": "Introduction to IT Department 2026 SMART Goals and Understanding How IT Support LeadGeeks Business Objectives",
    "mainMedia": "Knowledge Sharing & Discussion",
    "progress": "Done"
  },
  {
    "id": "sched-row-42",
    "rowNumber": 42,
    "week": "Week 3",
    "day": "Friday",
    "date": "18/09/2026",
    "activityCount": 37,
    "pic": "IT Staff",
    "topic": "Independent Learning\n- Read all SMART goals in IT Department including the current progress and next action items.",
    "mainMedia": "Personal Learning",
    "progress": ""
  },
  {
    "id": "sched-row-44",
    "rowNumber": 44,
    "week": "Week 4",
    "day": "Monday",
    "date": "21/09/2026",
    "activityCount": 38,
    "pic": "Managing Director",
    "topic": "Beyond the Slides: Chat with the Managing Director",
    "mainMedia": "Offline",
    "progress": "Done"
  },
  {
    "id": "sched-row-45",
    "rowNumber": 45,
    "week": "Week 4",
    "day": "Monday",
    "date": "21/09/2026",
    "activityCount": 39,
    "pic": "Experience Manager",
    "topic": "Business English Training",
    "mainMedia": "Online",
    "progress": "Done"
  },
  {
    "id": "sched-row-46",
    "rowNumber": 46,
    "week": "Week 4",
    "day": "Tuesday",
    "date": "22/09/2026",
    "activityCount": 40,
    "pic": "IT Staff",
    "topic": "Develop and make the NOVA Onboarding, TETRA Time and Task Tracking, CORE IT Dashboard, and SMART Goals dashboard web app accessible to the public, including a clone database",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-47",
    "rowNumber": 47,
    "week": "Week 4",
    "day": "Tuesday",
    "date": "22/09/2026",
    "activityCount": 41,
    "pic": "IT Staff",
    "topic": "Integrate the web apps with Google authentication and spreadsheet synchronization",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-48",
    "rowNumber": 48,
    "week": "Week 4",
    "day": "Wednesday",
    "date": "23/09/2026",
    "activityCount": 42,
    "pic": "IT Staff",
    "topic": "Develop a solution for creating and quality-checking email templates using ChatGPT, based on custom instructions and agent guidance",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-49",
    "rowNumber": 49,
    "week": "Week 4",
    "day": "Wednesday",
    "date": "23/09/2026",
    "activityCount": 43,
    "pic": "IT Staff",
    "topic": "Explore other solutions including workflow automation and ChatGPT alternatives that do not require a subscription, for email template creation and quality checking",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-50",
    "rowNumber": 50,
    "week": "Week 4",
    "day": "Thursday",
    "date": "24/09/2026",
    "activityCount": 44,
    "pic": "IT Staff",
    "topic": "Explore ways to connect the spreadsheet with ChatGPT for email template creation and quality checking",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-51",
    "rowNumber": 51,
    "week": "Week 4",
    "day": "Friday",
    "date": "25/09/2026",
    "activityCount": 45,
    "pic": "IT Staff",
    "topic": "Adjust the layout and design of the NOVA Onboarding, TETRA Time and Task Tracking, CORE IT Dashboard, and SMART Goals Dashboard web apps",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-53",
    "rowNumber": 53,
    "week": "Week 5",
    "day": "Monday",
    "date": "28/09/2026",
    "activityCount": 46,
    "pic": "Experience Manager",
    "topic": "Business English Training",
    "mainMedia": "Online",
    "progress": "Done"
  },
  {
    "id": "sched-row-54",
    "rowNumber": 54,
    "week": "Week 5",
    "day": "Monday",
    "date": "28/09/2026",
    "activityCount": 47,
    "pic": "IT Staff",
    "topic": "Explore AI Agent to support the automation process",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-55",
    "rowNumber": 55,
    "week": "Week 5",
    "day": "Tuesday",
    "date": "29/09/2026",
    "activityCount": 48,
    "pic": "IT Staff",
    "topic": "Develop an automation process to connect the spreadsheet with ChatGPT for email template creation and quality checking",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-56",
    "rowNumber": 56,
    "week": "Week 5",
    "day": "Wednesday",
    "date": "30/09/2026",
    "activityCount": 49,
    "pic": "IT Staff",
    "topic": "Revise and develop an automation process for email template creation and quality checking using ChatGPT",
    "mainMedia": "Personal Task",
    "progress": ""
  },
  {
    "id": "sched-row-58",
    "rowNumber": 58,
    "week": "Month 1 Review",
    "day": "Thursday",
    "date": "01/10/2026",
    "pic": "IT & HRD & MD",
    "topic": "Month 1 Performance Review & Feedback and Month 2 Expectations",
    "mainMedia": "Monthly Review",
    "progress": ""
  },
  {
    "id": "sched-row-81",
    "rowNumber": 81,
    "week": "Month 2 Review",
    "day": "Monday",
    "date": "02/11/2026",
    "pic": "IT & HRD & MD",
    "topic": "Month 2 Performance Review & Feedback and Month 3 Expectations",
    "mainMedia": "Monthly Review",
    "progress": ""
  },
  {
    "id": "sched-row-85",
    "rowNumber": 85,
    "week": "Month 3 Review",
    "day": "Tuesday",
    "date": "01/12/2026",
    "pic": "IT & HRD & MD",
    "topic": "Month 3 Performance Review & Feedback",
    "mainMedia": "Monthly Review",
    "progress": ""
  },
];

export function escapeTsv(val: unknown): string {
  if (val === undefined || val === null) return '';
  const s = String(val);
  if (s.includes('\t') || s.includes('\n') || s.includes('\r') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}


/**
 * Returns 6-column TSV string for Columns G–L of sheet 'Schedule':
 * [Duration (minutes), Start Time, End Time, Progress, Link to Materials/Recording, Notes]
 *
 * NOTE: Google Sheets Column J only accepts: 'Done', 'In Progress', 'On-Hold', 'Reschedule', or '' (blank).
 * Unstarted activities must be serialized as '' to satisfy Google Sheets data validation.
 */
export function clipboardRowForScheduleGtoL(activity: ScheduleActivity): string {
  const duration = activity.durationMinutes !== undefined ? String(activity.durationMinutes) : "";
  const start = activity.startTime || "";
  const end = activity.endTime || "";
  const progress = activity.progress && activity.progress !== "Not Started" ? activity.progress : "";
  const materialsLink = activity.materialsLink || "";
  const notes = activity.notes || "";

  return [duration, start, end, progress, materialsLink, notes].map(escapeTsv).join("\t");
}

/**
 * Alias for clipboardRowForScheduleGtoL to preserve compatibility with existing callers.
 */
export function clipboardRowForScheduleGtoK(activity: ScheduleActivity): string {
  return clipboardRowForScheduleGtoL(activity);
}

/**
 * Returns 12-column TSV string for Columns A–L of sheet 'Schedule':
 * [Day, Date, Activity Count, PIC, Topic, Main Media, Duration, Start Time, End Time, Progress, Link, Notes]
 */
export function clipboardRowForScheduleFull(activity: ScheduleActivity): string {
  const duration = activity.durationMinutes !== undefined ? String(activity.durationMinutes) : "";
  const count = activity.activityCount !== undefined ? String(activity.activityCount) : "";
  const start = activity.startTime || "";
  const end = activity.endTime || "";
  const progress = activity.progress && activity.progress !== "Not Started" ? activity.progress : "";
  const materialsLink = activity.materialsLink || "";
  const notes = activity.notes || "";

  return [
    activity.day,
    activity.date,
    count,
    activity.pic,
    activity.topic,
    activity.mainMedia,
    duration,
    start,
    end,
    progress,
    materialsLink,
    notes,
  ]
    .map(escapeTsv)
    .join("\t");
}

export function calculateDurationFromTimes(start: string, end: string): number | undefined {
  if (!start || !end) return undefined;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return undefined;
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) {
    // If started in late evening (>= 18:00) and ended after midnight (<= 06:00), handle midnight crossover
    if (sh >= 18 && eh <= 6) {
      diff += 24 * 60;
    } else {
      return undefined;
    }
  }
  return diff >= 0 ? diff : undefined;
}

export function readScheduleCustomizations(raw: string | null): Record<string, Partial<ScheduleActivity>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function writeScheduleCustomizations(custom: Record<string, Partial<ScheduleActivity>>): string {
  return JSON.stringify(custom);
}

export function scheduleActivityToActivity(item: ScheduleActivity): Activity {
  const isWelcome = item.topic.toLowerCase().includes('welcome') || item.pic === 'CEO' || item.pic === 'Experience';
  const isSetup = item.topic.toLowerCase().includes('setup') || item.topic.toLowerCase().includes('credential') || item.topic.toLowerCase().includes('account');
  const type = isWelcome ? 'welcome' : isSetup ? 'setup' : 'learning';

  const status: ActivityStatus =
    item.progress?.toLowerCase() === 'done'
      ? 'done'
      : item.progress?.toLowerCase() === 'in progress'
      ? 'in-progress'
      : 'not-started';

  return {
    id: item.id,
    name: item.topic,
    type,
    plannedStart: item.startTime || 'TBD',
    plannedEnd: item.endTime || 'TBD',
    status,
    actualStart: item.startTime,
    actualEnd: item.endTime,
    durationMinutes: item.durationMinutes,
    date: item.date,
    day: item.day,
    activityCount: item.activityCount,
    pic: item.pic,
    materialsLink: item.materialsLink,
    notes: item.notes,
  };
}

export function getMergedScheduleActivities(
  customizations: Record<string, Partial<ScheduleActivity>>
): ScheduleActivity[] {
  return OFFICIAL_SCHEDULE_ACTIVITIES.map((act) => {
    const custom = customizations[act.id];
    if (!custom) return act;
    return {
      ...act,
      ...custom,
    };
  });
}

export function getProgressBadge(progress?: string): string {
  const p = progress?.toLowerCase();
  if (p === 'done') return 'bg-mint-50 text-mint-700 border-mint-200';
  if (p === 'in progress') return 'bg-peach-50 text-peach-700 border-peach-200';
  if (p === 'on-hold') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (p === 'reschedule') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-stone-50 text-stone-600 border-stone-200';
}

export function getPicBadge(pic?: string): string {
  const p = pic?.toLowerCase() || '';
  if (p.includes('it manager')) return 'bg-sky-50 text-sky-700 border-sky-200';
  if (p.includes('hrd')) return 'bg-purple-50 text-purple-700 border-purple-200';
  if (p.includes('ceo')) return 'bg-peach-50 text-peach-700 border-peach-200';
  if (p.includes('experience')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (p.includes('md')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-stone-50 text-stone-700 border-stone-200';
}

/**
 * Compares an activity date (supports DD/MM/YYYY or YYYY-MM-DD or D/M/YYYY) against a target Date.
 */
export function isSameDate(activityDate: string | undefined, targetDate: Date = new Date()): boolean {
  if (!activityDate) return false;
  const text = activityDate.trim();
  if (!text) return false;

  const targetDay = String(targetDate.getDate()).padStart(2, '0');
  const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
  const targetYear = String(targetDate.getFullYear());

  const ddmmyyyy = `${targetDay}/${targetMonth}/${targetYear}`;
  const yyyymmdd = `${targetYear}-${targetMonth}-${targetDay}`;

  if (text === ddmmyyyy || text === yyyymmdd) return true;

  const match = text.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  if (match) {
    if (match[1].length === 4) {
      // YYYY-MM-DD
      const y = match[1];
      const m = match[2].padStart(2, '0');
      const d = match[3].padStart(2, '0');
      return `${y}-${m}-${d}` === yyyymmdd;
    } else {
      // DD/MM/YYYY
      const d = match[1].padStart(2, '0');
      const m = match[2].padStart(2, '0');
      const y = match[3];
      return `${d}/${m}/${y}` === ddmmyyyy;
    }
  }

  return false;
}

/**
 * Filters a schedule catalog to only activities matching the given target Date.
 */
export function getTodayScheduleActivities(
  activities: readonly ScheduleActivity[],
  targetDate: Date = new Date()
): ScheduleActivity[] {
  return activities.filter((a) => isSameDate(a.date, targetDate));
}

