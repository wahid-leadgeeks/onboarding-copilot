# Product Requirements Document

**Product:** NOVA (Newcomer Onboarding & Virtual Assistant)
**Status:** Active — MVP
**Last updated:** 2026-09-02

---

## 1. Problem

The current onboarding process relies heavily on a Google Sheets workbook containing schedules, timelines, learning records, feedback forms, and onboarding documentation.

Although the spreadsheet contains all required information, employees must manually:

- Find today's activities
- Read and interpret the schedule
- Record start and end times
- Calculate durations
- Mark activities as completed
- Write learning notes
- Complete feedback forms
- Maintain the onboarding diary

This creates unnecessary cognitive load and makes the onboarding process feel like administrative work rather than learning.

---

## 2. Why

The system should make onboarding execution almost effortless.

The employee should primarily:

1. See what they need to do now.
2. Start the activity.
3. Complete the activity.
4. Capture what they learned.
5. Confirm the record.

The system handles the administrative work.

---

## 3. Product Goal

**Reduce the amount of manual onboarding administration while preserving Google Sheets as the existing organizational record.**

### Success Criteria

| Criterion | Target |
|---|---|
| Understand today's workload | Within 10 seconds of opening the app |
| Start a session | One action |
| Complete a session | One action |
| Time recording | Automatic |
| Learning capture | Text or voice |
| AI note structuring | Available, user-confirmed |
| Google Sheets sync | Automatic after confirmation |
| Spreadsheet navigation required | None |

---

## 4. Target Users

**Primary:**
- New IT Staff during their onboarding period

**Secondary:**
- IT Manager
- HR / Experience Department

---

## 5. Core User Journey

### Morning

```
Open app
  → See today's activities
  → See current / next activity
```

### During a Session

```
Start
  → Attend / work
  → Finish
```

### After a Session

```
Capture learning (voice or text)
  → AI structures notes
  → User reviews and confirms
  → Sync to Google Sheets
```

### End of Day

```
View daily progress
  → Review any missing records
  → Finish
```

---

## 6. MVP Scope

### Must Have

- Google Sheets integration (read + write)
- Today's schedule view
- Current activity display
- Next activity display
- Start session action
- Finish session action
- Actual duration calculation
- Activity status tracking
- Learning capture (text)
- Google Sheets synchronization

### Should Have

- AI learning summarization
- Voice input for learning capture
- Daily summary view
- Missing-record detection

### Later (Post-MVP)

- Google Calendar integration
- Notifications / reminders
- Passive activity detection
- Manager dashboard
- Weekly onboarding reports

---

## 7. Non-Goals

The MVP will **not**:

- Replace Google Sheets completely
- Become a general-purpose employee time-tracking system
- Monitor employees secretly or passively
- Automatically judge or score employee performance
- Automatically submit subjective feedback without user confirmation

> **The non-goals section is a guardrail.** It prevents this project from gradually becoming employee surveillance software wearing an onboarding hat.

---

## 8. Open Questions

| Question | Owner | Status |
|---|---|---|
| Which Google Sheets tabs are in scope for MVP? | PM / HR | Open |
| What is the target onboarding duration (days)? | HR | Open |
| Is voice input required at launch or post-MVP? | PM | Open |
| Who manages the n8n instance? | Engineering | Open |
