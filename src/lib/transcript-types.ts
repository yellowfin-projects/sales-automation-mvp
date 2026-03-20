// Types for call transcript upload and AI coaching analysis

export interface Transcript {
  id: string;
  deal_id: string;
  filename: string;
  transcript_text: string;
  speaker_labels: string[];
  word_count: number;
  call_date: string | null;
  call_type: string;
  uploaded_at: string;
}

export interface TranscriptAnalysis {
  id: string;
  deal_id: string;
  transcript_ids: string[];
  sales_coaching: SalesCoaching;
  product_coaching: ProductCoaching;
  overall_summary: string;
  strengths: string[];
  improvements: string[];
  input_tokens: number;
  output_tokens: number;
  analyzed_at: string;
}

export interface SalesCoaching {
  technique_assessment: string;
  objection_handling: string[];
  discovery_quality: string;
  next_steps_quality: string;
  deal_progression: string;
}

export interface ProductCoaching {
  product_positioning: string;
  feature_mentions: string[];
  competitive_handling: string;
  missed_opportunities: string[];
}

export interface ProductKnowledge {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}
