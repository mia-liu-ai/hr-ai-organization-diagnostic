export type RelationType =
  | 'manager'
  | 'peer'
  | 'direct_report'
  | 'partner'
  | 'self';

export type UserRole = 'boss' | 'hr' | 'admin' | 'employee';

export type Project = {
  id: number;
  name: string;
  description: string;
  project_type: 'org_diagnosis' | 'review_360' | 'combined';
  target_scope: string;
  purpose: string;
  scope: string;
  start_date: string;
  end_date: string;
  anonymous: number | boolean;
  status: string;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id?: number;
  text: string;
  behavior_anchor: string;
  content?: string;
  question_type?: string;
  relation_scope: string;
  rating_type: string;
  open_followup?: string;
  weight?: number;
  hypothesis_id?: number | null;
  model_id?: number | null;
  sort_order: number;
};

export type Dimension = {
  id?: number;
  name: string;
  description: string;
  sort_order: number;
  questions: Question[];
};

export type Questionnaire = {
  dimensions: Dimension[];
  ai_run_id?: number;
  used_fallback?: boolean;
};

export type Employee = {
  id: number;
  project_id: number;
  name: string;
  department: string;
  role: string;
  level: string;
  manager: string;
};

export type Relationship = {
  id: number;
  project_id: number;
  subject_employee_id: number;
  evaluator_employee_id: number;
  relation_type: RelationType;
  relation_label: string;
  subject_name: string;
  evaluator_name: string;
  submitted: 0 | 1;
};

export type Analytics = {
  employee_count: number;
  relationships_count: number;
  responses_count: number;
  completion_rate: number;
  dimension_averages: Array<{
    id: number;
    name: string;
    avg_score: number | null;
    score_count: number;
  }>;
  group_differences: Array<{
    relation_type: RelationType;
    relation_label: string;
    avg_score: number | null;
    response_count: number;
    score_count: number;
  }>;
  self_other_gaps: Array<{
    employee_id: number;
    employee_name: string;
    self_avg: number | null;
    others_avg: number | null;
    gap: number | null;
  }>;
  department_heatmap: Array<{
    department: string;
    dimension_name: string;
    avg_score: number | null;
  }>;
  feedback_themes: Array<{
    theme: string;
    count: number;
  }>;
  risk_alerts: string[];
};

export type Report = {
  id: number;
  project_id: number;
  employee_id?: number;
  user_id?: number | null;
  report_type?: 'boss_report' | 'hr_report' | 'employee_report';
  title?: string;
  source?: '360_review' | 'diagnostic_os';
  employee_name?: string;
  department?: string;
  content: string;
  status: 'draft' | 'confirmed';
  ai_run_id: number | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
};

export type AISettings = {
  base_url: string;
  model: string;
  hasModelCredential?: boolean;
  [key: string]: string | boolean | undefined;
};

export type AuditEntry = {
  id: number;
  feature?: string;
  entity_type?: string;
  entity_id?: number;
  editor?: string;
  model?: string;
  used_fallback?: number;
  created_at: string;
};

export type QuestionIssue = {
  type: string;
  question: string;
  suggestion: string;
};

export type User = {
  id: number;
  username: string;
  role: UserRole;
  employee_id: number | null;
  employee_name?: string | null;
  status: 'active' | 'disabled';
  created_at?: string;
};

export type OrganizationDiagnosisQuestion = {
  key: string;
  text: string;
  score_min: number;
  score_max: number;
};

export type OrganizationDiagnosisDimension = {
  key: string;
  label: string;
  description: string;
  questions: OrganizationDiagnosisQuestion[];
};

export type OrganizationDiagnosisResponse = {
  id?: number;
  project_id: number;
  user_id?: number | null;
  dimension: string;
  question_key: string;
  score: number;
  comment: string;
  created_at?: string;
};

export type OrganizationDiagnosisResult = {
  project_id: number;
  dimension_scores_json: Record<string, number>;
  dimension_scores: Record<string, number>;
  total_score: number;
  maturity_level: string;
  summary: string;
  sample?: boolean;
};

export type TalentProfile = {
  id?: number;
  project_id: number;
  user_id: number | null;
  username?: string | null;
  talent_type: string;
  talent_type_label?: string;
  dimension_scores_json: Record<string, number>;
  dimension_scores: Record<string, number>;
  native_strength: string;
  ai_collaboration_level: string;
  best_fit_tasks: string[];
  not_recommended_tasks: string[];
  recommended_agents: string[];
  growth_suggestion: string;
  created_at?: string;
  updated_at?: string;
};

export type Survey = {
  id: number;
  project_id: number;
  survey_type:
    | 'org_diagnosis'
    | 'self_assessment'
    | 'review_360'
    | 'organization_feedback';
  title: string;
  description: string;
  status: 'draft' | 'active' | 'closed';
  created_by?: number | null;
  created_at: string;
  task_status?: 'pending' | 'submitted';
  submitted_count?: number;
  pending_count?: number;
  completion_rate?: number;
};

export type SurveyResponse = {
  id: number;
  project_id: number;
  survey_id: number;
  user_id: number | null;
  response_json: Record<string, unknown>;
  submitted_at: string;
};

export type OrganizationFeedback = {
  id: number;
  project_id: number;
  user_id: number | null;
  username?: string | null;
  feedback_type:
    | 'process'
    | 'management'
    | 'ai_tools'
    | 'collaboration'
    | 'culture'
    | 'risk'
    | 'other';
  content: string;
  is_anonymous: number | boolean;
  created_at: string;
};

export type OSReport = {
  id: number;
  project_id: number;
  report_type: 'boss_report' | 'hr_report' | 'employee_report';
  user_id: number | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type ExecutiveDashboard = {
  project_id: number;
  organization_maturity: string;
  organization_health: number;
  ai_native_readiness: number;
  dimension_scores: Record<string, number>;
  key_risks: string[];
  talent_distribution: Array<{
    talent_type: string;
    label: string;
    count: number;
  }>;
  review360_summary: {
    completion_rate: number;
    dimension_averages: Analytics['dimension_averages'];
  };
  organization_feedback: {
    theme_distribution: Array<{ feedback_type: string; count: number }>;
    risk_count: number;
    summary: string;
    recent_feedback: Array<Record<string, unknown>>;
  };
  action_plan: Array<{ period: string; action: string }>;
  sample?: boolean;
};

export type Review360 = {
  project_id: number;
  reviewee_id: number;
  reviewer_id: number;
  reviewer_type: RelationType | 'subordinate' | 'hr';
  dimension_scores_json: Record<string, number>;
  strengths: string;
  risks: string;
  suggestions: string;
  comment: string;
  is_anonymous: boolean;
  created_at?: string;
};

export type ReviewTask = {
  id: number;
  project_id: number;
  project_name: string;
  reviewee_id: number;
  reviewer_id: number;
  reviewee_name: string;
  reviewer_name: string;
  relation_type: RelationType;
  relation_label: string;
  status: 'pending' | 'submitted';
  end_date: string;
  created_at: string;
  submitted_at: string | null;
};

export type FeedbackItem = {
  id: number;
  user_id: number | null;
  employee_id: number | null;
  username?: string | null;
  employee_name?: string | null;
  category: string;
  title: string;
  content: string;
  anonymous: number;
  status: 'new' | 'reviewing' | 'resolved' | 'archived';
  priority: 'low' | 'normal' | 'high';
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackCluster = {
  id: number;
  project_id: number | null;
  theme: string;
  summary: string;
  evidence_count: number;
  related_departments: string[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_action: string;
  created_by?: number | null;
  created_at: string;
};

export type AdminDashboard = {
  project_count: number;
  employee_count: number;
  pending_tasks: number;
  submitted_tasks: number;
  completion_rate: number;
  latest_feedback: FeedbackItem[];
  latest_reports: Report[];
};

export type ProjectProgress = {
  project_id: number;
  total: number;
  submitted: number;
  pending: number;
  completion_rate: number;
  by_department: Array<{
    department: string;
    total: number;
    submitted: number;
    pending: number;
    completion_rate: number;
  }>;
  by_employee: Array<{
    employee_id: number;
    name: string;
    department: string;
    total: number;
    submitted: number;
    pending: number;
    completion_rate: number;
  }>;
};

export type ExtractedHypothesis = {
  hypothesis_title: string;
  hypothesis_detail: string;
  problem_type:
    | 'individual'
    | 'manager'
    | 'organization'
    | 'ai_transformation'
    | 'governance';
  suggested_validation_method: string;
  suggested_data_sources: string[];
  related_talent_dimensions: string[];
};

export type DiagnosisHypothesis = {
  id?: number;
  project_id: number | null;
  created_by?: number | null;
  target_scope: string;
  diagnosis_purpose: string[];
  company_stage: string;
  hr_core_judgment: string;
  target_talent: string;
  focus_issues: string[];
  constraints: string;
  expected_outputs: string[];
  ai_extracted_hypotheses: ExtractedHypothesis[];
  status: 'draft' | 'generated' | 'confirmed';
  created_at?: string;
  updated_at?: string;
  ai_run_id?: number;
  used_fallback?: boolean;
};

export type TalentDimension = {
  id?: number;
  name: string;
  description: string;
  low_behavior: string;
  medium_behavior: string;
  high_behavior: string;
  applicable_roles: string;
  weight: number;
  sample_rating_questions: string[];
  sample_open_questions: string[];
};

export type TalentModel = {
  id?: number;
  project_id: number | null;
  hypothesis_id: number | null;
  template?: string;
  name: string;
  description: string;
  source_type: string;
  status: 'draft' | 'confirmed';
  dimensions: TalentDimension[];
  dimension_count?: number;
  ai_run_id?: number;
  used_fallback?: boolean;
};

export type ModelGeneratedQuestion = {
  id?: number;
  project_id?: number;
  hypothesis_id?: number | null;
  model_id?: number | null;
  dimension_id?: number;
  dimension_name: string;
  content: string;
  question_type: string;
  relation_scope: string;
  rating_type: string;
  open_followup: string;
  weight: number;
};

export type DiagnosisRule = {
  id?: number;
  project_id: number | null;
  hypothesis_id: number | null;
  model_id: number | null;
  rule_name: string;
  condition_type: string;
  condition_json: Record<string, unknown>;
  diagnosis_text: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_action: string;
  evidence_sources: string[];
  created_at?: string;
  updated_at?: string;
};

export type OrganizationRisk = {
  id: number;
  project_id: number | null;
  risk_type: string;
  title: string;
  description: string;
  evidence_json: Record<string, unknown>;
  affected_scope: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  suggested_action: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type OrganizationDashboard = {
  project_id: number;
  completion: {
    total: number;
    submitted: number;
    pending: number;
    completion_rate: number;
  };
  talent_model_performance: {
    dimension_averages: Analytics['dimension_averages'];
    high_dimensions: Analytics['dimension_averages'];
    low_dimensions: Analytics['dimension_averages'];
    department_differences: Analytics['department_heatmap'];
    level_differences: Array<{
      level: string;
      dimension_name: string;
      avg_score: number | null;
    }>;
  };
  score_differences: {
    self_other_gaps: Analytics['self_other_gaps'];
    group_differences: Analytics['group_differences'];
    risk_alerts: string[];
    explanation: string;
  };
  employee_voice: FeedbackCluster[];
  organization_risks: OrganizationRisk[];
  diagnosis_rules: DiagnosisRule[];
  high_potential_signals: {
    count: number;
    employees: Array<{
      id: number;
      name: string;
      department: string;
      avg_score: number | null;
      dimension_summary: string;
    }>;
    notice: string;
  };
  ai_transformation_bottlenecks: Array<{
    title: string;
    risk_level: string;
    suggested_action: string;
  }>;
  empty_state: string;
};

export type DiagnosisReport = {
  id: number;
  project_id: number;
  hypothesis_id: number | null;
  model_id: number | null;
  report_type: string;
  title: string;
  content: string;
  status: 'draft' | 'confirmed';
  created_by?: number | null;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
  used_fallback?: boolean;
};

export type ActionPlan = {
  id: number;
  project_id: number | null;
  report_id: number | null;
  owner_id: number | null;
  target_type: string;
  target_id: number | null;
  title: string;
  description: string;
  timeline: string;
  status: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
};
