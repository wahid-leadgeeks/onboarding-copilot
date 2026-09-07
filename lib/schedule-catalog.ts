import type { Activity, ActivityStatus } from '@/lib/types/activity';

/**
 * Official master schedule activities from worksheet 'Schedule' (Rows 3–70)
 * in the HR onboarding workbook.
 */

export interface ScheduleActivity {
  readonly id: string;
  readonly rowNumber: number; // Row number in sheet 'Schedule' (e.g. 3, 4, 20...)
  readonly week: string; // 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Month 2', 'Month 3'
  readonly day: string; // 'Tuesday', 'Wednesday', etc.
  readonly date: string; // DD/MM/YYYY
  readonly activityCount: number; // 1, 2, 3...
  readonly pic: string; // HRD, CEO, MD, IT Manager, IT Staff, Experience...
  readonly topic: string;
  readonly mainMedia: string; // Online Meeting, Video, Knowledge Sharing...
  readonly durationMinutes?: number; // Column G
  readonly startTime?: string; // Column H (HH:MM)
  readonly endTime?: string; // Column I (HH:MM)
  readonly progress: 'Done' | 'In Progress' | 'Not Started' | 'Reschedule' | string; // Column J
  readonly notes?: string; // Column K
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "startTime": "",
    "endTime": "",
    "progress": "Reschedule",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
  },
  {
    "id": "sched-row-15",
    "rowNumber": 15,
    "week": "Week 1",
    "day": "Wednesday",
    "date": "02/09/2026",
    "activityCount": 13,
    "pic": "IT Manager",
    "topic": "Intoduction to the IT Department\n- Structure of IT Department\n- Roles and Responsibilites\n- IT Department Values\n- IT Department Functions",
    "mainMedia": "Knowledge Sharing",
    "durationMinutes": 125,
    "startTime": "09:00",
    "endTime": "11:05",
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "progress": "Done",
    "notes": ""
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
    "notes": "https://drive.google.com/drive/folders/1vqgl2skPDySh-IEBajNKyRVXkOh2RQrH?usp=sharing"
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
    "notes": "https://drive.google.com/drive/folders/1H3Far06NyOVsLKn_0v1_1ko044n6QUGF?usp=sharing"
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
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
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
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-24",
    "rowNumber": 24,
    "week": "Week 1",
    "day": "Friday",
    "date": "04/09/2026",
    "activityCount": 22,
    "pic": "IT Manager",
    "topic": "Weekly Check-in (Reflection, Knowledge Alignment & Week 2 Preview)",
    "mainMedia": "Weekly Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-26",
    "rowNumber": 26,
    "week": "Week 2",
    "day": "Monday",
    "date": "07/09/2026",
    "activityCount": 23,
    "pic": "IT Manager",
    "topic": "Understanding LeadGeeks IT Department Functions\n- Infrastructure Management\n- Website Management\n- Technology Optimization & Innovation\n- Cybersecurity\n- Relationships & Dependencies Between Functions",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-27",
    "rowNumber": 27,
    "week": "Week 2",
    "day": "Monday",
    "date": "07/09/2026",
    "activityCount": 24,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Identify and map each IT function, its responsibilities, main systems/tools, and dependencies.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-28",
    "rowNumber": 28,
    "week": "Week 2",
    "day": "Tuesday",
    "date": "08/09/2026",
    "activityCount": 25,
    "pic": "IT Manager",
    "topic": "Infrastructure Management at LeadGeeks\n- Current Environment\n- Core Services (Google Workspace)\n- User & Device Management\n- Standards & Operational Scope",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-29",
    "rowNumber": 29,
    "week": "Week 2",
    "day": "Tuesday",
    "date": "08/09/2026",
    "activityCount": 26,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Identify and document selected tools, platforms, and services, including their purpose, users, owner, and dependencies.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-30",
    "rowNumber": 30,
    "week": "Week 2",
    "day": "Wednesday",
    "date": "09/09/2026",
    "activityCount": 27,
    "pic": "IT Manager",
    "topic": "Technology Optimization & Innovation at LeadGeeks\n- AI & Automation\n- Google Apps Script & Workflow Automation\n- System Development & Process Improvement\n- Existing Initiatives & Future Direction",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-31",
    "rowNumber": 31,
    "week": "Week 2",
    "day": "Wednesday",
    "date": "09/09/2026",
    "activityCount": 28,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Review one existing automation and identify its purpose, trigger, input, process, output, and dependencies.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-32",
    "rowNumber": 32,
    "week": "Week 2",
    "day": "Thursday",
    "date": "10/09/2026",
    "activityCount": 29,
    "pic": "IT Manager",
    "topic": "Cybersecurity at LeadGeeks\n- Current Security Practices\n- Data Protection & GDPR\n- Security Risks & Priorities\n- Security Assessment & Basic Response",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-33",
    "rowNumber": 33,
    "week": "Week 2",
    "day": "Thursday",
    "date": "10/09/2026",
    "activityCount": 30,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Review the existing security checklist and identify potential security risks.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-34",
    "rowNumber": 34,
    "week": "Week 2",
    "day": "Friday",
    "date": "11/09/2026",
    "activityCount": 31,
    "pic": "IT Manager",
    "topic": "Website Management at LeadGeeks\n- Website Ecosystem & Dependencies\n- CMS / WordPress\n- Website Structure & Content Management\n- Technical SEO & Digital Presence",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-35",
    "rowNumber": 35,
    "week": "Week 2",
    "day": "Friday",
    "date": "11/09/2026",
    "activityCount": 32,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Create a basic draft/test page containing a heading, text, image, link/button, and basic formatting.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-36",
    "rowNumber": 36,
    "week": "Week 2",
    "day": "Friday",
    "date": "11/09/2026",
    "activityCount": 33,
    "pic": "IT Manager",
    "topic": "Weekly Check-in (Reflection, Knowledge Alignment & Week 3 Preview)",
    "mainMedia": "Weekly Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-38",
    "rowNumber": 38,
    "week": "Week 3",
    "day": "Monday",
    "date": "14/09/2026",
    "activityCount": 34,
    "pic": "IT Manager",
    "topic": "Introduction to IT Department 2026 SMART Goals and Understanding How IT Support LeadGeeks Business Objectives",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-39",
    "rowNumber": 39,
    "week": "Week 3",
    "day": "Monday",
    "date": "14/09/2026",
    "activityCount": 35,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Connect IT goals with key initiatives, expected outputs, and business impact.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-40",
    "rowNumber": 40,
    "week": "Week 3",
    "day": "Tuesday",
    "date": "15/09/2026",
    "activityCount": 36,
    "pic": "Managing Director",
    "topic": "Beyond the Slides: Chat with the Managing Director",
    "mainMedia": "Online Meeting",
    "startTime": "",
    "endTime": "",
    "progress": "Reschedule",
    "notes": ""
  },
  {
    "id": "sched-row-41",
    "rowNumber": 41,
    "week": "Week 3",
    "day": "Tuesday",
    "date": "15/09/2026",
    "activityCount": 37,
    "pic": "IT Manager",
    "topic": "Infrastructure Management Goals and Initiatives\n- Google Workspace Assessment and Enhancement\n- Google Cloud Exploration\n- Email Domain Migration",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-42",
    "rowNumber": 42,
    "week": "Week 3",
    "day": "Tuesday",
    "date": "15/09/2026",
    "activityCount": 38,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Review one infrastructure initiative and identify its current condition, expected improvement, dependencies, and potential risks.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-43",
    "rowNumber": 43,
    "week": "Week 3",
    "day": "Wednesday",
    "date": "16/09/2026",
    "activityCount": 39,
    "pic": "IT Manager",
    "topic": "Technology Optimization & Innovation Goals and Initiatives\n- Existing Automation Evaluation and Optimization\n- New Automation Implementation\n- Integrated Database Implementation\n- Technology Support for Service Development and Innovation",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-44",
    "rowNumber": 44,
    "week": "Week 3",
    "day": "Wednesday",
    "date": "16/09/2026",
    "activityCount": 40,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Identify one improvement opportunity from an existing automation or repetitive workflow and propose a simple solution.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-45",
    "rowNumber": 45,
    "week": "Week 3",
    "day": "Thursday",
    "date": "17/09/2026",
    "activityCount": 41,
    "pic": "IT Manager",
    "topic": "Cybersecurity Goals and Initiatives\n- Security Assessment & Optimization\n- Company Account Implementation\n- Data Security Enhancement",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-46",
    "rowNumber": 46,
    "week": "Week 3",
    "day": "Thursday",
    "date": "17/09/2026",
    "activityCount": 42,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Review a predefined scenario and recommend appropriate preventive and corrective actions.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-47",
    "rowNumber": 47,
    "week": "Week 3",
    "day": "Friday",
    "date": "18/09/2026",
    "activityCount": 43,
    "pic": "IT Manager",
    "topic": "Website Management Goals and Initiatives\n- Website Enhancement\n- Technical SEO & Digital Presence",
    "mainMedia": "Knowledge Sharing & Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-48",
    "rowNumber": 48,
    "week": "Week 3",
    "day": "Friday",
    "date": "18/09/2026",
    "activityCount": 44,
    "pic": "IT Staff",
    "topic": "Independent Learning and Task\n- Improve the Week 2 test page using basic structure, internal linking, image alt text, and basic SEO practices.",
    "mainMedia": "Personal Learning and Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-49",
    "rowNumber": 49,
    "week": "Week 3",
    "day": "Friday",
    "date": "18/09/2026",
    "activityCount": 45,
    "pic": "IT Manager",
    "topic": "Weekly Check-in (Reflection, Knowledge Alignment & Week 4 Preview)",
    "mainMedia": "Weekly Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-51",
    "rowNumber": 51,
    "week": "Week 4",
    "day": "Monday",
    "date": "21/09/2026",
    "activityCount": 46,
    "pic": "IT Manager",
    "topic": "Task Alignment\n- Daily IT Responsibilities\n- Task Priorities\n- Work Documentation\n- Escalation & Communication Expectations",
    "mainMedia": "Discussion",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-52",
    "rowNumber": 52,
    "week": "Week 4",
    "day": "Monday",
    "date": "21/09/2026",
    "activityCount": 47,
    "pic": "IT Staff",
    "topic": "IT Infrastructure & Daily Operations Tasks",
    "mainMedia": "Personal Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-53",
    "rowNumber": 53,
    "week": "Week 4",
    "day": "Monday",
    "date": "21/09/2026",
    "activityCount": 48,
    "pic": "IT Manager",
    "topic": "Daily Check-in",
    "mainMedia": "Daily Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-54",
    "rowNumber": 54,
    "week": "Week 4",
    "day": "Tuesday",
    "date": "22/09/2026",
    "activityCount": 49,
    "pic": "IT Staff",
    "topic": "Workflow Automation & System Development Tasks",
    "mainMedia": "Personal Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-55",
    "rowNumber": 55,
    "week": "Week 4",
    "day": "Tuesday",
    "date": "22/09/2026",
    "activityCount": 50,
    "pic": "IT Manager",
    "topic": "Daily Check-in",
    "mainMedia": "Daily Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-56",
    "rowNumber": 56,
    "week": "Week 4",
    "day": "Wednesday",
    "date": "23/09/2026",
    "activityCount": 51,
    "pic": "IT Staff",
    "topic": "AI Productivity & Prompt Engineering Tasks",
    "mainMedia": "Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-57",
    "rowNumber": 57,
    "week": "Week 4",
    "day": "Wednesday",
    "date": "23/09/2026",
    "activityCount": 52,
    "pic": "IT Manager",
    "topic": "Daily Check-in",
    "mainMedia": "Daily Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-58",
    "rowNumber": 58,
    "week": "Week 4",
    "day": "Thursday",
    "date": "24/09/2026",
    "activityCount": 53,
    "pic": "IT Staff",
    "topic": "Cybersecurity & Data Protection Tasks",
    "mainMedia": "Personal Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-59",
    "rowNumber": 59,
    "week": "Week 4",
    "day": "Thursday",
    "date": "24/09/2026",
    "activityCount": 54,
    "pic": "IT Manager",
    "topic": "Daily Check-in",
    "mainMedia": "Daily Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-60",
    "rowNumber": 60,
    "week": "Week 4",
    "day": "Friday",
    "date": "25/09/2026",
    "activityCount": 55,
    "pic": "IT Staff",
    "topic": "Website & Systems Management Tasks",
    "mainMedia": "Personal Task",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-61",
    "rowNumber": 61,
    "week": "Week 4",
    "day": "Friday",
    "date": "25/09/2026",
    "activityCount": 56,
    "pic": "IT Manager",
    "topic": "Weekly Check-in (Reflection, Feedback & Week 5 Preview)",
    "mainMedia": "Weekly Check-in",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-62",
    "rowNumber": 62,
    "week": "Week 4",
    "day": "TBD",
    "date": "dd/mm/yyyy",
    "activityCount": 57,
    "pic": "IT & HRD & MD",
    "topic": "Month 1 Performance Review & Feedback and Month 2 Expectations",
    "mainMedia": "Monthly Review",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-66",
    "rowNumber": 66,
    "week": "Month 2",
    "day": "TBD",
    "date": "dd/mm/yyyy",
    "activityCount": 58,
    "pic": "IT & HRD & MD",
    "topic": "Month 2 Performance Review & Feedback and Month 3 Expectations",
    "mainMedia": "Monthly Review",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  },
  {
    "id": "sched-row-70",
    "rowNumber": 70,
    "week": "Month 3",
    "day": "TBD",
    "date": "dd/mm/yyyy",
    "activityCount": 59,
    "pic": "IT & HRD & MD",
    "topic": "Month 3 Performance Review & Feedback",
    "mainMedia": "Monthly Review",
    "startTime": "",
    "endTime": "",
    "progress": "Not Started",
    "notes": ""
  }
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
 * Returns 5-column TSV string for Columns G–K of sheet 'Schedule':
 * [Duration (minutes), Start Time, End Time, Progress, Notes]
 */
export function clipboardRowForScheduleGtoK(activity: ScheduleActivity): string {
  const duration = activity.durationMinutes !== undefined ? String(activity.durationMinutes) : "";
  const start = activity.startTime || "";
  const end = activity.endTime || "";
  const progress = activity.progress || "Not Started";
  const notes = activity.notes || "";

  return [duration, start, end, progress, notes].map(escapeTsv).join("\t");
}

/**
 * Returns 11-column TSV string for Columns A–K of sheet 'Schedule':
 * [Day, Date, Activity Count, PIC, Topic, Main Media, Duration, Start Time, End Time, Progress, Notes]
 */
export function clipboardRowForScheduleFull(activity: ScheduleActivity): string {
  const duration = activity.durationMinutes !== undefined ? String(activity.durationMinutes) : "";
  const count = String(activity.activityCount || "");
  const start = activity.startTime || "";
  const end = activity.endTime || "";
  const progress = activity.progress || "Not Started";
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
  const diff = (eh * 60 + em) - (sh * 60 + sm);
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
