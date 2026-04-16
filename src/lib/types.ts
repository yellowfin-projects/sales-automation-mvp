// Core data types matching the Supabase schema and CSV format

export interface Deal {
  id: string;
  opportunity_name: string;
  account_name: string;
  stage: string;
  detailed_stage?: string | null;
  is_key_deal?: boolean;
  amount: number;
  currency: string;
  probability: number;
  predictive_amount: number;
  close_date: string; // ISO date string
  owner: string;
  opportunity_type: string;
  region: string;
  created_at: string;
  updated_at: string;
}

export interface DealNote {
  id: string;
  deal_id: string;
  content: string;
  created_at: string;
}

export interface DealChecklistItem {
  id: string;
  deal_id: string;
  category: string;
  completed: boolean;
  source: "ai" | "user" | "none";
  ai_confidence: string; // "high" | "medium" | "low" | ""
  updated_at: string;
}

export interface Activity {
  id: string;
  deal_id: string;
  activity_date: string; // ISO date string
  subject: string;
  full_comments: string;
  activity_type: string; // "Email", "Call", or "Other"
  upload_id: string;
  created_at: string;
}

export interface Analysis {
  id: string;
  deal_id: string;
  health_assessment: string;
  risk_signals: string[];
  positive_signals: string[];
  coaching_suggestions: string[];
  ai_win_probability: number;
  ai_reasoning: string;
  input_tokens: number;
  output_tokens: number;
  analyzed_at: string;
}

export interface Upload {
  id: string;
  filename: string;
  row_count: number;
  new_activities_added: number;
  duplicate_activities_skipped: number;
  deals_created: number;
  deals_updated: number;
  skipped_records: { deal: string; subject: string; date: string }[] | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface DealHistory {
  id: string;
  deal_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  upload_id: string;
  changed_at: string;
}

// Represents a raw row from the Salesforce CSV export
export interface CsvRow {
  "Created Date": string;
  "Sales Region": string;
  "Account Name": string;
  "Opportunity Name": string;
  "Opportunity Stage": string;
  "Amount (converted) Currency": string;
  "Amount (converted)": string;
  "Probability (%)": string;
  "Predictive Amount (converted) Currency": string;
  "Predictive Amount (converted)": string;
  "Close Date": string;
  "Opportunity Owner": string;
  "Opportunity Type": string;
  "Subject": string;
  "Full Comments": string;
  "Type": string;
}

// Computed metrics for a single deal (calculated from activity data, no AI)
export interface DealMetrics {
  deal_id: string;
  total_activities: number;
  email_count: number;
  call_count: number;
  days_since_last_activity: number;
  days_to_close: number;
  is_overdue: boolean;
  activity_trend: "accelerating" | "decelerating" | "steady" | "new";
  stakeholder_count: number;
  max_activity_gap_days: number;
}

// Pipeline-level summary metrics
export interface PipelineMetrics {
  total_pipeline_value: number;
  weighted_pipeline: number;
  deal_count: number;
  deals_at_risk: number;
  deals_by_stage: { stage: string; count: number; value: number }[];
  deals_by_rep: { rep: string; count: number; value: number }[];
  average_deal_size: number;
}

// Combined deal + metrics for display
export interface DealWithMetrics extends Deal {
  metrics: DealMetrics;
  has_analysis: boolean;
  checklist: DealChecklistItem[];
}

// Upload processing result shown to the user before confirming
export interface UploadResult {
  total_rows: number;
  new_activities: number;
  duplicate_activities: number;
  deals_created: number;
  deals_updated: number;
  deal_changes: { deal_name: string; field: string; old_value: string; new_value: string }[];
  errors: string[];
}
