/**
 * First Month Review Data Model & Helpers (Sheet: First Month Review)
 * Matches the official onboarding spreadsheet structure and contents.
 */

export interface ReviewMetadata {
  employeeName: string;
  title: string;
  department: string;
  supervisorName: string;
  reviewPeriod: string;
  dateOfLastReview: string;
  dateOfThisReview: string;
}

export interface AssessmentItem {
  rowNumber: number;
  responsibility: string;
  score?: number;
  assessment?: string;
}

export interface SupervisorQuestionItem {
  rowNumber: number;
  question: string;
  answer: string;
}

export interface FeedbackRatingItem {
  rowNumber: number;
  question: string;
  score: number;
}

export interface QualitativeFeedbackItem {
  rowNumber: number;
  question: string;
  supervisorComment: string;
  employeeComment: string;
}

export interface HrdQuestionItem {
  rowNumber: number;
  question: string;
  employeeComment: string;
}

export interface FirstMonthReview {
  metadata: ReviewMetadata;
  technicalAssessment: AssessmentItem[];
  valuesAssessment: AssessmentItem[];
  additionalQuestions: SupervisorQuestionItem[];
  feedbackRatings: FeedbackRatingItem[];
  qualitativeFeedback: QualitativeFeedbackItem[];
  hrdQuestions: HrdQuestionItem[];
}

export const FIRST_MONTH_REVIEW_STORAGE_KEY = 'onboarding-first-month-review';

export const OFFICIAL_FIRST_MONTH_REVIEW: FirstMonthReview = {
  metadata: {
    employeeName: 'Mohammad Noor Wahid',
    title: 'Information Technology Staff',
    department: 'Information Technology',
    supervisorName: 'Ardhian Agung Prasetyo',
    reviewPeriod: '1 - 30 September, 2026',
    dateOfLastReview: 'N/A',
    dateOfThisReview: '1 October, 2026',
  },
  technicalAssessment: [
    {
      rowNumber: 15,
      responsibility:
        'Support the development, maintenance, and optimization of company websites and systems.',
      score: 80.0,
      assessment:
        'Actively involved in developing and maintaining internal web platforms (TETRA, NOVA, CORE, SMART) with solid modern web development standards.',
    },
    {
      rowNumber: 16,
      responsibility:
        'Manage and maintain website hosting, domains, and CMS platforms.',
      score: 70.0,
      assessment:
        'Demonstrates good understanding of hosting architecture and domain configuration with minimal supervision needed.',
    },
    {
      rowNumber: 17,
      responsibility:
        'Provide technical support and assist in resolving IT-related issues.',
      score: 80.0,
      assessment:
        'Responsive in troubleshooting and resolving day-to-day IT technical issues across team workflows.',
    },
    {
      rowNumber: 18,
      responsibility:
        'Help manage company IT systems, infrastructure, and daily IT operations.',
      score: 70.0,
      assessment:
        'Supports daily operational routines reliably and demonstrates good initiative.',
    },
    {
      rowNumber: 19,
      responsibility:
        'Responsible for maintaining IT security practices and data protection initiatives.',
      score: 80.0,
      assessment:
        'Follows security best practices, access control standards, and secret management guidelines.',
    },
    {
      rowNumber: 20,
      responsibility:
        'Lead AI tools and AI-assisted development platforms to improve productivity, troubleshooting, and operational efficiency.',
      score: 90.0,
      assessment:
        'Exceptional enthusiasm and capability with AI coding agents and modern developer acceleration tools.',
    },
    {
      rowNumber: 21,
      responsibility:
        'Create and utilize effective prompts for AI-assisted workflows, operational tasks, and technical activities.',
      score: 90.0,
      assessment:
        'Crafts detailed, context-rich prompts and structured workflows that yield reliable technical outputs.',
    },
    {
      rowNumber: 22,
      responsibility:
        'Create automation and integration tasks using available tools or technologies.',
      score: 80.0,
      assessment:
        'Built multiple tools and automation scripts that streamline manual spreadsheet workflows.',
    },
    {
      rowNumber: 23,
      responsibility:
        'Identify opportunities for process improvement, automation, and technology adoption across business operations.',
      score: 80.0,
      assessment:
        'Proactively proposes solutions where software tools can reduce operational friction.',
    },
    {
      rowNumber: 24,
      responsibility:
        'Support the IT Manager in technology initiatives, process improvements, and operational projects.',
      score: 80.0,
      assessment:
        'Collaborates smoothly with the IT Manager and executes assigned project milestones on schedule.',
    },
    {
      rowNumber: 25,
      responsibility:
        'Collaborate with other departments to support technical and operational requirements.',
      score: 70.0,
      assessment:
        'Works collaboratively across teams; continuing to develop non-technical communication for seamless alignment.',
    },
  ],
  valuesAssessment: [
    {
      rowNumber: 29,
      responsibility: 'Accountability in Action',
      score: 80.0,
      assessment:
        'Takes personal responsibility for deliverables and transparently communicates project status.',
    },
    {
      rowNumber: 30,
      responsibility: 'Collaboration and Clear Communication',
      score: 70.0,
      assessment:
        'Friendly and constructive teammate. Actively refining technical translation for business stakeholders.',
    },
    {
      rowNumber: 31,
      responsibility: 'Timeliness and Efficiency',
      score: 80.0,
      assessment:
        'Demonstrates strong work ethic and speed when executing development tasks.',
    },
    {
      rowNumber: 32,
      responsibility: 'Flexibility and Agility',
      score: 80.0,
      assessment:
        'Adapts comfortably to shifting priorities and simultaneous task assignments.',
    },
    {
      rowNumber: 33,
      responsibility: 'Improvement Through Learning',
      score: 90.0,
      assessment:
        'Outstanding appetite for continuous learning, new frameworks, and architectural best practices.',
    },
    {
      rowNumber: 34,
      responsibility: 'Respect for User Experience',
      score: 80.0,
      assessment:
        'Prioritizes intuitive UX, fast feedback loops, and thoughtful interface design.',
    },
    {
      rowNumber: 35,
      responsibility: 'Solution-Focused Mindset',
      score: 80.0,
      assessment:
        'Approaches technical obstacles constructively with practical, actionable alternatives.',
    },
    {
      rowNumber: 36,
      responsibility: 'Trust and Professionalism',
      score: 80.0,
      assessment:
        'Consistently acts with integrity, respect for colleagues, and dedication to team standards.',
    },
  ],
  additionalQuestions: [
    {
      rowNumber: 39,
      question:
        'Has the new employee demonstrated possession of the knowledge and skills necessary to perform the job?',
      answer:
        'Yes. Nowah has demonstrated the technical knowledge and skills required for his role, particularly in web application development, troubleshooting, and technical problem-solving.',
    },
    {
      rowNumber: 40,
      question:
        'Has the new employee demonstrated the application of those skills in a reasonably competent and efficient manner?',
      answer:
        'Yes. Nowah has been able to apply his technical skills in his assigned tasks and has shown good progress in completing tasks independently and finding practical solutions.',
    },
    {
      rowNumber: 41,
      question:
        'Has the new employee demonstrated an ability to develop positive, co-operative working relationships with other employees?',
      answer:
        'Yes. Nowah has demonstrated the ability to collaborate with different teams when working on technical tasks and projects.',
    },
    {
      rowNumber: 42,
      question:
        'Are you satisfied that there has been no evidence to suggest that any information given by the new employee during job application or on the interview process was false or misleading compared to the reality?',
      answer:
        'Yes, there has been no indication that the information provided during the hiring process was false or misleading.',
    },
    {
      rowNumber: 43,
      question:
        'Are you satisfied that the new employee should be able to handle untested tasks? (If, for example, there are seasonal variations in the requirements of the job, such that the new employee has not been exposed to all the job dimensions)',
      answer:
        'Yes, Nowah has demonstrated the ability to handle untested tasks, particularly in technical and development-related areas. He is able to learn as needed, and work toward practical solutions.',
    },
    {
      rowNumber: 44,
      question:
        'Do you recommend the continuation of the training period (for non-final review)?',
      answer:
        'Yes, I recommend the continuation of the training period, as there are still areas that require further improvement, particularly in communication, prioritization, and understanding business requirements.',
    },
    {
      rowNumber: 45,
      question:
        'Do you recommend confirmation of the employee’s employment (for final review)?',
      answer:
        'N/A (First Month Review is an interim training progress review; confirmation is assessed at Month 3).',
    },
  ],
  feedbackRatings: [
    {
      rowNumber: 51,
      question: 'I clearly understand the company’s values and goals.',
      score: 5.0,
    },
    {
      rowNumber: 52,
      question: 'I have a clear understanding of my department’s functions and goals.',
      score: 5.0,
    },
    {
      rowNumber: 53,
      question: 'I understand the structure and functions of other departments.',
      score: 4.0,
    },
    {
      rowNumber: 54,
      question: 'I feel welcomed and supported by my team and supervisor.',
      score: 5.0,
    },
    {
      rowNumber: 55,
      question: 'I received clear guidance, expectation and goals from my Supervisor.',
      score: 4.0,
    },
    {
      rowNumber: 56,
      question: 'I received clear and constructive feedback from my Supervisor.',
      score: 4.0,
    },
    {
      rowNumber: 57,
      question: 'It was easy to get all the resources I needed to do my job successfully.',
      score: 5.0,
    },
    {
      rowNumber: 58,
      question: 'I know where to find help if I encounter a problem or confusion.',
      score: 5.0,
    },
    {
      rowNumber: 59,
      question: 'I feel motivated to learn and grow further in this company.',
      score: 4.0,
    },
    {
      rowNumber: 60,
      question: 'I feel confident to start performing my role after onboarding.',
      score: 5.0,
    },
  ],
  qualitativeFeedback: [
    {
      rowNumber: 64,
      question:
        'What are your proudest moments of during the review period here? What did you do well?',
      supervisorComment:
        'Nowah has demonstrated strong technical capabilities, particularly in developing various web applications that aim to improve operational efficiency and reduce manual work. His ability to turn operational needs into practical web-based solutions has been valuable in supporting the company’s goal of improving operational efficiency through better use of technology. These contributions also show his ability to apply his technical skills to address actual business needs. He has also been able to apply his previous technical experience while learning to LeadGeeks’ business processes. His contributions during this period provide a good foundation for further developing technology solutions that support the company’s operational needs.',
      employeeComment:
        'One of my proudest achievements during this review period is being able to contribute to several internal web applications that aim to improve efficiency and reduce manual work.\n\nI helped develop TETRA, a Time & Task Tracking application, to reduce the amount of work that employees need to manage directly through spreadsheets. I also developed NOVA, an onboarding application to support the onboarding process, CORE, a Company Operations, Resources & Environment application for internal company operations, and SMART, a LeadGeeks Inc. SMART Goals application.\n\nI’m proud that I was able to turn several operational needs into practical web-based solutions. These projects also allowed me to apply my previous technical experience while learning more about LeadGeeks’ business processes.',
    },
    {
      rowNumber: 65,
      question:
        'What areas of your role could you improve? What could you have done better?',
      supervisorComment:
        'As Nowah continues to grow and take on more responsibilities in his role, he has a good opportunity to further develop his communication approach when sharing technical topics with non-technical stakeholders. Building on his existing technical capabilities, being able to present technical solutions, considerations, and opportunities in a way that is easy for different stakeholders to follow can further support smooth collaboration across departments. During discussions, especially when working through requirements or technical topics, taking a moment to make sure that the key points and expectations are understood in the same way by everyone involved can also help maintain alignment and create a shared understanding. His English communication skills can also continue to develop as part of his growth in the role, which is already being supported through the Business English training.',
      employeeComment:
        'One of the main areas I want to improve is my ability to communicate technical concepts in a business-oriented way. I want to become better at explaining technical solutions, limitations, and opportunities so they can be easily understood by people from different backgrounds.\n\nI also want to improve my English communication and public speaking skills so I can communicate more confidently in meetings, presentations, and cross-department discussions.\n\nIn addition, I would like to contribute more to collaboration between departments and identify more opportunities where technology can improve existing business processes.',
    },
    {
      rowNumber: 66,
      question: 'How would you see your ability to execute your main tasks?',
      supervisorComment:
        'Based on his previous experience and performance at LeadGeeks, Nowah has demonstrated good technical capabilities in executing his main tasks. He is also able to handle multiple tasks in parallel and adapt to different requirements. However, managing multiple tasks effectively requires strong prioritization and time management to ensure that one task does not negatively affect other responsibilities or reduce the quality of the final output. Continuing to improve his prioritization, time management, and task estimation skills will help him maintain productivity while ensuring consistent quality.',
      employeeComment:
        'I feel confident in executing my main tasks, especially when handling multiple tasks in parallel. I’m comfortable managing different priorities at the same time while looking for ways to save development time and maintain productivity.\n\nMy previous technical experience also helps me understand new workflows and business processes relatively quickly. I can connect technical implementation with the business flow I’m currently working with, which helps me adapt to new requirements and execute tasks more independently.\n\nAt the same time, I want to continue improving my prioritization, communication, and estimation skills so that my ability to work in parallel remains effective without sacrificing clarity or quality.',
    },
  ],
  hrdQuestions: [
    {
      rowNumber: 68,
      question:
        'What kind of support during the onboarding process helped you adapt the most to your role?',
      employeeComment:
        'The supportive and close relationship within the team helped me adapt significantly. Having a relaxed and comfortable working environment made the onboarding process more enjoyable and allowed me to learn without feeling excessive pressure.\n\nThe flexibility in managing my working time also helped me organize my activities and manage my productivity more effectively. I appreciate having the space to arrange my work while still being responsible for completing my tasks and contributing to the team.',
    },
    {
      rowNumber: 69,
      question:
        'During your onboarding, did you face any challenges in adapting to your role? Please explain your answer.\n- If Yes: Describe the challenge you encountered.\n- If No: Share what personal approach or mindset helped you adjust easily.',
      employeeComment:
        'Yes. One of the biggest challenges I experienced was adjusting my expectations to the current technology resources and infrastructure available within the company.\n\nI have a strong interest in developing and integrating newer technologies, particularly Artificial Intelligence, so sometimes I had high expectations about how quickly we could move toward more advanced technology integration. However, limitations in technology resources, infrastructure, and available human resources sometimes made the development process slower than I expected.\n\nThis was challenging for me because I wanted to move quickly and deliver more advanced solutions. I learned that I also need to better understand the current constraints, prioritize what can realistically be achieved, and focus on creating incremental improvements while the company continues developing its technology foundation.',
    },
    {
      rowNumber: 70,
      question:
        'Did you find the tasks you’re doing are different from the job descriptions informed to you on the recruitment process?',
      employeeComment:
        'There is some difference between the initial expectations and the actual situation.\n\nDuring the recruitment process, Artificial Intelligence integration was one of the areas that interested me. However, after joining, I found that some fundamental internal systems and technology infrastructure were still being developed, which made it more challenging to immediately move toward AI integration.\n\nAs a result, some of my work has focused more on building internal web applications and establishing systems that can support future digital transformation. I see this as valuable experience, although it is different from what I initially expected regarding the pace of AI-related development.',
    },
    {
      rowNumber: 71,
      question:
        'Looking ahead, what specific support or changes would help you feel even more confident and connected to your role or team?',
      employeeComment:
        'The most important support for me would be having developer devices with specifications that meet modern application development requirements. Better hardware would help reduce development and testing time and allow me to work more efficiently.\n\nAccess to appropriate development tools, including Artificial Intelligence-assisted development tools, would also be very helpful, especially for handling complex development tasks, research, testing, and problem-solving.\n\nIn addition, having stronger and more reliable technology infrastructure would help me develop applications more efficiently and create a stronger foundation for future integrations and automation.',
    },
    {
      rowNumber: 72,
      question: 'What can we do better to make LeadGeeks a great place to work?',
      employeeComment:
        'I believe LeadGeeks can continue becoming more technology-driven by responding quickly to the rapid development of technology and Artificial Intelligence.\n\nOne opportunity would be to accelerate the adoption and integration of AI into internal workflows and business processes where it can provide measurable benefits.\n\nI also think developing more internal systems could help employees work more efficiently and reduce unnecessary dependence on third-party tools. Having an integrated internal technology ecosystem could make information, workflows, and collaboration easier to manage while also giving the company greater control over its own processes and data.',
    },
    {
      rowNumber: 73,
      question:
        'What is your career goals and how would you like to see yourself develop at LeadGeeks?',
      employeeComment:
        'My long-term goal is to become a professional application developer and eventually develop strong expertise as a software architect.\n\nAt LeadGeeks, I would like to grow by working on increasingly complex applications, learning more about system architecture, improving my understanding of business processes, and contributing to technology initiatives that have a broader impact on the company.\n\nAt the same time, I want to develop my communication and public speaking skills. I want to become confident in presenting technical concepts using clear business language so that technical ideas can be understood by people across different departments.\n\nI hope LeadGeeks can support this development through appropriate technology resources, challenging projects, mentoring, and opportunities to collaborate across departments.',
    },
  ],
};

/**
 * Reads review from local storage or returns official default
 */
export function readFirstMonthReview(raw?: string | null): FirstMonthReview {
  if (!raw) return OFFICIAL_FIRST_MONTH_REVIEW;
  try {
    const parsed = JSON.parse(raw);
    return {
      metadata: { ...OFFICIAL_FIRST_MONTH_REVIEW.metadata, ...(parsed.metadata || {}) },
      technicalAssessment:
        Array.isArray(parsed.technicalAssessment) && parsed.technicalAssessment.length > 0
          ? parsed.technicalAssessment
          : OFFICIAL_FIRST_MONTH_REVIEW.technicalAssessment,
      valuesAssessment:
        Array.isArray(parsed.valuesAssessment) && parsed.valuesAssessment.length > 0
          ? parsed.valuesAssessment
          : OFFICIAL_FIRST_MONTH_REVIEW.valuesAssessment,
      additionalQuestions:
        Array.isArray(parsed.additionalQuestions) && parsed.additionalQuestions.length > 0
          ? parsed.additionalQuestions
          : OFFICIAL_FIRST_MONTH_REVIEW.additionalQuestions,
      feedbackRatings:
        Array.isArray(parsed.feedbackRatings) && parsed.feedbackRatings.length > 0
          ? parsed.feedbackRatings
          : OFFICIAL_FIRST_MONTH_REVIEW.feedbackRatings,
      qualitativeFeedback:
        Array.isArray(parsed.qualitativeFeedback) && parsed.qualitativeFeedback.length > 0
          ? parsed.qualitativeFeedback
          : OFFICIAL_FIRST_MONTH_REVIEW.qualitativeFeedback,
      hrdQuestions:
        Array.isArray(parsed.hrdQuestions) && parsed.hrdQuestions.length > 0
          ? parsed.hrdQuestions
          : OFFICIAL_FIRST_MONTH_REVIEW.hrdQuestions,
    };
  } catch {
    return OFFICIAL_FIRST_MONTH_REVIEW;
  }
}

/**
 * Serializes review for local storage
 */
export function writeFirstMonthReview(review: FirstMonthReview): string {
  return JSON.stringify(review);
}

/**
 * Calculates average score for technical assessment
 */
export function getAverageScore(items: { score?: number }[]): number {
  const scored = items.filter((i) => i.score !== undefined && !isNaN(i.score) && i.score > 0);
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, curr) => acc + (curr.score || 0), 0);
  return Math.round((sum / scored.length) * 10) / 10;
}

/**
 * Generates TSV for Section 1.1 Technical Assessment (Cols B & C, rows 15-25)
 * Suitable for pasting directly starting at cell B15.
 */
export function clipboardForTechnicalAssessment(items: AssessmentItem[]): string {
  return items
    .map((item) => `${item.score !== undefined ? item.score.toFixed(1) : ''}\t${item.assessment || ''}`)
    .join('\n');
}

/**
 * Generates TSV for Section 1.2 Values Assessment (Cols B & C, rows 29-36)
 * Suitable for pasting directly starting at cell B29.
 */
export function clipboardForValuesAssessment(items: AssessmentItem[]): string {
  return items
    .map((item) => `${item.score !== undefined ? item.score.toFixed(1) : ''}\t${item.assessment || ''}`)
    .join('\n');
}

/**
 * Generates TSV for Section 2.1 Feedback Ratings (Col B, rows 51-60)
 * Suitable for pasting directly starting at cell B51.
 */
export function clipboardForFeedbackRatings(items: FeedbackRatingItem[]): string {
  return items.map((item) => `${item.score.toFixed(1)}`).join('\n');
}

/**
 * Generates TSV for Qualitative Feedback (Cols B to D, rows 64-66)
 * Col B: Supervisor Comment, Col C: blank, Col D: Employee Comment
 * Suitable for pasting starting at cell B64.
 */
export function clipboardForQualitativeFeedback(items: QualitativeFeedbackItem[]): string {
  return items
    .map((item) => {
      const sup = (item.supervisorComment || '').replace(/\t/g, ' ');
      const emp = (item.employeeComment || '').replace(/\t/g, ' ');
      return `"${sup.replace(/"/g, '""')}"\t\t"${emp.replace(/"/g, '""')}"`;
    })
    .join('\n');
}

/**
 * Generates TSV for HRD Questions (Col B, rows 68-73)
 * Suitable for pasting starting at cell B68.
 */
export function clipboardForHrdQuestions(items: HrdQuestionItem[]): string {
  return items
    .map((item) => {
      const emp = (item.employeeComment || '').replace(/\t/g, ' ');
      return `"${emp.replace(/"/g, '""')}"`;
    })
    .join('\n');
}
