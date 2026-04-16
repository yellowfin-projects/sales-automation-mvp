// Detailed sub-stage options mapped to each Salesforce stage
export const DETAILED_STAGES: Record<string, string[]> = {
  "6-Prospect": ["Initial Outreach", "Discovery Scheduled"],
  "5-Active Evaluation": [
    "Discovery In Progress",
    "Technical Deep Dive",
    "POC/Pilot In Progress",
    "POC/Pilot Complete",
  ],
  "4-Selected": [
    "Business Case Presented",
    "Champion Confirmed",
    "Executive Sponsor Engaged",
  ],
  "3-Commit": [
    "Verbal Commit",
    "Procurement Engaged",
    "Legal Review In Progress",
  ],
  "2-Negotiate": ["Negotiating Terms", "Final Approval Pending"],
  "1-Closed Won": ["Closed Won"],
  "0-Closed Lost": ["Closed Lost"],
};

// Standard enterprise SaaS close-plan checklist — 12 categories
export const CHECKLIST_CATEGORIES = [
  "Discovery Complete",
  "Champion Identified",
  "Executive Sponsor Engaged",
  "Technical Sign-off Received",
  "POC / Pilot Complete",
  "Business Case Approved",
  "Decision Process Known",
  "Pricing Presented",
  "Pricing Approved",
  "Procurement Engaged",
  "Legal / Security Review Complete",
  "Contract Sent",
] as const;

export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number];
