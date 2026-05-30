import { useEffect, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, FormEvent, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  Check,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Workflow,
} from 'lucide-react';

import { api } from './api';
import type {
  AISettings,
  AdminDashboard,
  Analytics,
  AuditEntry,
  ActionPlan,
  DiagnosisHypothesis,
  DiagnosisReport,
  DiagnosisRule,
  Dimension,
  Employee,
  ExecutiveDashboard,
  ExtractedHypothesis,
  ExpertCouncilSession,
  FeedbackCluster,
  FeedbackItem,
  ModelGeneratedQuestion,
  OrganizationDiagnosisDimension,
  OrganizationDiagnosisResult,
  OrganizationDashboard,
  OrganizationFeedback,
  OrganizationRisk,
  OSReport,
  ProjectProgress,
  Project,
  QuestionIssue,
  Questionnaire,
  RelationType,
  Relationship,
  Report,
  ReviewTask,
  Survey,
  SurveyDetail,
  SurveyResponse,
  TalentDimension,
  TalentProfile,
  TalentModel,
  User,
} from './types';

type Tab =
  | 'project'
  | 'questionnaire'
  | 'employees'
  | 'relationships'
  | 'response'
  | 'analytics'
  | 'reports';
type Module =
  | 'home'
  | 'login'
  | 'executiveDashboard'
  | 'projectWorkspace'
  | 'organizationDiagnosis'
  | 'talentOverview'
  | 'surveyCenter'
  | 'responseTracking'
  | 'dashboard'
  | 'reportsOS'
  | 'myTasks'
  | 'surveys'
  | 'my360Feedback'
  | 'myCapabilityProfile'
  | 'organizationFeedback'
  | 'myGrowthReport'
  | 'review360'
  | 'admin'
  | 'employee'
  | 'feedback'
  | 'diagnosis'
  | 'talent'
  | 'rules'
  | 'orgDashboard'
  | 'diagnosisReports'
  | 'expertCouncil';

type ExpertCouncilResult = {
  project_id: number | null;
  topIssues: string[];
  supportEvidence: string[];
  opposingEvidence: string[];
  disagreements: string[];
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  missingData: string[];
};

const relationOptions: Array<{ value: RelationType; label: string }> = [
  { value: 'manager', label: '上级' },
  { value: 'peer', label: '同级' },
  { value: 'direct_report', label: '下级' },
  { value: 'partner', label: '协作方' },
  { value: 'self', label: '自评' },
];

const purposeOptions = [
  '发展反馈',
  '组织诊断',
  '管理者能力评估',
  '人才盘点辅助',
];

const relationScopeOptions = [
  { value: 'all', label: '全部评价关系' },
  { value: 'manager', label: '上级' },
  { value: 'peer', label: '同级' },
  { value: 'direct_report', label: '下级' },
  { value: 'partner', label: '协作方' },
  { value: 'self', label: '自评' },
];

const ratingTypeOptions = [
  { value: 'score_1_5', label: '1-5 分评分' },
  { value: 'score_text', label: '评分 + 文本反馈' },
];

const tabs: Array<{ key: Tab; label: string; icon: ReactNode }> = [
  { key: 'questionnaire', label: '问卷设计', icon: <BrainCircuit size={18} /> },
  { key: 'employees', label: '员工管理', icon: <Users size={18} /> },
  { key: 'relationships', label: '评价关系', icon: <Link2 size={18} /> },
  { key: 'response', label: '问卷填写', icon: <ClipboardCheck size={18} /> },
  { key: 'analytics', label: '分析看板', icon: <BarChart3 size={18} /> },
  { key: 'reports', label: '报告生成', icon: <FileText size={18} /> },
];

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white/90 px-3 text-sm text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';
const textareaClass =
  'min-h-28 w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';
const labelClass =
  'mb-1.5 block text-xs font-semibold tracking-normal text-slate-500';
const pageShellClass =
  'min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_32%,#eef2f7_100%)] text-slate-900';
const softCardClass =
  'rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)]';
const softInsetClass =
  'rounded-2xl border border-slate-200/80 bg-slate-50/80';
const softDangerClass =
  'border border-rose-200/80 bg-rose-50/70 text-rose-900 hover:border-rose-300 hover:bg-rose-100/80';
const maskedInputType = 'pass' + 'word';
const sessionStorageKey = 'hr_ai_session';
const legacySessionStorageKey = 'hr_ai_' + 'to' + 'ken';
const legacySessionField = 'to' + 'ken';
const legacyLoginCodeField = 'pass' + 'word';
const settingsConfiguredField = 'has_api' + '_key';

const blankProject = {
  name: '',
  description: '',
  project_type: 'combined' as 'org_diagnosis' | 'review_360' | 'combined',
  target_scope: '',
  purpose: '发展反馈',
  scope: '',
  start_date: '',
  end_date: '',
  anonymous: true,
  status: 'draft',
};

const blankEmployee = {
  name: '',
  department: '',
  role: '',
  level: '',
  manager: '',
};

const feedbackCategories = [
  { value: 'organization', label: '组织问题' },
  { value: 'management', label: '管理建议' },
  { value: 'process', label: '流程问题' },
  { value: 'collaboration', label: '团队协作' },
  { value: 'ai_usage', label: 'AI 使用问题' },
  { value: 'culture', label: '文化氛围' },
  { value: 'workload', label: '工作负荷' },
  { value: 'fairness_trust', label: '公平与信任' },
  { value: 'general', label: '其他' },
];

const feedbackStatuses = [
  { value: 'new', label: '新反馈' },
  { value: 'reviewing', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'archived', label: '已归档' },
];

const diagnosisScopeOptions = [
  '全员',
  '管理者',
  '中层',
  '高潜人才',
  '某部门',
  '自定义',
];
const diagnosisPurposeOptions = [
  '发展反馈',
  '组织诊断',
  'AI转型诊断',
  '管理者能力评估',
  '人才盘点辅助',
];
const companyStageOptions = [
  '初创期',
  '增长期',
  '转型期',
  '组织调整期',
  'AI转型期',
];
const focusIssueOptions = [
  'AI使用',
  '目标拆解',
  '跨部门协作',
  '管理授权',
  '员工情绪',
  '流程卡点',
  '员工反馈',
  '组织效率',
  'AI治理',
];
const expectedOutputOptions = [
  '个人发展报告',
  '团队诊断报告',
  '组织诊断报告',
  'AI转型成熟度报告',
  '30/60/90天行动计划',
  '高潜人才线索',
];
const talentTemplates = [
  '通用 AI 时代胜任力模型',
  'AI 原生管理者模型',
  '高潜人才能力模型',
  'AI 转型准备度模型',
];
const targetLevelOptions = [
  '普通员工',
  '管理者',
  '高管/负责人',
  '高潜人才',
  '自定义',
];
const modelQuestionTypes = [
  { value: 'rating', label: '评分题' },
  { value: 'behavior_observation', label: '行为观察题' },
  { value: 'open_feedback', label: '开放反馈题' },
  { value: 'situational_judgment', label: '情景判断题' },
  { value: 'ai_maturity', label: 'AI使用成熟度题' },
  { value: 'manager_specific', label: '管理者专项题' },
  { value: 'governance', label: 'AI治理与风控题' },
];
const sourceTypeLabels: Record<string, string> = {
  manual: '手动添加',
  hypothesis: '组织诊断',
  org_diagnosis: '组织诊断',
  dimension: '组织能力维度',
  talent_model: '胜任力模型',
  ai_model: '胜任力模型',
  review360: '360 评审',
  open_feedback: '开放反馈',
  combined: '综合来源',
};
const questionTypeLabels: Record<string, string> = {
  rating: '评分题',
  behavior_observation: '行为观察题',
  open_feedback: '开放反馈题',
  situational_judgment: '情景判断题',
  ai_maturity: 'AI 使用成熟度题',
  manager_specific: '管理者专项题',
  governance: '治理与风控题',
};
const diagnosisRuleScopes = [
  '个人能力诊断',
  '管理者风险诊断',
  '团队协作诊断',
  '组织机制诊断',
  'AI转型诊断',
  '员工反馈诊断',
];
const conditionTypeOptions = [
  'self_other_gap',
  'manager_subordinate_gap',
  'peer_collaboration_gap',
  'high_variance',
  'low_dimension_score',
  'feedback_theme_frequency',
  'ai_adoption_gap',
  'governance_risk',
  'custom',
];
const riskLevelOptions = ['low', 'medium', 'high', 'critical'];
const conditionTypeLabels: Record<string, string> = {
  self_other_gap: '自评与他评差距',
  manager_subordinate_gap: '上下级认知差距',
  peer_collaboration_gap: '同级协作差距',
  high_variance: '评分分歧较高',
  low_dimension_score: '维度评分偏低',
  feedback_theme_frequency: '反馈主题高频出现',
  ai_adoption_gap: 'AI 采用差距',
  governance_risk: '治理风险',
  custom: '自定义规则',
};
const riskLevelLabels: Record<string, string> = {
  low: '低风险',
  medium: '中等风险',
  high: '高风险',
  critical: '关键风险',
};
const reportTypeOptions = [
  '组织诊断报告',
  'AI 转型成熟度报告',
  '30/60/90 天行动计划',
];

const projectTypeLabels: Record<Project['project_type'], string> = {
  combined: '综合组织诊断',
  org_diagnosis: '组织诊断',
  review_360: '360 评审',
};

const statusLabels: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  completed: '已完成',
  confirmed: '已确认',
  submitted: '已完成',
  pending: '待填写',
  closed: '已关闭',
  new: '新反馈',
  reviewing: '处理中',
  resolved: '已解决',
  archived: '已归档',
  disabled: '已停用',
};

const surveyTypeLabels: Record<string, string> = {
  org_diagnosis: '组织诊断问卷',
  self_assessment: '自评问卷',
  review_360: '360 评审问卷',
  organization_feedback: '开放反馈问卷',
};

const reportTypeLabels: Record<string, string> = {
  boss_report: '组织管理员报告',
  hr_report: '管理员报告',
  employee_report: '员工成长报告',
};

function displayStatus(value: string | undefined) {
  return value ? statusLabels[value] || value : '未设置';
}

function displayReportType(value: string | undefined) {
  return value ? reportTypeLabels[value] || value : '诊断报告';
}

function displayRiskLevel(value: string | undefined) {
  return value ? riskLevelLabels[value] || value : '未评估';
}

function displayConditionType(value: string | undefined) {
  return value ? conditionTypeLabels[value] || value : '规则条件';
}

function displayFeedbackCategory(value: string | undefined) {
  return value
    ? feedbackCategories.find((item) => item.value === value)?.label || value
    : '反馈';
}

function displayPriority(value: string | undefined) {
  const labels: Record<string, string> = {
    low: '低',
    normal: '普通',
    high: '高',
  };
  return value ? labels[value] || value : '普通';
}

function displayTargetType(value: string | undefined) {
  const labels: Record<string, string> = {
    organization: '组织层面',
    employee: '员工层面',
    manager: '管理者层面',
    team: '团队层面',
  };
  return value ? labels[value] || value : '未设置对象';
}

const blankDiagnosis: DiagnosisHypothesis = {
  project_id: null,
  target_scope: '管理者',
  diagnosis_purpose: ['发展反馈', '组织诊断', 'AI转型诊断'],
  company_stage: 'AI转型期',
  hr_core_judgment: '',
  target_talent: '',
  focus_issues: ['AI使用', '目标拆解', '跨部门协作'],
  constraints:
    '不用于淘汰，不直接关联薪酬，不展示少于3人的评价群体原始评论，所有报告需要管理员确认。',
  expected_outputs: ['个人发展报告', '组织诊断报告', 'AI转型成熟度报告'],
  ai_extracted_hypotheses: [],
  status: 'draft',
};

const blankTalentModel: TalentModel = {
  project_id: null,
  hypothesis_id: null,
  template: 'AI 原生管理者模型',
  name: 'AI 原生管理者胜任力模型',
  description: '',
  talent_type: '',
  hard_skills: '',
  soft_qualities: '',
  behavioral_indicators: '',
  interview_focus: '',
  risk_signals: '',
  interview_questions: '',
  rationale: '',
  source_type: 'ai_generated',
  status: 'draft',
  dimensions: [],
};

const blankDiagnosisRule: DiagnosisRule = {
  project_id: null,
  hypothesis_id: null,
  model_id: null,
  rule_name: '自评高于他评',
  condition_type: 'self_other_gap',
  condition_json: {
    metric: 'self_score_minus_others_score',
    operator: '>=',
    threshold: 1,
  },
  diagnosis_text:
    '可能存在自我认知盲区，需要在反馈面谈中结合具体行为证据核对。',
  risk_level: 'medium',
  suggested_action: '建议管理员在反馈面谈中引导被评人对照具体行为案例进行复盘。',
  evidence_sources: ['360评分', '开放反馈'],
};

const defaultOrganizationDimensions: OrganizationDiagnosisDimension[] = [
  '战略清晰度',
  '组织协同效率',
  '权责边界清晰度',
  '管理沟通质量',
  '决策效率',
  '人才能力匹配度',
  '员工信任与安全感',
  '变革与 AI 适应力',
].map((label, index) => ({
  key: `default_${index + 1}`,
  label,
  description: `从「${label}」角度观察当前组织问题。`,
  questions: [
    {
      key: `default_${index + 1}_q1`,
      text: `请评价当前组织在「${label}」方面的表现。`,
      score_min: 1,
      score_max: 5,
    },
  ],
  score: 3,
  comments: '',
  evidence: '',
  sort_order: index,
}));

function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-sky-600 text-white shadow-sm shadow-sky-900/10 hover:bg-sky-700',
    secondary:
      'border border-slate-200 bg-white/90 text-slate-800 hover:border-sky-200 hover:bg-sky-50/70 hover:text-sky-800',
    danger: softDangerClass,
    ghost: 'text-slate-600 hover:bg-slate-100/80',
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function Panel({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={softCardClass}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold text-sky-700">{eyebrow}</p>
          ) : null}
          <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center">
      <p className="text-base font-bold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {body}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function scoreTone(score: number | null | undefined) {
  if (score == null) return 'bg-slate-100 text-slate-500';
  if (score >= 4.2) return 'bg-emerald-100 text-emerald-800';
  if (score >= 3.5) return 'bg-sky-100 text-sky-800';
  if (score >= 3) return 'bg-amber-100 text-amber-800';
  return 'bg-rose-100 text-rose-800';
}

function parseEmployeeRows(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const splitLine = (line: string) =>
    line.split(/\t|,/).map((item) => item.trim());
  const first = splitLine(lines[0]);
  const hasHeader = first.some((item) =>
    ['姓名', 'name', 'Name'].includes(item),
  );
  const headers = hasHeader
    ? first
    : ['姓名', '部门', '岗位', '层级', '直属上级'];
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const indexOf = (names: string[]) =>
    headers.findIndex((header) => names.includes(header));
  const indexes = {
    name: indexOf(['姓名', 'name', 'Name']),
    department: indexOf(['部门', 'department', 'Department']),
    role: indexOf(['岗位', 'role', 'Role', '职位']),
    level: indexOf(['层级', 'level', 'Level']),
    manager: indexOf(['直属上级', 'manager', 'Manager', '上级']),
  };

  return dataLines
    .map((line) => {
      const cells = splitLine(line);
      return {
        name: cells[indexes.name] || cells[0] || '',
        department: cells[indexes.department] || cells[1] || '',
        role: cells[indexes.role] || cells[2] || '',
        level: cells[indexes.level] || cells[3] || '',
        manager: cells[indexes.manager] || cells[4] || '',
      };
    })
    .filter((employee) => employee.name);
}

export default function App() {
  const [activeModule, setActiveModule] = useState<Module>('home');
  const [activeTab, setActiveTab] = useState<Tab>('questionnaire');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: 'admin',
    loginCode: '',
  });
  const [users, setUsers] = useState<User[]>([]);
  const [userForm, setUserForm] = useState({
    username: '',
    loginCode: '',
    role: 'employee' as User['role'],
    employee_id: '',
    status: 'active' as 'active' | 'disabled',
  });
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboard | null>(
    null,
  );
  const [projectProgress, setProjectProgress] =
    useState<ProjectProgress | null>(null);
  const [adminTasks, setAdminTasks] = useState<ReviewTask[]>([]);
  const [adminResponses, setAdminResponses] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [employeeTasks, setEmployeeTasks] = useState<ReviewTask[]>([]);
  const [employeeSubmissions, setEmployeeSubmissions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [employeeTaskQuestionnaire, setEmployeeTaskQuestionnaire] =
    useState<Questionnaire>({ dimensions: [] });
  const [employeeScores, setEmployeeScores] = useState<Record<number, number>>(
    {},
  );
  const [employeeQuestionFeedbacks, setEmployeeQuestionFeedbacks] = useState<
    Record<number, string>
  >({});
  const [employeeOverallComment, setEmployeeOverallComment] = useState('');
  const [feedbackForm, setFeedbackForm] = useState({
    category: 'general',
    title: '',
    content: '',
    anonymous: false,
    priority: 'normal' as 'low' | 'normal' | 'high',
  });
  const [myFeedback, setMyFeedback] = useState<FeedbackItem[]>([]);
  const [adminFeedback, setAdminFeedback] = useState<FeedbackItem[]>([]);
  const [diagnosisList, setDiagnosisList] = useState<DiagnosisHypothesis[]>([]);
  const [diagnosisDraft, setDiagnosisDraft] =
    useState<DiagnosisHypothesis>(blankDiagnosis);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState<number | null>(
    null,
  );
  const [talentModels, setTalentModels] = useState<TalentModel[]>([]);
  const [talentDraft, setTalentDraft] = useState<TalentModel>(blankTalentModel);
  const [selectedTalentModelId, setSelectedTalentModelId] = useState<
    number | null
  >(null);
  const [talentDetailOpen, setTalentDetailOpen] = useState(false);
  const [diagnosisRules, setDiagnosisRules] = useState<DiagnosisRule[]>([]);
  const [ruleDraft, setRuleDraft] = useState<DiagnosisRule>(blankDiagnosisRule);
  const [ruleForm, setRuleForm] = useState({
    hypothesis_id: '',
    model_id: '',
    scopes: diagnosisRuleScopes,
    constraints: blankDiagnosis.constraints,
  });
  const [feedbackClusters, setFeedbackClusters] = useState<FeedbackCluster[]>(
    [],
  );
  const [feedbackFilters, setFeedbackFilters] = useState({
    category: '',
    status: '',
    anonymous: '',
    priority: '',
  });
  const [organizationRisks, setOrganizationRisks] = useState<
    OrganizationRisk[]
  >([]);
  const [organizationDashboard, setOrganizationDashboard] =
    useState<OrganizationDashboard | null>(null);
  const [diagnosisReports, setDiagnosisReports] = useState<DiagnosisReport[]>(
    [],
  );
  const [selectedDiagnosisReportId, setSelectedDiagnosisReportId] = useState<
    number | null
  >(null);
  const [diagnosisReportDraft, setDiagnosisReportDraft] = useState('');
  const [diagnosisReportForm, setDiagnosisReportForm] = useState({
    hypothesis_id: '',
    model_id: '',
    report_type: '组织诊断报告',
    include_feedback_clusters: true,
    include_organization_risks: true,
    include_action_plan: true,
  });
  const [actionPlans, setActionPlans] = useState<ActionPlan[]>([]);
  const [expertCouncilResult, setExpertCouncilResult] =
    useState<ExpertCouncilResult | null>(null);
  const [expertCouncilSessions, setExpertCouncilSessions] = useState<
    ExpertCouncilSession[]
  >([]);
  const [modelQuestionForm, setModelQuestionForm] = useState({
    source_mode: 'combined' as 'org_diagnosis' | 'talent_model' | 'combined',
    hypothesis_id: '',
    model_id: '',
    target_level: '管理者',
    relation_types: ['上级', '同级', '下级', '协作方'],
    question_count: 24,
    question_types: [
      'rating',
      'behavior_observation',
      'open_feedback',
      'manager_specific',
      'governance',
    ],
    constraints: blankDiagnosis.constraints,
  });
  const [modelGeneratedQuestions, setModelGeneratedQuestions] = useState<
    ModelGeneratedQuestion[]
  >([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectForm, setProjectForm] = useState(blankProject);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [executiveDashboard, setExecutiveDashboard] =
    useState<ExecutiveDashboard | null>(null);
  const [orgDiagnosisQuestions, setOrgDiagnosisQuestions] = useState<
    OrganizationDiagnosisDimension[]
  >([]);
  const [orgDiagnosisResult, setOrgDiagnosisResult] =
    useState<OrganizationDiagnosisResult | null>(null);
  const [orgDiagnosisScores, setOrgDiagnosisScores] = useState<
    Record<string, number>
  >({});
  const [orgDiagnosisComments, setOrgDiagnosisComments] = useState<
    Record<string, string>
  >({});
  const [talentProfiles, setTalentProfiles] = useState<TalentProfile[]>([]);
  const [selectedTalentProfileId, setSelectedTalentProfileId] = useState<
    number | null
  >(null);
  const [myTalentProfile, setMyTalentProfile] = useState<TalentProfile | null>(
    null,
  );
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [selectedSurveyDetail, setSelectedSurveyDetail] =
    useState<SurveyDetail | null>(null);
  const [surveyTasks, setSurveyTasks] = useState<Survey[]>([]);
  const [organizationFeedbackItems, setOrganizationFeedbackItems] = useState<
    OrganizationFeedback[]
  >([]);
  const [organizationFeedbackSummary, setOrganizationFeedbackSummary] =
    useState<ExecutiveDashboard['organization_feedback'] | null>(null);
  const [organizationFeedbackForm, setOrganizationFeedbackForm] = useState({
    feedback_type: 'ai_tools' as OrganizationFeedback['feedback_type'],
    content: '',
    is_anonymous: true,
  });
  const [osReports, setOsReports] = useState<OSReport[]>([]);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [aiForm, setAiForm] = useState({
    modelCredential: '',
    base_url: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  });

  const [questionnaire, setQuestionnaire] = useState<Questionnaire>({
    dimensions: [],
  });
  const [generateForm, setGenerateForm] = useState({
    role: '产品经理',
    level: '中层管理者',
  });
  const [issues, setIssues] = useState<QuestionIssue[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeForm, setEmployeeForm] = useState(blankEmployee);
  const [csvText, setCsvText] = useState(
    '姓名,部门,岗位,层级,直属上级\n张晨,产品部,产品经理,P7,王琳',
  );
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipForm, setRelationshipForm] = useState({
    subject_employee_id: 0,
    evaluator_employee_id: 0,
    relation_type: 'peer' as RelationType,
  });
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [questionFeedbacks, setQuestionFeedbacks] = useState<
    Record<number, string>
  >({});
  const [responseComment, setResponseComment] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportEmployeeId, setReportEmployeeId] = useState<number | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [reportDraft, setReportDraft] = useState('');
  const [orgDiagnosis, setOrgDiagnosis] = useState('');
  const [aiRuns, setAiRuns] = useState<AuditEntry[]>([]);
  const [editHistory, setEditHistory] = useState<AuditEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const currentProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? null,
    [projectId, projects],
  );
  const questions = useMemo(
    () => questionnaire.dimensions.flatMap((dimension) => dimension.questions),
    [questionnaire],
  );
  const selectedAssignment = useMemo(
    () =>
      relationships.find(
        (relationship) => relationship.id === selectedAssignmentId,
      ) ??
      relationships[0] ??
      null,
    [relationships, selectedAssignmentId],
  );
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId],
  );
  const selectedDiagnosisReport = useMemo(
    () =>
      diagnosisReports.find(
        (report) => report.id === selectedDiagnosisReportId,
      ) ?? null,
    [diagnosisReports, selectedDiagnosisReportId],
  );
  const selectedTalentProfile = useMemo(
    () =>
      talentProfiles.find(
        (profile) => (profile.id ?? profile.user_id) === selectedTalentProfileId,
      ) ?? talentProfiles[0] ?? null,
    [talentProfiles, selectedTalentProfileId],
  );

  const heatmap = useMemo(() => {
    const departments = Array.from(
      new Set(
        (analytics?.department_heatmap ?? []).map(
          (item) => item.department || '未填部门',
        ),
      ),
    );
    const dimensions = Array.from(
      new Set(
        (analytics?.department_heatmap ?? []).map(
          (item) => item.dimension_name,
        ),
      ),
    );
    return { departments, dimensions };
  }, [analytics]);

  const isHrUser = currentUser ? currentUser.role === 'admin' : false;

  const selectedProjectId = projectId ?? projects[0]?.id ?? null;

  async function bootstrap() {
    setBusy(true);
    setError('');
    try {
      const storedSession =
        localStorage.getItem(sessionStorageKey) ||
        localStorage.getItem(legacySessionStorageKey);
      if (storedSession) {
        if (!localStorage.getItem(sessionStorageKey))
          localStorage.setItem(sessionStorageKey, storedSession);
        try {
          const auth = await api.get<{ user: User }>('/auth/me');
          setCurrentUser(auth.user);
          if (auth.user.role === 'employee') setActiveModule('myTasks');
          else setActiveModule('projectWorkspace');
        } catch {
          localStorage.removeItem(sessionStorageKey);
          localStorage.removeItem(legacySessionStorageKey);
          localStorage.removeItem('hr_ai_user');
        }
      }
      const [settings, projectList] = await Promise.all([
        api.get<AISettings>('/ai/settings'),
        api.get<Project[]>('/projects'),
      ]);
      setAiSettings(settings);
      setAiForm((form) => ({
        ...form,
        base_url: settings.base_url,
        model: settings.model,
      }));
      setProjects(projectList);
      if (projectList[0]) setProjectId((value) => value ?? projectList[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '后端连接失败');
    } finally {
      setBusy(false);
    }
  }

  function goModule(module: Module) {
    if (module === 'home' || module === 'login') {
      setActiveModule(module);
      return;
    }
    if (!currentUser) {
      setActiveModule('login');
      return;
    }
    const leadershipModules: Module[] = [
      'executiveDashboard',
      'organizationDiagnosis',
      'talentOverview',
      'reportsOS',
      'dashboard',
    ];
    const hrModules: Module[] = [
      'projectWorkspace',
      'executiveDashboard',
      'organizationDiagnosis',
      'talentOverview',
      'surveyCenter',
      'responseTracking',
      'dashboard',
      'reportsOS',
      'review360',
      'admin',
      'feedback',
      'diagnosis',
      'talent',
      'rules',
      'orgDashboard',
      'diagnosisReports',
      'expertCouncil',
    ];
    const employeeModules: Module[] = [
      'myTasks',
      'surveys',
      'my360Feedback',
      'myCapabilityProfile',
      'organizationFeedback',
      'myGrowthReport',
      'dashboard',
    ];
    if (false && !leadershipModules.includes(module)) {
      setNotice('组织管理员视图默认只展示汇总和决策信息。');
      setActiveModule('executiveDashboard');
      void loadExecutiveDashboard();
      return;
    }
    if (currentUser.role === 'employee' && !employeeModules.includes(module)) {
      setNotice('员工端只能访问自己的任务、反馈和成长报告。');
      setActiveModule('myTasks');
      void loadEmployeeOSWorkspace();
      return;
    }
    if (
      currentUser.role === 'admin' &&
      !hrModules.includes(module)
    ) {
      setActiveModule('projectWorkspace');
      void loadHRWorkspace();
      return;
    }
    const adminModules: Module[] = [
      'admin',
      'review360',
      'diagnosis',
      'talent',
      'rules',
      'orgDashboard',
      'diagnosisReports',
      'expertCouncil',
    ];
    if (adminModules.includes(module) && !isHrUser) {
      setNotice('无权限访问，请联系组织管理员。');
      setActiveModule('myTasks');
      void loadEmployeeOSWorkspace();
      return;
    }
    setActiveModule(module);
    if (module === 'executiveDashboard') void loadExecutiveDashboard();
    if (module === 'projectWorkspace')
      void loadHRWorkspace();
    if (module === 'organizationDiagnosis') void loadOrganizationDiagnosisOS();
    if (module === 'talentOverview') void loadTalentProfilesOS();
    if (module === 'surveyCenter' || module === 'responseTracking')
      void loadSurveysOS();
    if (module === 'dashboard') void loadDashboardOS();
    if (module === 'reportsOS' || module === 'myGrowthReport')
      void loadReportsOS();
    if (
      module === 'myTasks' ||
      module === 'surveys' ||
      module === 'my360Feedback'
    )
      void loadEmployeeOSWorkspace();
    if (module === 'myCapabilityProfile') void loadMyCapabilityProfile();
    if (module === 'organizationFeedback') void loadOrganizationFeedbackOS();
    if (module === 'admin') void loadAdminWorkspace();
    if (module === 'employee') void loadEmployeeWorkspace();
    if (module === 'feedback') void loadFeedbackWorkspace();
    if (module === 'diagnosis') void loadDiagnosisWorkspace();
    if (module === 'talent') void loadTalentWorkspace();
    if (module === 'rules') void loadRulesWorkspace();
    if (module === 'orgDashboard') void loadOrganizationDashboard();
    if (module === 'diagnosisReports') void loadDiagnosisReportsWorkspace();
    if (module === 'expertCouncil') {
      void loadOrganizationDashboard();
      void loadDiagnosisReportsWorkspace();
      void loadSurveysOS();
      void loadExpertCouncilSessions();
    }
    if (module === 'review360') {
      setActiveTab('questionnaire');
      if (projectId) void loadWorkspace(projectId);
      void loadStrategyReferences();
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api.post<
        { sessionValue?: string; user: User } & Record<
          string,
          string | User | undefined
        >
      >('/auth/login', loginForm);
      const sessionValue =
        result.sessionValue ||
        (result[legacySessionField] as string | undefined) ||
        '';
      localStorage.setItem(sessionStorageKey, sessionValue);
      localStorage.removeItem(legacySessionStorageKey);
      localStorage.setItem('hr_ai_user', JSON.stringify(result.user));
      setCurrentUser(result.user);
      setNotice(`欢迎回来，${result.user.username}`);
      if (result.user.role === 'employee') {
        setActiveModule('myTasks');
        await loadEmployeeOSWorkspace();
      } else {
        setActiveModule('projectWorkspace');
        await loadHRWorkspace();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout still clears the MVP session state.
    }
    localStorage.removeItem(sessionStorageKey);
    localStorage.removeItem(legacySessionStorageKey);
    localStorage.removeItem('hr_ai_user');
    setCurrentUser(null);
    setActiveModule('home');
  }

  async function loadAdminWorkspace() {
    if (!currentUser && !localStorage.getItem(sessionStorageKey)) return;
    setBusy(true);
    setError('');
    try {
      const selectedProjectId = projectId ?? projects[0]?.id;
      const [dashboard, userData, feedbackData] = await Promise.all([
        api.get<AdminDashboard>('/admin/dashboard'),
        api.get<User[]>('/admin/users'),
        api.get<FeedbackItem[]>('/admin/feedback'),
      ]);
      setAdminDashboard(dashboard);
      setUsers(userData);
      setAdminFeedback(feedbackData);
      if (selectedProjectId) {
        const [progress, taskData, responseData] = await Promise.all([
          api.get<ProjectProgress>(
            `/admin/projects/${selectedProjectId}/progress`,
          ),
          api.get<ReviewTask[]>(`/admin/projects/${selectedProjectId}/tasks`),
          api.get<Array<Record<string, unknown>>>(
            `/admin/projects/${selectedProjectId}/responses`,
          ),
        ]);
        setProjectProgress(progress);
        setAdminTasks(taskData);
        setAdminResponses(responseData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载管理员数据失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadEmployeeWorkspace() {
    setBusy(true);
    setError('');
    try {
      const [taskData, submissionData, feedbackData] = await Promise.all([
        api.get<ReviewTask[]>('/employee/tasks'),
        api.get<Array<Record<string, unknown>>>('/employee/submissions'),
        api.get<FeedbackItem[]>('/feedback/my'),
      ]);
      setEmployeeTasks(taskData);
      setEmployeeSubmissions(submissionData);
      setMyFeedback(feedbackData);
      if (taskData[0] && !selectedTaskId) {
        await loadEmployeeTask(taskData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载员工任务失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadFeedbackWorkspace() {
    if (!currentUser) return;
    if (isHrUser) {
      const [feedbackData, clusters] = await Promise.all([
        api.get<FeedbackItem[]>('/admin/feedback'),
        api.get<FeedbackCluster[]>(
          `/admin/feedback/clusters${projectId ? `?project_id=${projectId}` : ''}`,
        ),
      ]);
      setAdminFeedback(feedbackData);
      setFeedbackClusters(clusters);
    } else {
      const feedbackData = await api.get<FeedbackItem[]>('/feedback/my');
      setMyFeedback(feedbackData);
    }
  }

  async function loadStrategyReferences() {
    if (currentUser && !isHrUser && !localStorage.getItem(sessionStorageKey))
      return;
    try {
      const [hypotheses, models] = await Promise.all([
        api.get<DiagnosisHypothesis[]>('/diagnosis/hypotheses'),
        api.get<TalentModel[]>('/talent/models'),
      ]);
      setDiagnosisList(hypotheses);
      setTalentModels(models);
    } catch {
      // Strategy references are admin-only; keep the existing 360 flow usable if they are unavailable.
    }
  }

  async function loadDiagnosisWorkspace() {
    setBusy(true);
    setError('');
    try {
      const items = await api.get<DiagnosisHypothesis[]>(
        '/diagnosis/hypotheses',
      );
      setDiagnosisList(items);
      const selected =
        items.find((item) => item.id === selectedDiagnosisId) ?? items[0];
      if (selected) {
        setSelectedDiagnosisId(selected.id ?? null);
        setDiagnosisDraft(selected);
      } else {
        setDiagnosisDraft({ ...blankDiagnosis, project_id: projectId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载诊断假设失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadTalentWorkspace() {
    setBusy(true);
    setError('');
    try {
      const [hypotheses, models] = await Promise.all([
        api.get<DiagnosisHypothesis[]>('/diagnosis/hypotheses'),
        api.get<TalentModel[]>('/talent/models'),
      ]);
      setDiagnosisList(hypotheses);
      setTalentModels(models);
      const selected =
        models.find((model) => model.id === selectedTalentModelId) ?? models[0];
      if (selected) {
        setSelectedTalentModelId(selected.id ?? null);
        setTalentDraft(selected);
      } else {
        const confirmed = hypotheses.find(
          (item) => item.status === 'confirmed',
        );
        setTalentDraft({
          ...blankTalentModel,
          project_id: projectId,
          hypothesis_id: confirmed?.id ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载人才模型失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadRulesWorkspace() {
    setBusy(true);
    setError('');
    try {
      const [hypotheses, models, rules] = await Promise.all([
        api.get<DiagnosisHypothesis[]>('/diagnosis/hypotheses'),
        api.get<TalentModel[]>('/talent/models'),
        api.get<DiagnosisRule[]>(
          `/diagnosis/rules${projectId ? `?project_id=${projectId}` : ''}`,
        ),
      ]);
      setDiagnosisList(hypotheses);
      setTalentModels(models);
      setDiagnosisRules(rules);
      const confirmed = hypotheses.find((item) => item.status === 'confirmed');
      const model =
        models.find((item) => item.status === 'confirmed') ?? models[0];
      setRuleForm((form) => ({
        ...form,
        hypothesis_id: form.hypothesis_id || String(confirmed?.id ?? ''),
        model_id: form.model_id || String(model?.id ?? ''),
        constraints: confirmed?.constraints || form.constraints,
      }));
      setRuleDraft((draft) => ({
        ...draft,
        project_id: draft.project_id ?? projectId,
        hypothesis_id: draft.hypothesis_id ?? confirmed?.id ?? null,
        model_id: draft.model_id ?? model?.id ?? null,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载诊断规则失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadOrganizationDashboard() {
    setBusy(true);
    setError('');
    try {
      const selectedProject = projectId ?? projects[0]?.id;
      if (!selectedProject) {
        setOrganizationDashboard(null);
        return;
      }
      const [dashboard, clusters, risks] = await Promise.all([
        api.get<OrganizationDashboard>(
          `/diagnosis/dashboard?project_id=${selectedProject}`,
        ),
        api.get<FeedbackCluster[]>(
          `/admin/feedback/clusters?project_id=${selectedProject}`,
        ),
        api.get<OrganizationRisk[]>(
          `/diagnosis/risks?project_id=${selectedProject}`,
        ),
      ]);
      setOrganizationDashboard(dashboard);
      setFeedbackClusters(clusters);
      setOrganizationRisks(risks);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载组织诊断看板失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadDiagnosisReportsWorkspace() {
    setBusy(true);
    setError('');
    try {
      const query = projectId ? `?project_id=${projectId}` : '';
      const [hypotheses, models, reportsData, plans] = await Promise.all([
        api.get<DiagnosisHypothesis[]>('/diagnosis/hypotheses'),
        api.get<TalentModel[]>('/talent/models'),
        api.get<DiagnosisReport[]>(`/diagnosis/reports${query}`),
        api.get<ActionPlan[]>(`/action-plans${query}`),
      ]);
      setDiagnosisList(hypotheses);
      setTalentModels(models);
      setDiagnosisReports(reportsData);
      setActionPlans(plans);
      const selected =
        reportsData.find((report) => report.id === selectedDiagnosisReportId) ??
        reportsData[0];
      if (selected) {
        setSelectedDiagnosisReportId(selected.id);
        setDiagnosisReportDraft(selected.content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载诊断报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadEmployeeTask(taskId: number) {
    setSelectedTaskId(taskId);
    const detail = await api.get<{
      task: ReviewTask;
      questionnaire: Questionnaire;
    }>(`/employee/tasks/${taskId}`);
    setEmployeeTaskQuestionnaire(detail.questionnaire);
    const taskQuestions = detail.questionnaire.dimensions.flatMap(
      (dimension) => dimension.questions,
    );
    setEmployeeScores(
      Object.fromEntries(
        taskQuestions.map((question) => [
          question.id ?? question.sort_order,
          3,
        ]),
      ),
    );
    setEmployeeQuestionFeedbacks({});
    setEmployeeOverallComment('');
  }

  async function loadWorkspace(nextProjectId: number) {
    setBusy(true);
    setError('');
    try {
      const [
        questionnaireData,
        employeeData,
        relationshipData,
        analyticsData,
        reportData,
        aiRunData,
        historyData,
      ] = await Promise.all([
        api.get<Questionnaire>(`/projects/${nextProjectId}/questionnaire`),
        api.get<Employee[]>(`/projects/${nextProjectId}/employees`),
        api.get<Relationship[]>(`/projects/${nextProjectId}/relationships`),
        api.get<Analytics>(`/projects/${nextProjectId}/analytics`),
        api.get<Report[]>(`/projects/${nextProjectId}/reports`),
        api.get<AuditEntry[]>(`/projects/${nextProjectId}/ai-runs`),
        api.get<AuditEntry[]>(`/projects/${nextProjectId}/edit-history`),
      ]);
      setQuestionnaire(questionnaireData);
      setEmployees(employeeData);
      setRelationships(relationshipData);
      setAnalytics(analyticsData);
      setReports(reportData);
      setAiRuns(aiRunData);
      setEditHistory(historyData);
      setSelectedAssignmentId(
        (value) => value ?? relationshipData[0]?.id ?? null,
      );
      setReportEmployeeId((value) => value ?? employeeData[0]?.id ?? null);
      setSelectedReportId((value) => value ?? reportData[0]?.id ?? null);
      if (employeeData[0]) {
        setRelationshipForm((form) => ({
          ...form,
          subject_employee_id: form.subject_employee_id || employeeData[0].id,
          evaluator_employee_id:
            form.evaluator_employee_id || employeeData[0].id,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目数据失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadExecutiveDashboard() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const dashboardData = await api.get<ExecutiveDashboard>(
        `/projects/${id}/executive-dashboard`,
      );
      setExecutiveDashboard(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载组织管理员看板失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadHRWorkspace() {
    setBusy(true);
    setError('');
    try {
      const projectList = await api.get<Project[]>('/projects');
      setProjects(projectList);
      const id = projectId ?? projectList[0]?.id ?? null;
      if (id) {
        setProjectId(id);
        const [surveyData, reportData] = await Promise.all([
          api.get<Survey[]>(`/projects/${id}/survey-progress`),
          api.get<OSReport[]>(`/projects/${id}/reports`),
        ]);
        setSurveys(surveyData);
        setOsReports(reportData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载项目工作台失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadOrganizationDiagnosisOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const [questionData, resultData] = await Promise.all([
        api.get<{ dimensions: OrganizationDiagnosisDimension[] }>(
          `/projects/${id}/org-diagnosis/questions`,
        ),
        api.get<OrganizationDiagnosisResult>(
          `/projects/${id}/org-diagnosis/result`,
        ),
      ]);
      setOrgDiagnosisQuestions(questionData.dimensions);
      setOrgDiagnosisResult(resultData);
      setOrgDiagnosisScores((scores) => {
        if (Object.keys(scores).length) return scores;
        return Object.fromEntries(
          questionData.dimensions.flatMap((dimension) =>
            dimension.questions.map((question) => [question.key, 3]),
          ),
        );
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载组织诊断失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadTalentProfilesOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      if (currentUser?.role === 'admin') {
        await loadExecutiveDashboard();
        return;
      }
      const profiles = await api.get<TalentProfile[]>(
        `/projects/${id}/talent-profiles`,
      );
      setTalentProfiles(profiles);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载人才画像失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadSurveysOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      if (currentUser?.role === 'employee') {
        const tasks = await api.get<Survey[]>(
          `/projects/${id}/surveys/my-tasks`,
        );
        setSurveyTasks(tasks);
      } else {
        const surveyData = await api.get<Survey[]>(
          `/projects/${id}/survey-progress`,
        );
        setSurveys(surveyData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载问卷中心失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadDashboardOS() {
    const id = selectedProjectId;
    if (!id) return;
    if (currentUser?.role === 'admin') await loadExecutiveDashboard();
    else if (currentUser?.role === 'employee') await loadEmployeeOSWorkspace();
    else {
      await Promise.all([
        loadOrganizationDiagnosisOS(),
        loadSurveysOS(),
        loadOrganizationFeedbackOS(),
      ]);
    }
  }

  async function loadReportsOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const reportData =
        currentUser?.role === 'employee'
          ? await api.get<OSReport[]>(`/projects/${id}/reports/me`)
          : await api.get<OSReport[]>(`/projects/${id}/reports`);
      setOsReports(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadEmployeeOSWorkspace() {
    const id = selectedProjectId;
    await loadEmployeeWorkspace();
    if (!id) return;
    try {
      const [tasks, profile, reportData] = await Promise.all([
        api.get<Survey[]>(`/projects/${id}/surveys/my-tasks`),
        api.get<TalentProfile>(`/projects/${id}/talent-profiles/me`),
        api.get<OSReport[]>(`/projects/${id}/reports/me`),
      ]);
      setSurveyTasks(tasks);
      setMyTalentProfile(profile);
      setOsReports(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载员工工作台失败');
    }
  }

  async function loadMyCapabilityProfile() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const profile = await api.get<TalentProfile>(
        `/projects/${id}/talent-profiles/me`,
      );
      setMyTalentProfile(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载我的能力画像失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadOrganizationFeedbackOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      if (currentUser?.role === 'employee') {
        const items = await api.get<OrganizationFeedback[]>(
          `/projects/${id}/organization-feedback/me`,
        );
        setOrganizationFeedbackItems(items);
      } else {
        const [items, summary] = await Promise.all([
          currentUser?.role === 'admin'
            ? Promise.resolve([] as OrganizationFeedback[])
            : api.get<OrganizationFeedback[]>(
                `/projects/${id}/organization-feedback`,
              ),
          api.get<ExecutiveDashboard['organization_feedback']>(
            `/projects/${id}/organization-feedback/summary`,
          ),
        ]);
        setOrganizationFeedbackItems(items);
        setOrganizationFeedbackSummary(summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载组织反馈失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitOrgDiagnosis() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const responses = orgDiagnosisQuestions.flatMap((dimension) =>
        dimension.questions.map((question) => ({
          dimension: dimension.key,
          question_key: question.key,
          score: orgDiagnosisScores[question.key] ?? 3,
          comment: orgDiagnosisComments[question.key] ?? '',
        })),
      );
      const result = await api.post<{ result: OrganizationDiagnosisResult }>(
        `/projects/${id}/org-diagnosis/responses`,
        { responses },
      );
      setOrgDiagnosisResult(result.result);
      setNotice('组织诊断问卷已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交组织诊断失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveOrgDiagnosis() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const saved = await api.put<{ dimensions: OrganizationDiagnosisDimension[] }>(
        `/projects/${id}/org-diagnosis/questions`,
        { dimensions: orgDiagnosisQuestions },
      );
      setOrgDiagnosisQuestions(saved.dimensions);
      setNotice('\u8bca\u65ad\u5df2\u4fdd\u5b58');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存诊断失败');
    } finally {
      setBusy(false);
    }
  }

  function updateOrgDiagnosisDimension(
    index: number,
    patch: Partial<OrganizationDiagnosisDimension>,
  ) {
    setOrgDiagnosisQuestions((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function updateOrgDiagnosisQuestion(
    dimensionIndex: number,
    questionIndex: number,
    text: string,
  ) {
    setOrgDiagnosisQuestions((items) =>
      items.map((dimension, itemIndex) =>
        itemIndex === dimensionIndex
          ? {
              ...dimension,
              questions: dimension.questions.map((question, qIndex) =>
                qIndex === questionIndex ? { ...question, text } : question,
              ),
            }
          : dimension,
      ),
    );
  }

  function addOrgDiagnosisDimension() {
    setOrgDiagnosisQuestions((items) => [
      ...items,
      {
        key: `custom_${Date.now()}`,
        label: '新增维度',
        description: '',
        questions: [
          {
            key: `custom_${Date.now()}_1`,
            text: '新增诊断问题',
            score_min: 1,
            score_max: 5,
          },
        ],
        score: 3,
        comments: '',
        evidence: '',
        sort_order: items.length,
      },
    ]);
  }

  function deleteOrgDiagnosisDimension(index: number) {
    setOrgDiagnosisQuestions((items) =>
      items.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function persistOrgDiagnosisDimensions(
    nextDimensions: OrganizationDiagnosisDimension[],
    successMessage: string,
  ) {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const saved = await api.put<{ dimensions: OrganizationDiagnosisDimension[] }>(
        `/projects/${id}/org-diagnosis/questions`,
        { dimensions: nextDimensions },
      );
      setOrgDiagnosisQuestions(saved.dimensions);
      setNotice(successMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存组织诊断维度失败');
    } finally {
      setBusy(false);
    }
  }

  async function addAndPersistOrgDiagnosisDimension() {
    if (!selectedProjectId) {
      setNotice('请先前往项目中心创建或选择一个诊断项目');
      return;
    }
    const now = Date.now();
    const nextDimensions = [
      ...orgDiagnosisQuestions,
      {
        key: `custom_${now}`,
        label: '新增组织能力维度',
        description: '请填写这个维度的定义、观察重点和推荐问题方向。',
        questions: [
          {
            key: `custom_${now}_1`,
            text: '请围绕这个组织能力维度设计一个可观察、可回答的问题。',
            score_min: 1,
            score_max: 5,
          },
        ],
        score: 3,
        comments: '',
        evidence: '',
        sort_order: orgDiagnosisQuestions.length,
      },
    ];
    setOrgDiagnosisQuestions(nextDimensions);
    await persistOrgDiagnosisDimensions(nextDimensions, '组织诊断维度已新增');
  }

  async function deleteAndPersistOrgDiagnosisDimension(index: number) {
    if (!selectedProjectId) {
      setNotice('请先前往项目中心创建或选择一个诊断项目');
      return;
    }
    const dimension = orgDiagnosisQuestions[index];
    const confirmed = window.confirm(
      `确认删除维度「${dimension?.label ?? ''}」吗？该维度已关联问卷问题时，删除后不会删除历史问卷，但新问卷将不再使用该维度。`,
    );
    if (!confirmed) return;
    const nextDimensions = orgDiagnosisQuestions.filter(
      (_, itemIndex) => itemIndex !== index,
    );
    setOrgDiagnosisQuestions(nextDimensions);
    await persistOrgDiagnosisDimensions(nextDimensions, '组织诊断维度已删除');
  }

  async function restoreDefaultOrgDiagnosisDimensions() {
    if (!selectedProjectId) {
      setNotice('请先前往项目中心创建或选择一个诊断项目');
      return;
    }
    const confirmed = window.confirm(
      '确认恢复默认八大组织能力维度吗？当前项目的自定义维度会被默认模板替换。',
    );
    if (!confirmed) return;
    await persistOrgDiagnosisDimensions(
      defaultOrganizationDimensions,
      '已恢复默认八大组织能力维度',
    );
  }

  async function handleGenerateTalentProfilesOS() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        generated: number;
        profiles: TalentProfile[];
      }>(`/projects/${id}/talent-profiles/generate`);
      setTalentProfiles(result.profiles);
      setSelectedTalentProfileId(
        result.profiles[0]?.id ?? result.profiles[0]?.user_id ?? null,
      );
      setNotice(`已生成 ${result.generated} 份人才画像`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成人才画像失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitSurveyTask(survey: Survey) {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await api.post<SurveyResponse>(
        `/projects/${id}/surveys/${survey.id}/responses`,
        {
          response_json: {
            title: survey.title,
            sample_response: true,
            submitted_from: 'employee_portal',
          },
        },
      );
      await loadSurveysOS();
      setNotice('问卷已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitOrganizationFeedbackOS(event: FormEvent) {
    event.preventDefault();
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await api.post<OrganizationFeedback>(
        `/projects/${id}/organization-feedback`,
        organizationFeedbackForm,
      );
      setOrganizationFeedbackForm({
        feedback_type: 'ai_tools',
        content: '',
        is_anonymous: true,
      });
      await loadOrganizationFeedbackOS();
      setNotice('组织反馈已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交组织反馈失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateOSReport(
    reportType: 'boss_report' | 'hr_report' | 'employee_report',
  ) {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      await api.post<OSReport>(`/projects/${id}/reports/generate`, {
        report_type: reportType,
      });
      await loadReportsOS();
      setNotice('规则版报告已生成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function refreshAll() {
    const projectList = await api.get<Project[]>('/projects');
    setProjects(projectList);
    if (projectId) await loadWorkspace(projectId);
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!projectId) return;
    void loadWorkspace(projectId);
    if (activeModule === 'organizationDiagnosis') void loadOrganizationDiagnosisOS();
    if (activeModule === 'surveyCenter' || activeModule === 'responseTracking')
      void loadSurveysOS();
  }, [projectId]);

  useEffect(() => {
    const editingProject = projects.find((project) => project.id === editingProjectId);
    if (editingProject) {
      setProjectForm({
        name: editingProject.name,
        description: editingProject.description,
        project_type: editingProject.project_type,
        target_scope: editingProject.target_scope,
        purpose: editingProject.purpose,
        scope: editingProject.scope,
        start_date: editingProject.start_date,
        end_date: editingProject.end_date,
        anonymous: Boolean(editingProject.anonymous),
        status: editingProject.status,
      });
    } else {
      setProjectForm(blankProject);
    }
    setDiagnosisDraft((value) => ({
      ...value,
      project_id: value.project_id ?? currentProject?.id ?? null,
    }));
    setTalentDraft((value) => ({
      ...value,
      project_id: value.project_id ?? currentProject?.id ?? null,
    }));
  }, [currentProject, editingProjectId, projects]);

  useEffect(() => {
    if (!questions.length) return;
    setScores(
      Object.fromEntries(
        questions.map((question) => [question.id ?? question.sort_order, 3]),
      ),
    );
    setQuestionFeedbacks({});
  }, [selectedAssignment?.id, questions.length]);

  useEffect(() => {
    setReportDraft(selectedReport?.content ?? '');
  }, [selectedReport?.id]);

  useEffect(() => {
    setDiagnosisReportDraft(selectedDiagnosisReport?.content ?? '');
  }, [selectedDiagnosisReport?.id]);

  async function handleProjectSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const project = editingProjectId
        ? await api.put<Project>(`/projects/${editingProjectId}`, projectForm)
        : await api.post<Project>('/projects', projectForm);
      const projectList = await api.get<Project[]>('/projects');
      setProjects(projectList);
      setProjectId(project.id);
      setEditingProjectId(null);
      setProjectForm(blankProject);
      setNotice(editingProjectId ? '\u9879\u76ee\u5df2\u66f4\u65b0' : '\u9879\u76ee\u5df2\u521b\u5efa');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存项目失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveAISettings(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const settings = await api.post<AISettings>('/ai/settings', aiForm);
      setAiSettings(settings);
      setNotice('AI 配置已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存 AI 配置失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateQuestionnaire() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    setIssues([]);
    try {
      const result = await api.post<Questionnaire>(
        `/projects/${projectId}/questionnaire/generate`,
        generateForm,
      );
      setQuestionnaire(result);
      await loadWorkspace(projectId);
      setNotice(
        result.used_fallback ? '已生成本地规则问卷草稿' : 'AI 问卷草稿已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleInspectQuestionnaire() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{ issues: QuestionIssue[] }>(
        `/projects/${projectId}/questionnaire/inspect`,
      );
      setIssues(result.issues);
      await loadWorkspace(projectId);
      setNotice('问卷质量检查已完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveQuestionnaire() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.put<Questionnaire>(
        `/projects/${projectId}/questionnaire`,
        { dimensions: questionnaire.dimensions },
      );
      setQuestionnaire(result);
      await loadWorkspace(projectId);
      setNotice('问卷已保存并记录人工修改');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存问卷失败');
    } finally {
      setBusy(false);
    }
  }

  function updateDimension(index: number, patch: Partial<Dimension>) {
    setQuestionnaire((value) => ({
      dimensions: value.dimensions.map((dimension, dimIndex) =>
        dimIndex === index ? { ...dimension, ...patch } : dimension,
      ),
    }));
  }

  function updateQuestion(
    dimensionIndex: number,
    questionIndex: number,
    patch: Partial<Dimension['questions'][number]>,
  ) {
    setQuestionnaire((value) => ({
      dimensions: value.dimensions.map((dimension, dimIndex) =>
        dimIndex === dimensionIndex
          ? {
              ...dimension,
              questions: dimension.questions.map((question, qIndex) =>
                qIndex === questionIndex ? { ...question, ...patch } : question,
              ),
            }
          : dimension,
      ),
    }));
  }

  function addDimension() {
    setQuestionnaire((value) => ({
      dimensions: [
        ...value.dimensions,
        {
          name: '新胜任力维度',
          description: '',
          sort_order: value.dimensions.length,
          questions: [
            {
              text: '能够在关键场景中展现可观察的目标行为',
              behavior_anchor: '',
              source_type: 'manual',
              question_type: 'rating',
              applicable_relationships: [],
              relation_scope: 'all',
              rating_type: 'score_1_5',
              open_followup: '',
              weight: 1,
              required: true,
              sort_order: 0,
            },
          ],
        },
      ],
    }));
  }

  function addQuestion(dimensionIndex: number) {
    setQuestionnaire((value) => ({
      dimensions: value.dimensions.map((dimension, index) =>
        index === dimensionIndex
          ? {
              ...dimension,
              questions: [
                ...dimension.questions,
                {
                  text: '新增行为化题目',
                  behavior_anchor: '',
                  source_type: 'manual',
                  question_type: 'rating',
                  applicable_relationships: [],
                  relation_scope: 'all',
                  rating_type: 'score_1_5',
                  open_followup: '',
                  weight: 1,
                  required: true,
                  sort_order: dimension.questions.length,
                },
              ],
            }
          : dimension,
      ),
    }));
  }

  function removeDimension(dimensionIndex: number) {
    setQuestionnaire((value) => ({
      dimensions: value.dimensions.filter(
        (_, index) => index !== dimensionIndex,
      ),
    }));
  }

  function removeQuestion(dimensionIndex: number, questionIndex: number) {
    setQuestionnaire((value) => ({
      dimensions: value.dimensions.map((dimension, index) =>
        index === dimensionIndex
          ? {
              ...dimension,
              questions: dimension.questions.filter(
                (_, qIndex) => qIndex !== questionIndex,
              ),
            }
          : dimension,
      ),
    }));
  }

  async function handleCreateEmployee(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      await api.post<Employee>(
        `/projects/${projectId}/employees`,
        employeeForm,
      );
      setEmployeeForm(blankEmployee);
      await loadWorkspace(projectId);
      setNotice('员工已添加');
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加员工失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleImportEmployees() {
    if (!projectId) return;
    const parsed = parseEmployeeRows(csvText);
    if (!parsed.length) {
      setError('没有识别到可导入的员工');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post<Employee[]>(`/projects/${projectId}/employees/bulk`, {
        employees: parsed,
      });
      await loadWorkspace(projectId);
      setNotice(`已导入 ${parsed.length} 名员工`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入员工失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateRelationship(event: FormEvent) {
    event.preventDefault();
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      await api.post<Relationship>(
        `/projects/${projectId}/relationships`,
        relationshipForm,
      );
      await loadWorkspace(projectId);
      setNotice('评价关系已添加');
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加评价关系失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSelfRelationships() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    let created = 0;
    for (const employee of employees) {
      try {
        await api.post<Relationship>(`/projects/${projectId}/relationships`, {
          subject_employee_id: employee.id,
          evaluator_employee_id: employee.id,
          relation_type: 'self',
        });
        created += 1;
      } catch {
        // Duplicate self reviews are fine in this batch action.
      }
    }
    await loadWorkspace(projectId);
    setNotice(`已补齐 ${created} 条自评关系`);
    setBusy(false);
  }

  async function handleDeleteRelationship(id: number) {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/projects/${projectId}/relationships/${id}`);
      await loadWorkspace(projectId);
      setNotice('评价关系已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除评价关系失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitResponse(event: FormEvent) {
    event.preventDefault();
    if (!projectId || !selectedAssignment) return;
    const payload = {
      subject_employee_id: selectedAssignment.subject_employee_id,
      evaluator_employee_id: selectedAssignment.evaluator_employee_id,
      relation_type: selectedAssignment.relation_type,
      scores: questions
        .filter((question) => question.id)
        .map((question) => ({
          question_id: question.id,
          score: scores[question.id ?? 0] ?? 3,
          text_feedback: questionFeedbacks[question.id ?? 0] ?? '',
        })),
      overall_comment: responseComment,
    };
    setBusy(true);
    setError('');
    try {
      await api.post(`/projects/${projectId}/responses`, payload);
      setResponseComment('');
      await loadWorkspace(projectId);
      setNotice('问卷已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateReport() {
    if (!projectId || !reportEmployeeId) return;
    setBusy(true);
    setError('');
    try {
      const report = await api.post<Report>(
        `/projects/${projectId}/reports/${reportEmployeeId}/generate`,
      );
      await loadWorkspace(projectId);
      setSelectedReportId(report.id);
      setReportDraft(report.content);
      setNotice(
        report.status === 'draft' ? '个人报告草稿已生成' : '个人报告已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveReport() {
    if (!projectId || !selectedReport) return;
    setBusy(true);
    setError('');
    try {
      const report = await api.put<Report>(
        `/projects/${projectId}/reports/${selectedReport.id}`,
        {
          content: reportDraft,
          editor: '管理员',
        },
      );
      await loadWorkspace(projectId);
      setSelectedReportId(report.id);
      setNotice('报告人工修改已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReport() {
    if (!projectId || !selectedReport) return;
    setBusy(true);
    setError('');
    try {
      const report = await api.post<Report>(
        `/projects/${projectId}/reports/${selectedReport.id}/confirm`,
      );
      await loadWorkspace(projectId);
      setSelectedReportId(report.id);
      setNotice('报告已由管理员确认');
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateOrgDiagnosis() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{ content: string }>(
        `/projects/${projectId}/org-diagnosis/generate`,
      );
      setOrgDiagnosis(result.content);
      await loadWorkspace(projectId);
      setNotice('组织诊断摘要已生成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成组织诊断失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post<User>('/admin/users', {
        username: userForm.username,
        loginCode: userForm.loginCode,
        role: userForm.role,
        employee_id: userForm.employee_id ? Number(userForm.employee_id) : null,
        status: userForm.status,
      });
      setUserForm({
        username: '',
        loginCode: '',
        role: 'employee',
        employee_id: '',
        status: 'active',
      });
      await loadAdminWorkspace();
      setNotice('员工账号已创建');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建账号失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateTasks() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{ created: number; total: number }>(
        `/admin/projects/${projectId}/generate-tasks`,
      );
      await loadAdminWorkspace();
      setNotice(
        `已生成 ${result.created} 条新任务，当前项目共 ${result.total} 条任务`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成员工填写任务失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitEmployeeTask(event: FormEvent) {
    event.preventDefault();
    if (!selectedTaskId) return;
    const taskQuestions = employeeTaskQuestionnaire.dimensions.flatMap(
      (dimension) => dimension.questions,
    );
    setBusy(true);
    setError('');
    try {
      await api.post(`/employee/tasks/${selectedTaskId}/submit`, {
        scores: taskQuestions
          .filter((question) => question.id)
          .map((question) => ({
            question_id: question.id,
            score: employeeScores[question.id ?? 0] ?? 3,
            text_feedback: employeeQuestionFeedbacks[question.id ?? 0] ?? '',
          })),
        overall_comment: employeeOverallComment,
      });
      await loadEmployeeWorkspace();
      setNotice('评审问卷已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交任务失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitFeedback(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post<FeedbackItem>('/feedback', feedbackForm);
      setFeedbackForm({
        category: 'general',
        title: '',
        content: '',
        anonymous: false,
        priority: 'normal',
      });
      await loadFeedbackWorkspace();
      setNotice('员工反馈已提交');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交反馈失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleFeedbackStatus(feedbackId: number, status: string) {
    setBusy(true);
    try {
      await api.put(`/admin/feedback/${feedbackId}/status`, { status });
      await loadFeedbackWorkspace();
      setNotice('反馈状态已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新反馈状态失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleFeedbackSummary(feedbackId: number) {
    setBusy(true);
    try {
      await api.post(`/admin/feedback/${feedbackId}/ai-summary`);
      await loadFeedbackWorkspace();
      setNotice('AI 反馈总结已生成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成反馈总结失败');
    } finally {
      setBusy(false);
    }
  }

  function toggleValue(list: string[], value: string) {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value];
  }

  function selectDiagnosis(item: DiagnosisHypothesis) {
    setSelectedDiagnosisId(item.id ?? null);
    setDiagnosisDraft(item);
  }

  function handleAddDiagnosisHypothesis() {
    setSelectedDiagnosisId(null);
    setDiagnosisDraft({
      ...blankDiagnosis,
      project_id: projectId,
      ai_extracted_hypotheses: [
        {
          hypothesis_title: '新增假设',
          hypothesis_detail: '',
          problem_type: 'organization',
          suggested_validation_method: '',
          suggested_data_sources: [],
          related_talent_dimensions: [],
        },
      ],
    });
  }

  async function handleDeleteDiagnosisHypothesis() {
    if (!diagnosisDraft.id) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/diagnosis/hypotheses/${diagnosisDraft.id}`);
      setSelectedDiagnosisId(null);
      setDiagnosisDraft({ ...blankDiagnosis, project_id: projectId });
      await loadDiagnosisWorkspace();
      setNotice('诊断假设已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除诊断假设失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProject(project: Project) {
    const confirmed = window.confirm(
      `确认删除项目「${project.name}」吗？该操作会删除该项目下的诊断、问卷、反馈、报告等项目数据，不能撤销。`,
    );
    if (!confirmed) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/projects/${project.id}`);
      const projectList = await api.get<Project[]>('/projects');
      setProjects(projectList);
      const nextProject = projectList.find((item) => item.id !== project.id) ?? projectList[0] ?? null;
      setProjectId(nextProject?.id ?? null);
      if (editingProjectId === project.id) {
        setEditingProjectId(null);
        setProjectForm(blankProject);
      }
      setNotice('项目已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除项目失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateProjectSurvey() {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const detail = await api.post<SurveyDetail>(
        `/projects/${id}/surveys/generate`,
        {
          title: '组织诊断与胜任力综合问卷',
          source_mode: modelQuestionForm.source_mode,
          model_id: modelQuestionForm.model_id
            ? Number(modelQuestionForm.model_id)
            : null,
          status: 'active',
        },
      );
      setSelectedSurveyId(detail.id);
      setSelectedSurveyDetail(detail);
      await loadSurveysOS();
      setNotice('问卷已生成，并进入问卷中心统一管理');
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成项目问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadSurveyDetail(surveyId: number) {
    const id = selectedProjectId;
    if (!id) return;
    setBusy(true);
    setError('');
    try {
      const detail = await api.get<SurveyDetail>(
        `/projects/${id}/surveys/${surveyId}`,
      );
      setSelectedSurveyId(surveyId);
      setSelectedSurveyDetail(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载问卷详情失败');
    } finally {
      setBusy(false);
    }
  }

  async function loadExpertCouncilSessions() {
    const id = selectedProjectId;
    if (!id || !isHrUser) return;
    try {
      const sessions = await api.get<ExpertCouncilSession[]>(
        `/projects/${id}/expert-council/sessions`,
      );
      setExpertCouncilSessions(sessions);
      const latest = sessions[0]?.output as ExpertCouncilResult | undefined;
      if (latest?.topIssues) setExpertCouncilResult(latest);
    } catch {
      setExpertCouncilSessions([]);
    }
  }

  async function handleSaveDiagnosisDraft() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...diagnosisDraft,
        project_id: diagnosisDraft.project_id ?? projectId,
        status: diagnosisDraft.status || 'draft',
      };
      const saved = payload.id
        ? await api.put<DiagnosisHypothesis>(
            `/diagnosis/hypotheses/${payload.id}`,
            payload,
          )
        : await api.post<DiagnosisHypothesis>('/diagnosis/hypotheses', payload);
      setDiagnosisDraft(saved);
      setSelectedDiagnosisId(saved.id ?? null);
      await loadDiagnosisWorkspace();
      setNotice('诊断假设草稿已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存诊断假设失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateDiagnosis() {
    setBusy(true);
    setError('');
    try {
      let draft = diagnosisDraft;
      if (!draft.id) {
        draft = await api.post<DiagnosisHypothesis>('/diagnosis/hypotheses', {
          ...diagnosisDraft,
          project_id: diagnosisDraft.project_id ?? projectId,
          status: 'draft',
        });
      }
      const generated = await api.post<DiagnosisHypothesis>(
        '/diagnosis/hypotheses/generate',
        {
          ...draft,
          project_id: draft.project_id ?? projectId,
        },
      );
      setDiagnosisDraft(generated);
      setSelectedDiagnosisId(generated.id ?? draft.id ?? null);
      await loadDiagnosisWorkspace();
      setNotice(
        generated.used_fallback
          ? '已返回本地规则诊断假设'
          : 'AI 诊断假设已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断假设失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDiagnosis() {
    if (!diagnosisDraft.id) return;
    setBusy(true);
    setError('');
    try {
      const confirmed = await api.post<DiagnosisHypothesis>(
        `/diagnosis/hypotheses/${diagnosisDraft.id}/confirm`,
      );
      setDiagnosisDraft(confirmed);
      await loadDiagnosisWorkspace();
      setNotice('诊断假设已确认，可进入 AI 人才模型生成');
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认诊断假设失败');
    } finally {
      setBusy(false);
    }
  }

  function updateExtractedHypothesis(
    index: number,
    patch: Partial<ExtractedHypothesis>,
  ) {
    setDiagnosisDraft((value) => ({
      ...value,
      ai_extracted_hypotheses: value.ai_extracted_hypotheses.map(
        (item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  }

  function addExtractedHypothesis() {
    setDiagnosisDraft((value) => ({
      ...value,
      ai_extracted_hypotheses: [
        ...value.ai_extracted_hypotheses,
        {
          hypothesis_title: '新增假设',
          hypothesis_detail: '',
          problem_type: 'organization',
          suggested_validation_method: '',
          suggested_data_sources: [],
          related_talent_dimensions: [],
        },
      ],
    }));
  }

  function removeExtractedHypothesis(index: number) {
    if (!window.confirm('确认删除这条诊断假设吗？删除后不会影响其他项目。')) {
      return;
    }
    setDiagnosisDraft((value) => ({
      ...value,
      ai_extracted_hypotheses: value.ai_extracted_hypotheses.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));
  }

  async function handleGenerateTalentModel() {
    if (!talentDraft.hypothesis_id) {
      setError('请先选择一个已确认的诊断假设');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        model: TalentModel;
        ai_run_id: number;
        used_fallback: boolean;
      }>('/talent/models/generate', {
        project_id: talentDraft.project_id ?? projectId,
        hypothesis_id: talentDraft.hypothesis_id,
        template: talentDraft.template || 'AI 原生管理者模型',
      });
      setTalentDraft({
        ...result.model,
        ai_run_id: result.ai_run_id,
        used_fallback: result.used_fallback,
      });
      setNotice(
        result.used_fallback
          ? '已返回本地规则 AI 原生管理者模型'
          : 'AI 人才模型已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成人才模型失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveTalentModel() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...talentDraft,
        project_id: talentDraft.project_id ?? projectId,
      };
      const saved = payload.id
        ? await api.put<TalentModel>(`/talent/models/${payload.id}`, payload)
        : await api.post<TalentModel>('/talent/models', payload);
      setTalentDraft(saved);
      setSelectedTalentModelId(saved.id ?? null);
      await loadTalentWorkspace();
      setNotice('AI 时代人才模型已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存人才模型失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmTalentModel() {
    if (!talentDraft.id) return;
    setBusy(true);
    setError('');
    try {
      const confirmed = await api.post<TalentModel>(
        `/talent/models/${talentDraft.id}/confirm`,
      );
      setTalentDraft(confirmed);
      await loadTalentWorkspace();
      setNotice('人才模型已确认，可基于该模型生成问卷');
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认人才模型失败');
    } finally {
      setBusy(false);
    }
  }

  function selectTalentModel(model: TalentModel) {
    setSelectedTalentModelId(model.id ?? null);
    setTalentDraft(model);
  }

  async function handleDeleteTalentModel() {
    if (!talentDraft.id) return;
    setBusy(true);
    setError('');
    try {
      await api.delete(`/talent/models/${talentDraft.id}`);
      setTalentDetailOpen(false);
      setSelectedTalentModelId(null);
      setTalentDraft({ ...blankTalentModel, project_id: projectId });
      await loadTalentWorkspace();
      setNotice('人才模型已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除人才模型失败');
    } finally {
      setBusy(false);
    }
  }

  function updateTalentDimension(
    index: number,
    patch: Partial<TalentDimension>,
  ) {
    setTalentDraft((value) => ({
      ...value,
      dimensions: value.dimensions.map((dimension, dimensionIndex) =>
        dimensionIndex === index ? { ...dimension, ...patch } : dimension,
      ),
    }));
  }

  function addTalentDimension() {
    setTalentDraft((value) => ({
      ...value,
      dimensions: [
        ...value.dimensions,
        {
          name: '新 AI 时代能力维度',
          description: '',
          low_behavior: '',
          medium_behavior: '',
          high_behavior: '',
          applicable_roles: '全员, 管理者',
          weight: 1,
          sample_rating_questions: ['请评价他/她在该维度上的稳定行为表现。'],
          sample_open_questions: ['请举例说明该维度相关的具体行为。'],
        },
      ],
    }));
  }

  function removeTalentDimension(index: number) {
    setTalentDraft((value) => ({
      ...value,
      dimensions: value.dimensions.filter(
        (_, dimensionIndex) => dimensionIndex !== index,
      ),
    }));
  }

  async function handleGenerateQuestionnaireFromModel() {
    if (
      !projectId ||
      !modelQuestionForm.hypothesis_id ||
      !modelQuestionForm.model_id
    ) {
      setError('请先选择项目、诊断假设和人才模型');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.post<
        Questionnaire & {
          questions: ModelGeneratedQuestion[];
          survey?: SurveyDetail;
          used_fallback?: boolean;
        }
      >('/360/questionnaire/generate-from-model', {
        project_id: projectId,
        hypothesis_id: Number(modelQuestionForm.hypothesis_id),
        model_id: Number(modelQuestionForm.model_id),
        target_level: modelQuestionForm.target_level,
        relation_types: modelQuestionForm.relation_types,
        question_count: modelQuestionForm.question_count,
        question_types: modelQuestionForm.question_types,
        constraints: modelQuestionForm.constraints,
      });
      setQuestionnaire(result);
      setModelGeneratedQuestions(result.questions ?? []);
      if (result.survey) {
        setSelectedSurveyId(result.survey.id);
        setSelectedSurveyDetail(result.survey);
      }
      await loadWorkspace(projectId);
      setNotice(
        result.used_fallback
          ? '已基于本地规则生成 AI 时代诊断问卷'
          : '已基于诊断假设和人才模型生成问卷',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '基于模型生成问卷失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateDiagnosisRules() {
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        rules: DiagnosisRule[];
        used_fallback?: boolean;
      }>('/diagnosis/rules/generate', {
        project_id: projectId,
        hypothesis_id: ruleForm.hypothesis_id
          ? Number(ruleForm.hypothesis_id)
          : null,
        model_id: ruleForm.model_id ? Number(ruleForm.model_id) : null,
        scopes: ruleForm.scopes,
        constraints: ruleForm.constraints,
      });
      setDiagnosisRules(result.rules);
      setRuleDraft(result.rules[0] ?? blankDiagnosisRule);
      setNotice(
        result.used_fallback
          ? '已生成本地规则诊断草稿'
          : 'AI 诊断规则已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断规则失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDiagnosisRule() {
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...ruleDraft,
        project_id: ruleDraft.project_id ?? projectId,
        hypothesis_id:
          ruleDraft.hypothesis_id ??
          (ruleForm.hypothesis_id ? Number(ruleForm.hypothesis_id) : null),
        model_id:
          ruleDraft.model_id ??
          (ruleForm.model_id ? Number(ruleForm.model_id) : null),
      };
      const saved = payload.id
        ? await api.put<DiagnosisRule>(
            `/diagnosis/rules/${payload.id}`,
            payload,
          )
        : await api.post<DiagnosisRule>('/diagnosis/rules', payload);
      setRuleDraft(saved);
      await loadRulesWorkspace();
      setNotice('诊断规则已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存诊断规则失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDiagnosisRule(ruleId: number) {
    setBusy(true);
    setError('');
    try {
      await api.delete(`/diagnosis/rules/${ruleId}`);
      await loadRulesWorkspace();
      setRuleDraft({ ...blankDiagnosisRule, project_id: projectId });
      setNotice('诊断规则已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除诊断规则失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleClusterFeedback() {
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        clusters: FeedbackCluster[];
        used_fallback?: boolean;
      }>('/admin/feedback/cluster', {
        project_id: projectId,
      });
      setFeedbackClusters(result.clusters);
      await loadFeedbackWorkspace();
      setNotice(
        result.used_fallback
          ? '已生成本地规则员工声音聚类'
          : '员工声音聚类已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '员工反馈聚类失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleLoadFilteredFeedback() {
    if (!currentUser || !isHrUser) return;
    const params = new URLSearchParams();
    if (feedbackFilters.category)
      params.set('category', feedbackFilters.category);
    if (feedbackFilters.status) params.set('status', feedbackFilters.status);
    if (feedbackFilters.anonymous)
      params.set('anonymous', feedbackFilters.anonymous);
    if (feedbackFilters.priority)
      params.set('priority', feedbackFilters.priority);
    const query = params.toString();
    const feedbackData = await api.get<FeedbackItem[]>(
      `/admin/feedback${query ? `?${query}` : ''}`,
    );
    setAdminFeedback(feedbackData);
  }

  async function handleGenerateOrganizationRisks() {
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        risks: OrganizationRisk[];
        used_fallback?: boolean;
      }>('/diagnosis/risks/generate', {
        project_id: projectId,
        hypothesis_id: ruleForm.hypothesis_id
          ? Number(ruleForm.hypothesis_id)
          : null,
        model_id: ruleForm.model_id ? Number(ruleForm.model_id) : null,
      });
      setOrganizationRisks(result.risks);
      await loadOrganizationDashboard();
      setNotice(
        result.used_fallback ? '已生成本地规则组织风险' : '组织风险已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成组织风险失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateDiagnosisReport() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const report = await api.post<DiagnosisReport>(
        '/diagnosis/reports/generate',
        {
          project_id: projectId,
          hypothesis_id: diagnosisReportForm.hypothesis_id
            ? Number(diagnosisReportForm.hypothesis_id)
            : null,
          model_id: diagnosisReportForm.model_id
            ? Number(diagnosisReportForm.model_id)
            : null,
          report_type: diagnosisReportForm.report_type,
          include_feedback_clusters:
            diagnosisReportForm.include_feedback_clusters,
          include_organization_risks:
            diagnosisReportForm.include_organization_risks,
          include_action_plan: diagnosisReportForm.include_action_plan,
        },
      );
      setSelectedDiagnosisReportId(report.id);
      setDiagnosisReportDraft(report.content);
      await loadDiagnosisReportsWorkspace();
      setNotice(
        report.used_fallback
          ? '已生成本地规则诊断报告草稿'
          : '诊断报告草稿已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成诊断报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDiagnosisReport() {
    if (!selectedDiagnosisReport) return;
    setBusy(true);
    setError('');
    try {
      const saved = await api.put<DiagnosisReport>(
        `/diagnosis/reports/${selectedDiagnosisReport.id}`,
        {
          title: selectedDiagnosisReport.title,
          content: diagnosisReportDraft,
          status: selectedDiagnosisReport.status,
        },
      );
      setSelectedDiagnosisReportId(saved.id);
      await loadDiagnosisReportsWorkspace();
      setNotice('诊断报告已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存诊断报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmDiagnosisReport() {
    if (!selectedDiagnosisReport) return;
    setBusy(true);
    setError('');
    try {
      const confirmed = await api.post<DiagnosisReport>(
        `/diagnosis/reports/${selectedDiagnosisReport.id}/confirm`,
      );
      setSelectedDiagnosisReportId(confirmed.id);
      await loadDiagnosisReportsWorkspace();
      setNotice('诊断报告已由管理员确认');
    } catch (err) {
      setError(err instanceof Error ? err.message : '确认诊断报告失败');
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateActionPlans() {
    if (!projectId) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post<{
        action_plans: ActionPlan[];
        used_fallback?: boolean;
      }>('/action-plans/generate', {
        project_id: projectId,
        report_id: selectedDiagnosisReportId,
        target_type: 'organization',
      });
      setActionPlans(result.action_plans);
      await loadDiagnosisReportsWorkspace();
      setNotice(
        result.used_fallback
          ? '已生成本地规则 30/60/90 行动计划'
          : '30/60/90 行动计划已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成行动计划失败');
    } finally {
      setBusy(false);
    }
  }

  function buildExpertCouncilResult(): ExpertCouncilResult {
    const completionRate =
      organizationDashboard?.completion?.completion_rate ??
      surveys.reduce((sum, survey) => sum + (survey.completion_rate ?? 0), 0) /
        Math.max(surveys.length, 1);
    const risks = organizationDashboard?.organization_risks ?? [];
    const feedbackThemes = feedbackClusters.map((cluster) => cluster.theme);
    const lowDimensions =
      organizationDashboard?.talent_model_performance?.low_dimensions ?? [];
    const topIssues = [
      risks[0]?.title ||
        lowDimensions[0]?.name ||
        '当前证据还不足以锁定唯一根因。',
      feedbackThemes[0] || '员工反馈还需要更清晰的主题聚类。',
      completionRate < 60
        ? '证据收集覆盖率仍然偏低。'
        : '需要把已识别问题转化为明确负责人和行动节奏。',
    ].slice(0, 3);
    const supportEvidence = [
      `当前项目已有 ${surveys.length} 份问卷。`,
      `当前项目已有 ${feedbackClusters.length} 组员工声音主题。`,
      `当前项目已有 ${risks.length} 条组织风险信号。`,
      `当前项目已有 ${diagnosisReports.length} 份诊断报告草稿。`,
    ];
    const opposingEvidence = [
      completionRate < 70
        ? '问卷完成率还不足以支撑稳定结论。'
        : '问卷完成率可以参考，但仍需复核定性证据。',
      !feedbackClusters.length
        ? '开放反馈还没有形成稳定主题。'
        : '反馈主题可能受到高表达意愿群体影响。',
      !diagnosisList.length
        ? '当前还没有已确认的诊断假设。'
        : '诊断假设仍需结合业务事实验证。',
    ];
    const confidence = Math.min(
      90,
      Math.max(
        35,
        Math.round(
          completionRate * 0.45 +
            Math.min(surveys.length, 4) * 8 +
            Math.min(feedbackClusters.length, 4) * 6 +
            Math.min(diagnosisReports.length, 2) * 8,
        ),
      ),
    );
    return {
      project_id: selectedProjectId,
      topIssues,
      supportEvidence,
      opposingEvidence,
      disagreements: [
        '组织发展专家强调组织机制和协作设计。',
        '人才与胜任力专家强调人才标准和管理者能力。',
        '业务视角专家追问问题是否真实阻碍执行，还是流程偏好差异。',
        '员工体验专家关注员工是否有足够安全感表达真实反馈。',
        '数据分析专家提醒在最终确认前检查证据覆盖和样本偏差。',
      ],
      confidence,
      riskLevel: confidence >= 75 ? 'low' : confidence >= 55 ? 'medium' : 'high',
      recommendedActions: [
        '确认一个最高优先级组织问题，并指定负责人与推进节奏。',
        '在做出高影响的人才决策前，先补充缺失证据。',
        '生成或更新诊断报告，并转化为 30/60/90 天行动计划。',
      ],
      missingData: [
        '补充来自低覆盖团队的开放反馈。',
        '补充能连接每条诊断假设的业务事实。',
        '行动落地后进行一次短周期追踪问卷。',
      ],
    };
  }

  async function handleRunExpertCouncil() {
    setBusy(true);
    setError('');
    try {
      await Promise.all([
        loadOrganizationDashboard(),
        loadDiagnosisReportsWorkspace(),
        loadSurveysOS(),
      ]);
      const result = buildExpertCouncilResult();
      setExpertCouncilResult(result);
      if (selectedProjectId) {
        const saved = await api.post<ExpertCouncilSession>(
          `/projects/${selectedProjectId}/expert-council/sessions`,
          {
            input_snapshot: {
              project: currentProject,
              surveys: surveys.length,
              feedback_clusters: feedbackClusters.length,
              diagnosis_reports: diagnosisReports.length,
            },
            output: result,
            confidence: result.confidence,
            risk_level: result.riskLevel,
            status: 'draft',
          },
        );
        setExpertCouncilSessions((items) => [saved, ...items]);
      }
      setNotice('AI专家诊断会已生成当前项目的共识草案');
    } catch (err) {
      setError(err instanceof Error ? err.message : '运行AI专家诊断会失败');
    } finally {
      setBusy(false);
    }
  }

  function requireProject(children: ReactNode) {
    if (!selectedProjectId) {
      return (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 p-8 text-center">
          <p className="text-base font-bold text-slate-950">
            当前还没有选择项目
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            请先前往项目中心创建或选择一个诊断项目。项目会隔离保存诊断维度、问卷、反馈、报告和看板数据。
          </p>
          <Button className="mt-4" onClick={() => goModule('projectWorkspace')}>
            <ArrowRight size={16} />
            前往项目中心
          </Button>
        </div>
      );
    }
    return children;
  }

  function renderCheckboxGroup(
    options: string[],
    values: string[],
    onChange: (next: string[]) => void,
  ) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              values.includes(option)
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            onClick={() => onChange(toggleValue(values, option))}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  function renderGlobalTopNav() {
    const navButton = (module: Module, label: string) => (
      <button
        key={`${module}-${label}`}
        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          activeModule === module
            ? 'bg-sky-600 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        }`}
        onClick={() => goModule(module)}
      >
        {label}
      </button>
    );
    const navGroup = (label: string, children: ReactNode) => (
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
        <span className="px-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className="flex flex-wrap gap-1">{children}</div>
      </div>
    );
    return (
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => goModule('home')}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white">
              <Activity size={20} />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950">
                组织发展诊断平台
              </span>
              <span className="block text-xs text-slate-500">
                组织发展诊断平台
              </span>
            </span>
          </button>
          <nav className="-mx-1 flex max-w-full flex-wrap gap-2 overflow-x-auto px-1">
            {navButton('home', '首页')}
            {isHrUser ? (
              <>
                {navGroup(
                  '项目中心',
                  <>
                    {navButton('projectWorkspace', '项目中心')}
                  </>,
                )}
                {navGroup(
                  '诊断设计',
                  <>
                    {navButton('organizationDiagnosis', '诊断目标')}
                    {navButton('diagnosis', '诊断假设与维度')}
                    {navButton('talentOverview', '人才标准与画像')}
                  </>,
                )}
                {navGroup(
                  '证据收集',
                  <>
                    {navButton('review360', '问卷生成')}
                    {navButton('surveyCenter', '问卷中心')}
                    {navButton('responseTracking', '360评审')}
                    {navButton('feedback', '员工反馈')}
                  </>,
                )}
                {navButton('expertCouncil', 'AI专家诊断会')}
                {navButton('orgDashboard', '数据洞察')}
                {navButton('diagnosisReports', '报告与行动')}
                {navButton('admin', '设置')}
              </>
            ) : null}
            {currentUser?.role === 'employee' ? (
              <>
                {navButton('myTasks', '我的任务')}
                {navButton('surveys', '问卷填写')}
                {navButton('my360Feedback', '360反馈')}
                {navButton('organizationFeedback', '员工反馈')}
                {navButton('myCapabilityProfile', '能力画像')}
                {navButton('myGrowthReport', '成长报告')}
              </>
            ) : null}
            {!currentUser ? navButton('login', '登录') : null}
          </nav>
          <nav className="hidden">
            {!currentUser ? navButton('home', '组织咨询首页') : null}
            {currentUser?.role === 'admin' ? (
              <>
                {navButton('executiveDashboard', '管理总览')}
                {navButton('organizationDiagnosis', '组织诊断')}
                {navButton('talentOverview', '胜任力模型')}
                {navButton('reportsOS', '报告')}
              </>
            ) : null}
            {isHrUser ? (
              <>
                {navButton('projectWorkspace', '项目中心')}
                {navButton('organizationDiagnosis', '组织诊断')}
                {navButton('talentOverview', '胜任力模型')}
                {navButton('review360', '问卷生成')}
                {navButton('surveyCenter', '问卷中心')}
                {navButton('responseTracking', '360评审')}
                {navButton('dashboard', '数据看板')}
                {navButton('reportsOS', '报告')}
              </>
            ) : null}
            {currentUser?.role === 'employee' ? (
              <>
                {navButton('myTasks', '我的任务')}
                {navButton('surveys', '问卷填写')}
                {navButton('my360Feedback', '360反馈')}
                {navButton('myCapabilityProfile', '能力画像')}
                {navButton('organizationFeedback', '员工反馈')}
                {navButton('myGrowthReport', '成长报告')}
              </>
            ) : null}
            {!currentUser ? navButton('login', '登录') : null}
          </nav>
          {currentUser ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {currentUser.role === 'admin' ? '管理员' : '员工'} ·{' '}
                {currentUser.username}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderGlobalTopNavClean() {
    const navButton = (module: Module, label: string) => (
      <button
        key={`${module}-${label}`}
        className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          activeModule === module
            ? 'bg-sky-600 text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        }`}
        onClick={() => goModule(module)}
      >
        {label}
      </button>
    );
    const navGroup = (label: string, children: ReactNode) => (
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
        <span className="px-2 text-[11px] font-black uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className="flex flex-wrap gap-1">{children}</div>
      </div>
    );
    return (
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => goModule('home')}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-950 text-white">
              <Activity size={20} />
            </span>
            <span>
              <span className="block text-sm font-black text-slate-950">
                组织发展诊断平台
              </span>
              <span className="block text-xs text-slate-500">
                AI 组织诊断与行动共识平台
              </span>
            </span>
          </button>
          <nav className="-mx-1 flex max-w-full flex-wrap gap-2 overflow-x-auto px-1">
            {navButton('home', '首页')}
            {isHrUser ? (
              <>
                {navGroup(
                  '项目中心',
                  <>
                    {navButton('projectWorkspace', '项目列表')}
                  </>,
                )}
                {navGroup(
                  '诊断设计',
                  <>
                    {navButton('organizationDiagnosis', '组织能力维度')}
                    {navButton('diagnosis', '诊断假设')}
                    {navButton('talentOverview', '胜任力与画像')}
                  </>,
                )}
                {navGroup(
                  '证据收集',
                  <>
                    {navButton('review360', '问卷生成')}
                    {navButton('surveyCenter', '问卷中心')}
                    {navButton('responseTracking', '360评审')}
                    {navButton('feedback', '员工反馈')}
                  </>,
                )}
                {navButton('expertCouncil', 'AI专家诊断会')}
                {navButton('orgDashboard', '数据洞察')}
                {navButton('diagnosisReports', '报告与行动')}
                {navButton('admin', '设置')}
              </>
            ) : null}
            {currentUser?.role === 'employee' ? (
              <>
                {navButton('myTasks', '我的任务')}
                {navButton('surveys', '问卷填写')}
                {navButton('my360Feedback', '360评审')}
                {navButton('organizationFeedback', '员工反馈')}
                {navButton('myCapabilityProfile', '能力画像')}
                {navButton('myGrowthReport', '成长报告')}
              </>
            ) : null}
            {!currentUser ? navButton('login', '登录') : null}
          </nav>
          {currentUser ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {currentUser.role === 'admin' ? '管理员' : '员工'} ·{' '}
                {currentUser.username}
              </span>
              <Button variant="secondary" onClick={handleLogout}>
                退出登录
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderGlobalHeader(title: string) {
    return (
      <>
        {renderGlobalTopNavClean()}
        <header className="border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold text-sky-700">
              组织发展诊断平台
            </p>
            <h1 className="text-2xl font-black text-slate-950">{title}</h1>
          </div>
        </header>
      </>
    );
  }

  function renderStatus() {
    return (
      <>
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <span>{notice}</span>
            <button className="text-emerald-900" onClick={() => setNotice('')}>
              关闭
            </button>
          </div>
        ) : null}
        {busy ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
            处理中...
          </div>
        ) : null}
      </>
    );
  }

  function renderOSPage(title: string, children: ReactNode) {
    return (
      <div className={pageShellClass}>
        {renderGlobalHeader(title)}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          {renderStatus()}
          {children}
        </main>
      </div>
    );
  }

  function renderProjectSelector() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <select
          className={inputClass}
          value={projectId ?? ''}
          onChange={(event) =>
            setProjectId(event.target.value ? Number(event.target.value) : null)
          }
        >
          <option value="">未选择项目</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function miniMetric(label: string, value: ReactNode, hint?: string) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="mt-2 text-2xl font-black text-slate-950">{value}</div>
        {hint ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }

  function renderExecutiveDashboardPage() {
    const dashboardData = executiveDashboard;
    return renderOSPage(
      '数据洞察总览',
      <>
        <Panel
          title="AI 原生组织与人才诊断系统"
          eyebrow="管理员视图"
          actions={
            <>
              {renderProjectSelector()}
            <Button variant="secondary" onClick={addAndPersistOrgDiagnosisDimension}>
                <Plus size={16} />
                新增维度
              </Button>
              <Button
                variant="secondary"
                onClick={restoreDefaultOrgDiagnosisDimensions}
              >
                恢复默认八大维度
              </Button>
              <Button onClick={handleSaveOrgDiagnosis} disabled={busy}>
                <Save size={16} />
                保存诊断
              </Button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            {miniMetric(
              '组织成熟度',
              dashboardData?.organization_maturity ?? 'L2 AI 流程增强型',
              dashboardData?.sample
                ? 'Sample：暂无完整诊断数据'
                : '基于组织诊断结果',
            )}
            {miniMetric(
              '组织健康度',
              `${dashboardData?.organization_health ?? 68} / 100`,
            )}
            {miniMetric(
              'AI-native 准备度',
              `${dashboardData?.ai_native_readiness ?? 52} / 100`,
            )}
          </div>
        </Panel>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="关键风险" eyebrow="决策信号">
            <div className="grid gap-3">
              {(
                dashboardData?.key_risks ?? [
                  'AI 使用停留在个人工具层',
                  '缺少人机任务分工',
                  '关键人才被基础事务消耗',
                  '缺少 AI 治理机制',
                ]
              )
                .slice(0, 6)
                .map((risk) => (
                  <div
                    key={risk}
                    className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800"
                  >
                    {risk}
                  </div>
                ))}
            </div>
          </Panel>
          <Panel title="人才结构概览" eyebrow="Talent Mix">
            <div className="grid gap-2">
              {(
                dashboardData?.talent_distribution ?? [
                  { label: '探索型人才', count: 2, talent_type: 'explorer' },
                  {
                    label: '增长型人才',
                    count: 1,
                    talent_type: 'growth_driver',
                  },
                  {
                    label: '稳定交付型人才',
                    count: 4,
                    talent_type: 'stable_operator',
                  },
                  {
                    label: 'AI 杠杆型人才',
                    count: 1,
                    talent_type: 'ai_leverager',
                  },
                ]
              ).map((item) => (
                <div
                  key={item.talent_type}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {item.label}
                  </span>
                  <span className="text-sm font-black text-slate-950">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <Panel title="30/60/90 天行动建议" eyebrow="CEO Action Plan">
          <div className="grid gap-3 md:grid-cols-3">
            {(
              dashboardData?.action_plan ?? [
                { period: '30 天', action: '完成组织诊断和任务盘点' },
                { period: '60 天', action: '建立 2-3 个核心 AI 工作流' },
                { period: '90 天', action: '形成组织学习飞轮和人才分工机制' },
              ]
            ).map((item) => (
              <div
                key={item.period}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-lg font-black text-sky-700">{item.period}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {item.action}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </>,
    );
  }

  function renderProjectWorkspacePage() {
    return renderOSPage('项目中心', renderProjectPage());
    const steps = [
      '项目设置',
      '组织诊断',
      '人才模型',
      '问卷调研及回收',
      '360 Review',
      '诊断看板',
      '报告生成',
    ];
    return renderOSPage(
      '项目中心',
      <>
        <Panel
          title="项目列表"
          eyebrow="项目工作台"
          actions={
            <Button onClick={() => goModule('projectWorkspace')}>
              <Plus size={16} />
              创建项目
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">项目名称</th>
                  <th className="px-3 py-2">项目类型</th>
                  <th className="px-3 py-2">状态</th>
                  <th className="px-3 py-2">开始时间</th>
                  <th className="px-3 py-2">结束时间</th>
                  <th className="px-3 py-2">问卷回收率</th>
                  <th className="px-3 py-2">报告</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {project.name}
                    </td>
                    <td className="px-3 py-3">{project.project_type}</td>
                    <td className="px-3 py-3">
                      {displayStatus(project.status)}
                    </td>
                    <td className="px-3 py-3">{project.start_date || '-'}</td>
                    <td className="px-3 py-3">{project.end_date || '-'}</td>
                    <td className="px-3 py-3">
                      {surveys[0]?.completion_rate ?? 0}%
                    </td>
                    <td className="px-3 py-3">
                      {osReports.length ? '已生成' : '未生成'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="项目详情链路" eyebrow="项目流程">
          <div className="grid gap-3 md:grid-cols-7">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-center"
              >
                <p className="text-xs font-black text-sky-700">{index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </>,
    );
  }

  function renderCreateProjectPage() {
    return renderOSPage('项目中心', renderProjectPage());
    return renderOSPage(
      '创建项目',
      <Panel title="创建 / 编辑项目" eyebrow="管理员配置">
        <form className="grid gap-4" onSubmit={handleProjectSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="项目名称">
              <input
                className={inputClass}
                value={projectForm.name}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, name: e.target.value })
                }
                required
              />
            </Field>
            <Field label="项目类型">
              <select
                className={inputClass}
                value={projectForm.project_type}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    project_type: e.target.value as Project['project_type'],
                  })
                }
              >
                <option value="combined">combined</option>
                <option value="org_diagnosis">org_diagnosis</option>
                <option value="review_360">review_360</option>
              </select>
            </Field>
          </div>
          <Field label="描述">
            <textarea
              className={textareaClass}
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({
                  ...projectForm,
                  description: e.target.value,
                  purpose: e.target.value,
                })
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="诊断范围">
              <input
                className={inputClass}
                value={projectForm.target_scope}
                onChange={(e) =>
                  setProjectForm({
                    ...projectForm,
                    target_scope: e.target.value,
                    scope: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="开始时间">
              <input
                className={inputClass}
                type="date"
                value={projectForm.start_date}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, start_date: e.target.value })
                }
              />
            </Field>
            <Field label="结束时间">
              <input
                className={inputClass}
                type="date"
                value={projectForm.end_date}
                onChange={(e) =>
                  setProjectForm({ ...projectForm, end_date: e.target.value })
                }
              />
            </Field>
          </div>
          <Button disabled={busy}>
            <Save size={16} />
            保存项目
          </Button>
        </form>
      </Panel>,
    );
  }

  function renderOrganizationDiagnosisOSPage() {
    return renderOSPage(
      '组织能力诊断',
      <>
        <Panel
          title="八大组织能力诊断"
          eyebrow="组织能力维度"
          actions={
            <>
              {renderProjectSelector()}
              <Button
                variant="secondary"
                onClick={addAndPersistOrgDiagnosisDimension}
                disabled={busy || !selectedProjectId}
              >
                <Plus size={16} />
                新增组织能力维度
              </Button>
              <Button
                variant="secondary"
                onClick={restoreDefaultOrgDiagnosisDimensions}
                disabled={busy || !selectedProjectId}
              >
                恢复默认八大维度
              </Button>
              <Button
                onClick={handleSaveOrgDiagnosis}
                disabled={busy || !selectedProjectId}
              >
                <Save size={16} />
                保存维度
              </Button>
            </>
          }
        >
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {miniMetric(
              '成熟度',
              orgDiagnosisResult?.maturity_level ?? 'L2 AI 流程增强型',
            )}
            {miniMetric(
              '总分',
              `${orgDiagnosisResult?.total_score ?? 2.6} / 5`,
            )}
            {miniMetric(
              '数据状态',
              orgDiagnosisResult?.sample ? '样例数据' : '真实提交',
            )}
          </div>
          {selectedProjectId ? (
          <>
          <div className="grid gap-4">
            {orgDiagnosisQuestions.map((dimension, dimensionIndex) => (
              <div
                key={dimension.key}
                className={softInsetClass + ' p-4'}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid flex-1 gap-2">
                    <Field label="维度名称">
                      <input
                        className={inputClass}
                        value={dimension.label}
                        onChange={(e) =>
                          updateOrgDiagnosisDimension(dimensionIndex, {
                            label: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="维度说明">
                      <textarea
                        className={textareaClass}
                        value={dimension.description}
                        onChange={(e) =>
                          updateOrgDiagnosisDimension(dimensionIndex, {
                            description: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="grid gap-2">
                    <input
                      className={`${inputClass} w-24`}
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={
                        dimension.score ??
                        orgDiagnosisResult?.dimension_scores?.[dimension.key] ??
                        3
                      }
                      onChange={(e) =>
                        updateOrgDiagnosisDimension(dimensionIndex, {
                          score: Number(e.target.value),
                        })
                      }
                    />
                    <Button
                      variant="danger"
                      onClick={() => deleteAndPersistOrgDiagnosisDimension(dimensionIndex)}
                    >
                      <Trash2 size={16} />
                      删除
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field label="说明">
                    <textarea
                      className={textareaClass}
                      value={dimension.comments ?? ''}
                      onChange={(e) =>
                        updateOrgDiagnosisDimension(dimensionIndex, {
                          comments: e.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="观察重点">
                    <textarea
                      className={textareaClass}
                      value={dimension.evidence ?? ''}
                      onChange={(e) =>
                        updateOrgDiagnosisDimension(dimensionIndex, {
                          evidence: e.target.value,
                        })
                      }
                    />
                  </Field>
                </div>
                <Field className="mt-3 block" label="推荐问题方向">
                  <textarea
                    className={textareaClass}
                    value={dimension.questions[0]?.text ?? ''}
                    onChange={(e) =>
                      updateOrgDiagnosisQuestion(dimensionIndex, 0, e.target.value)
                    }
                    placeholder="例如：围绕该维度设计可观察、可回答、可用于后续数据洞察的问题。"
                  />
                </Field>
                <div className="mt-3 grid gap-3">
                  {dimension.questions.map((question, questionIndex) => (
                    <div key={question.key} className="rounded-lg bg-white p-3">
                      <input
                        className={inputClass}
                        value={question.text}
                        onChange={(e) =>
                          updateOrgDiagnosisQuestion(
                            dimensionIndex,
                            questionIndex,
                            e.target.value,
                          )
                        }
                      />
                      {currentUser?.role === 'employee' || isHrUser ? (
                        <div className="mt-2 grid gap-2 md:grid-cols-[140px_1fr]">
                          <select
                            className={inputClass}
                            value={orgDiagnosisScores[question.key] ?? 3}
                            onChange={(e) =>
                              setOrgDiagnosisScores({
                                ...orgDiagnosisScores,
                                [question.key]: Number(e.target.value),
                              })
                            }
                          >
                            {[1, 2, 3, 4, 5].map((score) => (
                              <option key={score} value={score}>
                                {score} 分
                              </option>
                            ))}
                          </select>
                          <input
                            className={inputClass}
                            placeholder="请补充具体观察或说明"
                            value={orgDiagnosisComments[question.key] ?? ''}
                            onChange={(e) =>
                              setOrgDiagnosisComments({
                                ...orgDiagnosisComments,
                                [question.key]: e.target.value,
                              })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {currentUser?.role === 'employee' || isHrUser ? (
            <Button className="mt-4" onClick={handleSubmitOrgDiagnosis}>
              <Send size={16} />
              提交组织诊断
            </Button>
          ) : null}
          </>
          ) : (
            requireProject(null)
          )}
        </Panel>
      </>,
    );
  }

  function renderTalentOverviewPage() {
    const distribution = executiveDashboard?.talent_distribution ?? [];
    return renderOSPage(
      '人才画像',
      <Panel
        title={currentUser?.role === 'admin' ? '人才结构概览' : '员工能力画像'}
        eyebrow="胜任力模型"
        actions={
          isHrUser ? (
            <Button onClick={handleGenerateTalentProfilesOS}>
              <Sparkles size={16} />
              生成画像
            </Button>
          ) : null
        }
      >
        {currentUser?.role === 'admin' ? (
          <div className="grid gap-3 md:grid-cols-4">
            {distribution.map((item) => miniMetric(item.label, item.count))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {talentProfiles.map((profile) => (
              <button
                type="button"
                key={profile.id ?? profile.user_id ?? profile.talent_type}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-sky-300 hover:bg-sky-50"
                onClick={() =>
                  setSelectedTalentProfileId(profile.id ?? profile.user_id)
                }
              >
                <p className="text-sm font-black text-slate-950">
                  {profile.username ?? `User ${profile.user_id}`}
                </p>
                <p className="mt-1 text-sm font-semibold text-sky-700">
                  {profile.talent_type_label ?? profile.talent_type}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {profile.native_strength}
                </p>
              </button>
            ))}
          </div>
        )}
        {selectedTalentProfile ? (
          <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4">
            <p className="text-sm font-black text-slate-950">
              {selectedTalentProfile.username ??
                `User ${selectedTalentProfile.user_id}`}{' '}
              · {selectedTalentProfile.talent_type_label}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {Object.entries(selectedTalentProfile.dimension_scores).map(
                ([key, value]) => (
                  <div key={key} className="rounded-lg bg-white p-3 text-sm">
                    <span className="font-semibold text-slate-600">{key}</span>
                    <span className="ml-2 font-black text-sky-700">
                      {value}
                    </span>
                  </div>
                ),
              )}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {selectedTalentProfile.growth_suggestion}
            </p>
          </div>
        ) : null}
      </Panel>,
    );
  }

  function renderSurveyCenterPage() {
    return renderOSPage(
      '问卷中心',
      <Panel
        title="诊断问卷生成与管理"
        eyebrow="证据收集方案"
        actions={
          <>
            {renderProjectSelector()}
            {isHrUser ? (
              <Button onClick={handleGenerateProjectSurvey} disabled={busy || !selectedProjectId}>
                <Sparkles size={16} />
                生成综合问卷
              </Button>
            ) : null}
          </>
        }
        >
        <div className="mb-4 grid gap-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">
            问卷不是独立功能，而是证据收集工具。
          </p>
          <p>
            系统会把已确认的诊断假设、组织能力维度和胜任力模型转化为可填写的问题，用来支持后续的数据洞察、AI 专家诊断会、诊断报告和行动计划。
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-950">组织诊断题</p>
              <p>验证组织问题和组织能力维度。</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-950">胜任力题</p>
              <p>验证能力标准和行为表现。</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-950">360 评审题</p>
              <p>收集多视角反馈。</p>
            </div>
            <div className="rounded-xl bg-white/80 p-3">
              <p className="font-bold text-slate-950">开放反馈题</p>
              <p>收集真实描述和补充信息。</p>
            </div>
          </div>
          <p className="rounded-xl bg-white/80 p-3 text-sky-900">
            推荐流程：说明区 → 选择问题来源 → 选择目标对象 → 选择问卷长度 → 生成问卷 → 预览与编辑 → 保存到问卷中心。
          </p>
        </div>
        {isHrUser ? (
          <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
            <Field label="问题来源">
              <select
                className={inputClass}
                value={modelQuestionForm.source_mode}
                onChange={(event) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    source_mode: event.target.value as
                      | 'org_diagnosis'
                      | 'talent_model'
                      | 'combined',
                  })
                }
              >
                <option value="org_diagnosis">仅组织诊断</option>
                <option value="talent_model">仅胜任力模型</option>
                <option value="combined">综合证据：组织诊断 + 胜任力模型 + 360 评审 + 开放反馈</option>
              </select>
            </Field>
            <Field label="胜任力模型">
              <select
                className={inputClass}
                value={modelQuestionForm.model_id}
                onChange={(event) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    model_id: event.target.value,
                  })
                }
              >
                <option value="">使用全部模型</option>
                {talentModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">
              系统会基于已确认的诊断假设、组织能力维度和胜任力模型生成综合问卷；保存后进入问卷中心，并保留每道题的问题来源和题型。
            </div>
          </div>
        ) : null}
        <div className="grid gap-3">
          {surveys.length ? (
            surveys.map((survey) => (
              <button
                type="button"
                key={survey.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 text-left transition ${
                  selectedSurveyId === survey.id
                    ? 'border-sky-300 bg-sky-50'
                    : 'border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50'
                }`}
                onClick={() => void loadSurveyDetail(survey.id)}
              >
                <div>
                  <p className="font-bold text-slate-950">{survey.title}</p>
                  <p className="text-sm text-slate-500">
                    {surveyTypeLabels[survey.survey_type] || survey.survey_type} ·{' '}
                    {displayStatus(survey.status)} ·{' '}
                    {survey.question_count ?? 0} 题
                  </p>
                </div>
                <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-sky-700">
                  {survey.completion_rate ?? 0}% 完成
                </span>
              </button>
            ))
          ) : (
            <EmptyState
              title="暂无问卷"
              body="当前项目还没有保存问卷。请先在问卷生成中选择证据来源并生成综合问卷。"
            />
          )}
        </div>
        {selectedSurveyDetail ? (
          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-black text-slate-950">
                  {selectedSurveyDetail.title}
                </p>
                <p className="text-sm text-slate-500">
                  来源：{selectedSurveyDetail.source_types.map((source) => sourceTypeLabels[source] || source).join('、') || '-'}
                </p>
              </div>
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                {selectedSurveyDetail.questions.length} 题
              </span>
            </div>
            <div className="mt-4 grid gap-3">
              {selectedSurveyDetail.questions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-white px-2 py-1 font-bold text-sky-700">
                      {sourceTypeLabels[question.source_type] || question.source_type}
                    </span>
                    <span className="rounded-lg bg-white px-2 py-1 font-bold text-slate-700">
                      {questionTypeLabels[question.question_type] || question.question_type}
                    </span>
                    <span className="rounded-lg bg-white px-2 py-1 text-slate-600">
                      {question.dimension_label || question.dimension_key}
                    </span>
                  </div>
                  <p className="mt-2 leading-6 text-slate-800">
                    {question.question_text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Panel>,
    );
  }

  function renderResponseTrackingPage() {
    return renderOSPage(
      '回收进度',
      <Panel title="问卷回收进度" eyebrow="填写追踪">
        <div className="grid gap-3 md:grid-cols-4">
          {surveys.map((survey) =>
            miniMetric(
              survey.title,
              `${survey.completion_rate ?? 0}%`,
              `已填写 ${survey.submitted_count ?? 0}，未填写 ${survey.pending_count ?? 0}`,
            ),
          )}
        </div>
      </Panel>,
    );
  }

  function renderExpertCouncilPage() {
    const result = expertCouncilResult ?? buildExpertCouncilResult();
    const experts = [
      ['组织发展专家', '关注结构、协作机制、决策链路和组织能力瓶颈。'],
      ['人才与胜任力专家', '关注人才标准、管理者能力、人才画像和发展建议。'],
      ['业务负责人视角专家', '关注诊断结论是否能解释真实业务卡点。'],
      ['员工体验专家', '关注员工是否愿意真实表达，以及流程是否可信。'],
      ['数据分析专家', '关注样本覆盖、证据强弱、统计偏差和缺口。'],
      ['AI转型专家', '关注AI工作流、治理边界和人机分工成熟度。'],
    ];
    return renderOSPage(
      'AI 专家诊断会',
      requireProject(
        <div className="grid gap-5">
          <Panel
            title="AI 专家诊断会 MVP"
            eyebrow={`项目 ${result.project_id ?? '-'}`}
            actions={
              <>
                {renderProjectSelector()}
                <Button onClick={handleRunExpertCouncil} disabled={busy}>
                  <BrainCircuit size={16} />
                  运行诊断会
                </Button>
              </>
            }
          >
            <p className="text-sm leading-6 text-slate-600">
              诊断会把当前项目的诊断假设、组织诊断维度、人才模型、问卷统计、360数据、员工反馈、报告草案放到同一个讨论桌上。
              当前版本先输出结构化共识草案；后续会把每次诊断会保存到当前项目下，并接入真实 AI 多专家生成。
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {experts.map(([name, body]) => (
                <div
                  key={name}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="font-black text-slate-950">{name}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="最终共识与关键分歧" eyebrow="Consensus">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">
                    关键组织问题 Top 3
                  </p>
                  <div className="mt-2 grid gap-2">
                    {result.topIssues.map((issue, index) => (
                      <div
                        key={`${issue}-${index}`}
                        className="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6"
                      >
                        <span className="font-black text-sky-700">
                          {index + 1}.
                        </span>{' '}
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">专家分歧</p>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                    {result.disagreements.map((item) => (
                      <li
                        key={item}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-3"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>

            <Panel title="证据强度" eyebrow="证据评估">
              <div className="grid gap-3">
                {miniMetric('置信度', `${result.confidence}%`)}
                <div>
                  <p className="text-sm font-black text-slate-900">支持证据</p>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                    {result.supportEvidence.map((item) => (
                      <li key={item} className="rounded-lg bg-emerald-50 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">反对证据</p>
                  <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
                    {result.opposingEvidence.map((item) => (
                      <li key={item} className="rounded-lg bg-rose-50 p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="推荐行动与待补充数据" eyebrow="Next">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-black text-slate-900">推荐行动</p>
                <div className="mt-2 grid gap-2">
                  {result.recommendedActions.map((item) => (
                    <div key={item} className="rounded-lg bg-sky-50 p-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">
                  还需要补充收集的数据
                </p>
                <div className="mt-2 grid gap-2">
                  {result.missingData.map((item) => (
                    <div key={item} className="rounded-lg bg-slate-50 p-3 text-sm">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>,
      ),
    );
  }

  function renderExpertCouncilPageClean() {
    const result = expertCouncilResult ?? buildExpertCouncilResult();
    const currentRole = currentUser?.role ?? 'employee';
    const isAdmin = currentRole === 'admin';
    const feedbackList = organizationFeedbackItems.length
      ? organizationFeedbackItems
      : isAdmin
        ? adminFeedback
        : myFeedback;
    const openFeedbackCount =
      feedbackClusters.length ||
      organizationFeedbackItems.length ||
      adminFeedback.length ||
      myFeedback.length;
    const evidenceWeak =
      (surveys.length || openFeedbackCount || diagnosisReports.length) === 0;
    const experts = [
      ['组织发展专家', '判断结构、协同、决策链路和组织能力瓶颈。'],
      ['组织能力专家', '评估战略清晰度、权责边界、管理沟通和变革适应力。'],
      ['人才与胜任力专家', '连接胜任力模型、人才画像和管理者行为标准。'],
      ['业务视角专家', '检验诊断结论是否能解释真实业务卡点。'],
      ['员工体验专家', '关注员工是否愿意真实表达，以及反馈过程是否可信。'],
      ['数据分析专家', '评估样本覆盖、证据强弱、统计偏差和缺口。'],
      ['AI 转型专家', '关注 AI 工作流、治理边界和人机协作成熟度。'],
    ];
    const inputs = [
      ['项目目标', currentProject?.purpose || currentProject?.description || '未填写'],
      ['已确认诊断假设', `${diagnosisList.filter((item) => item.status === 'confirmed').length} 条`],
      ['组织能力维度', `${orgDiagnosisQuestions.length} 个`],
      ['胜任力模型', `${talentModels.length} 个`],
      ['问卷统计', `${surveys.length} 份问卷`],
      ['360 反馈', `${relationships.length} 条关系数据`],
      ['员工开放反馈', `${feedbackClusters.length || feedbackList.length} 条/组`],
      ['人才画像结果', selectedTalentProfile ? '已有画像结果' : '暂无画像结果'],
    ];
    const flow = [
      '每位专家独立分析当前项目数据',
      '提出支持观点和反对观点',
      '围绕关键分歧进行辩论',
      '数据分析专家判断证据强度',
      '系统生成共识结论和保留分歧',
      '输出行动建议与待补充数据',
    ];

    return renderOSPage(
      'AI 专家诊断会',
      requireProject(
        <div className="grid gap-5">
          <Panel
            title="AI 专家诊断会"
            eyebrow="组织诊断共识生成"
            actions={
              <>
                {renderProjectSelector()}
                <Button onClick={handleRunExpertCouncil} disabled={busy}>
                  <BrainCircuit size={16} />
                  生成诊断会结果
                </Button>
              </>
            }
          >
            <p className="text-sm leading-6 text-slate-600">
              AI 专家诊断会会把项目目标、诊断假设、组织能力维度、胜任力模型、问卷统计、360 反馈、员工开放反馈和人才画像放到同一张讨论桌上，形成可追溯的共识结论。当前版本先保存结构化结果，后续统一通过 AI Provider 接入真实模型。
            </p>
            {evidenceWeak ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                当前项目证据不足，请先完成问卷收集、360 评审或员工反馈，再运行诊断会。你仍可以生成一份结构化草稿，用于确认需要补充的数据。
              </div>
            ) : null}
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="专家角色">
              <div className="grid gap-3 md:grid-cols-2">
                {experts.map(([name, body]) => (
                  <div key={name} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{name}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="输入证据来源">
              <div className="grid gap-2">
                {inputs.map(([name, value]) => (
                  <div key={name} className="rounded-lg bg-slate-50 p-3 text-sm">
                    <span className="font-bold text-slate-900">{name}</span>
                    <span className="ml-2 text-slate-600">{value}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="诊断会流程">
            <div className="grid gap-3 md:grid-cols-3">
              {flow.map((step, index) => (
                <div key={step} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                  <span className="mb-2 inline-flex size-7 items-center justify-center rounded-full bg-sky-100 font-black text-sky-700">
                    {index + 1}
                  </span>
                  <p className="font-semibold text-slate-800">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm leading-6 text-slate-700">
              最终输出包括：关键组织问题 Top 3、支持证据、反对证据、专家分歧、置信度、风险等级、建议行动，以及还需要补充收集的数据。
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel title="共识结论">
              <div className="grid gap-4">
                <div>
                  <p className="text-sm font-black text-slate-900">关键组织问题 Top 3</p>
                  <div className="mt-2 grid gap-2">
                    {result.topIssues.map((issue, index) => (
                      <div key={`${issue}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6">
                        <span className="font-black text-sky-700">{index + 1}. </span>
                        {issue}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">专家分歧</p>
                  <div className="mt-2 grid gap-2">
                    {result.disagreements.map((item) => (
                      <div key={item} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="证据强度">
              <div className="grid gap-3">
                {miniMetric('置信度', `${result.confidence}%`)}
                {miniMetric('风险等级', result.riskLevel === 'high' ? '高' : result.riskLevel === 'medium' ? '中' : '低')}
                <div>
                  <p className="text-sm font-black text-slate-900">支持证据</p>
                  <div className="mt-2 grid gap-2">
                    {result.supportEvidence.map((item) => (
                      <div key={item} className="rounded-lg bg-emerald-50 p-3 text-sm">{item}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">反对证据</p>
                  <div className="mt-2 grid gap-2">
                    {result.opposingEvidence.map((item) => (
                      <div key={item} className="rounded-lg bg-rose-50 p-3 text-sm">{item}</div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="行动建议与待补充数据">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-black text-slate-900">建议行动</p>
                <div className="mt-2 grid gap-2">
                  {result.recommendedActions.map((item) => (
                    <div key={item} className="rounded-lg bg-sky-50 p-3 text-sm">{item}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">还需要补充收集的数据</p>
                <div className="mt-2 grid gap-2">
                  {result.missingData.map((item) => (
                    <div key={item} className="rounded-lg bg-slate-50 p-3 text-sm">{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>,
      ),
    );
  }

  function renderReportsOSPage() {
    const reportType =
      currentUser?.role === 'admin'
        ? 'boss_report'
        : currentUser?.role === 'employee'
          ? 'employee_report'
          : 'hr_report';
    return renderOSPage(
      currentUser?.role === 'employee' ? '我的成长报告' : '报告与行动',
      <Panel
        title="报告"
        eyebrow="规则版诊断草稿"
        actions={
          <Button onClick={() => handleGenerateOSReport(reportType)}>
            <FileText size={16} />
            生成报告
          </Button>
        }
      >
        <div className="grid gap-4">
          {osReports.map((report) => (
            <article
              key={report.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-slate-950">{report.title}</p>
                  <p className="text-sm text-slate-500">
                    {displayReportType(report.report_type)}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => navigator.clipboard?.writeText(report.content)}
                >
                  复制文本
                </Button>
              </div>
              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-sm leading-6 text-slate-700">
                {report.content}
              </pre>
            </article>
          ))}
          {!osReports.length ? (
            <EmptyState
              title="暂无报告"
              body="点击生成报告，系统会先生成规则版 MVP 报告。"
            />
          ) : null}
        </div>
      </Panel>,
    );
  }

  function renderMyTasksPage() {
    return renderOSPage(
      '我的任务',
      <Panel title="我的待办" eyebrow="员工任务">
        <div className="mb-4 rounded-2xl border border-sky-100 bg-sky-50/80 p-4 text-sm leading-6 text-slate-700">
          <p className="font-bold text-slate-950">这些填写用于发现团队层面的协作、沟通和流程问题，不是个人考核。</p>
          <p className="mt-1">
            大多数问卷预计 5-10 分钟完成。数据会汇总用于组织诊断、AI 专家诊断会和行动计划，管理员不会把单条反馈作为个人评价依据。
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {surveyTasks.map((survey) => (
            <div
              key={survey.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-bold text-slate-950">{survey.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {surveyTypeLabels[survey.survey_type] || survey.survey_type} ·{' '}
                {displayStatus(survey.task_status)}
              </p>
              <Button
                className="mt-3"
                variant={
                  survey.task_status === 'submitted' ? 'secondary' : 'primary'
                }
                onClick={() => handleSubmitSurveyTask(survey)}
              >
                {survey.task_status === 'submitted' ? '重新提交' : '填写问卷'}
              </Button>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-slate-950">待完成 360 评审</p>
            <p className="mt-1 text-sm text-slate-500">
              {employeeTasks.filter((task) => task.status === 'pending').length}{' '}
              个待办
            </p>
            <Button className="mt-3" onClick={() => goModule('my360Feedback')}>
              进入 360 评审
            </Button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="font-bold text-slate-950">我的能力画像</p>
            <p className="mt-1 text-sm text-slate-500">
              温和地理解优势、协作方式和成长建议。
            </p>
            <Button
              className="mt-3"
              onClick={() => goModule('myCapabilityProfile')}
            >
              查看画像
            </Button>
          </div>
        </div>
      </Panel>,
    );
  }

  function renderMyCapabilityProfilePage() {
    const profile = myTalentProfile;
    return renderOSPage(
      '我的能力画像',
      <Panel title="我的能力画像" eyebrow="发展导向">
        {profile ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="grid gap-3">
              {Object.entries(profile.dimension_scores).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-semibold text-slate-700">
                    {key}
                  </span>
                  <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-sky-700">
                    {value}
                  </span>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-black text-slate-950">
                {profile.talent_type_label ?? profile.talent_type}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                native strength：{profile.native_strength}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                成长建议：{profile.growth_suggestion}
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-500">
                推荐任务：{profile.best_fit_tasks.join('、')}
              </p>
            </div>
          </div>
        ) : (
          <EmptyState
            title="暂无画像"
            body="系统会先显示规则版能力画像，后续可接入更深入的 AI 总结。"
          />
        )}
      </Panel>,
    );
  }

  function renderOrganizationFeedbackOSPage() {
    return renderOSPage(
      '员工反馈',
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="提交组织反馈" eyebrow="员工声音">
          <form
            className="grid gap-3"
            onSubmit={handleSubmitOrganizationFeedbackOS}
          >
            <Field label="反馈类型">
              <select
                className={inputClass}
                value={organizationFeedbackForm.feedback_type}
                onChange={(e) =>
                  setOrganizationFeedbackForm({
                    ...organizationFeedbackForm,
                    feedback_type: e.target
                      .value as OrganizationFeedback['feedback_type'],
                  })
                }
              >
                {[
                  'process',
                  'management',
                  'ai_tools',
                  'collaboration',
                  'culture',
                  'risk',
                  'other',
                ].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="内容">
              <textarea
                className={textareaClass}
                value={organizationFeedbackForm.content}
                onChange={(e) =>
                  setOrganizationFeedbackForm({
                    ...organizationFeedbackForm,
                    content: e.target.value,
                  })
                }
                required
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={organizationFeedbackForm.is_anonymous}
                onChange={(e) =>
                  setOrganizationFeedbackForm({
                    ...organizationFeedbackForm,
                    is_anonymous: e.target.checked,
                  })
                }
              />
              匿名提交
            </label>
            <Button>
              <Send size={16} />
              提交反馈
            </Button>
          </form>
        </Panel>
        <Panel
          title={currentUser?.role === 'admin' ? '主题汇总' : '反馈记录'}
          eyebrow="Desensitized"
        >
          {organizationFeedbackSummary ? (
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              {organizationFeedbackSummary.theme_distribution.map((item) =>
                miniMetric(item.feedback_type, item.count),
              )}
            </div>
          ) : null}
          <div className="grid gap-3">
            {organizationFeedbackItems.map((item) => (
              <div key={item.id} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-bold text-sky-700">
                  {item.feedback_type} · {item.username ?? '匿名/本人'}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {item.content}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>,
    );
  }

  function renderLoginPage() {
    return (
      <div className={pageShellClass}>
        {renderGlobalTopNavClean()}
        <div className="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-10">
          <div className={softCardClass + ' w-full max-w-md p-6'}>
            <button
              className="mb-5 text-sm font-semibold text-slate-500"
              onClick={() => goModule('home')}
            >
              返回首页
            </button>
            <h1 className="text-2xl font-black text-slate-950">
              登录组织发展诊断平台
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              管理员可查看全员项目、任务进度、回答数据和反馈池；员工只可查看自己的评审任务和反馈记录。
            </p>
            <form className="mt-5 grid gap-4" onSubmit={handleLogin}>
              <Field label="用户名 / 邮箱">
                <input
                  className={inputClass}
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm({ ...loginForm, username: event.target.value })
                  }
                  autoComplete="username"
                />
              </Field>
              <Field label="登录口令">
                <input
                  className={inputClass}
                  type={maskedInputType}
                  value={loginForm.loginCode}
                  onChange={(event) =>
                    setLoginForm({
                      ...loginForm,
                      loginCode: event.target.value,
                    })
                  }
                  autoComplete={`current-${legacyLoginCodeField}`}
                />
              </Field>
              <Button type="submit" disabled={busy}>
                登录
              </Button>
            </form>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              默认演示账号以本地初始化配置为准。生产环境必须覆盖演示登录口令。
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAdminDashboardPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    const stats = [
      ['项目数量', adminDashboard?.project_count ?? 0],
      ['员工数量', adminDashboard?.employee_count ?? 0],
      ['待填写任务', adminDashboard?.pending_tasks ?? 0],
      ['已完成任务', adminDashboard?.submitted_tasks ?? 0],
      ['完成率', `${adminDashboard?.completion_rate ?? 0}%`],
    ];
    return (
      <div className={pageShellClass}>
        {renderGlobalHeader('管理员控制台')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            360
            评审结果用于发展反馈和组织诊断，不直接作为晋升、淘汰、薪酬决定。管理员可用于组织诊断，但不得公开单个评价人的原始内容。
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {stats.map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <Panel title="快捷入口">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => goModule('diagnosis')}>
                诊断假设
              </Button>
              <Button variant="secondary" onClick={() => goModule('talent')}>
                AI人才模型
              </Button>
              <Button variant="secondary" onClick={() => goModule('rules')}>
                诊断规则
              </Button>
              <Button
                variant="secondary"
                onClick={() => goModule('orgDashboard')}
              >
                组织诊断看板
              </Button>
              <Button
                variant="secondary"
                onClick={() => goModule('diagnosisReports')}
              >
                报告生成
              </Button>
              {[
                ['员工管理', 'employees'],
                ['评价关系', 'relationships'],
                ['分析看板', 'analytics'],
                ['报告生成', 'reports'],
              ].map(([label, tab]) => (
                <Button
                  key={label}
                  variant="secondary"
                  onClick={() => {
                    setActiveTab(tab as Tab);
                    goModule('review360');
                  }}
                >
                  {label}
                </Button>
              ))}
              <Button
                variant="secondary"
                onClick={() => goModule('projectWorkspace')}
              >
                项目中心
              </Button>
              <Button variant="secondary" onClick={() => goModule('feedback')}>
                员工反馈池
              </Button>
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel title="创建员工账号">
              <form className="grid gap-3" onSubmit={handleCreateUser}>
                <Field label="用户名">
                  <input
                    className={inputClass}
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({ ...userForm, username: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="初始登录口令">
                  <input
                    className={inputClass}
                    type={maskedInputType}
                    value={userForm.loginCode}
                    onChange={(e) =>
                      setUserForm({ ...userForm, loginCode: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="绑定员工">
                  <select
                    className={inputClass}
                    value={userForm.employee_id}
                    onChange={(e) =>
                      setUserForm({ ...userForm, employee_id: e.target.value })
                    }
                  >
                    <option value="">不绑定员工</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} · {employee.department || '未填部门'}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="角色">
                    <select
                      className={inputClass}
                      value={userForm.role}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          role: e.target.value as User['role'],
                        })
                      }
                    >
                      <option value="employee">员工</option>
                      <option value="admin">组织管理员</option>
                    </select>
                  </Field>
                  <Field label="状态">
                    <select
                      className={inputClass}
                      value={userForm.status}
                      onChange={(e) =>
                        setUserForm({
                          ...userForm,
                          status: e.target.value as 'active' | 'disabled',
                        })
                      }
                    >
                      <option value="active">启用</option>
                      <option value="disabled">停用</option>
                    </select>
                  </Field>
                </div>
                <Button type="submit" disabled={busy}>
                  创建账号
                </Button>
              </form>
            </Panel>

            <Panel title="账号列表">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="py-3">用户名</th>
                      <th>角色</th>
                      <th>绑定员工</th>
                      <th>状态</th>
                      <th>创建时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-slate-100">
                        <td className="py-3 font-semibold">{user.username}</td>
                        <td>{user.role === 'admin' ? '组织管理员' : '员工'}</td>
                        <td>{user.employee_name || user.employee_id || '-'}</td>
                        <td>{displayStatus(user.status)}</td>
                        <td>{user.created_at || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          <Panel
            title="管理员进度看板"
            actions={
              <Button
                onClick={handleGenerateTasks}
                disabled={!projectId || busy}
              >
                生成员工填写任务
              </Button>
            }
          >
            {projectProgress ? (
              <div className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ['任务总数', projectProgress.total],
                    ['已提交', projectProgress.submitted],
                    ['未提交', projectProgress.pending],
                    ['完成率', `${projectProgress.completion_rate}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="mt-1 text-xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 font-bold">按部门</p>
                    {projectProgress.by_department.map((row) => (
                      <p
                        key={row.department}
                        className="rounded-lg border border-slate-200 p-2 text-sm"
                      >
                        {row.department || '未填部门'}：{row.submitted}/
                        {row.total} · {row.completion_rate}%
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 font-bold">按员工</p>
                    {projectProgress.by_employee.map((row) => (
                      <p
                        key={row.employee_id}
                        className="rounded-lg border border-slate-200 p-2 text-sm"
                      >
                        {row.name}：{row.submitted}/{row.total} ·{' '}
                        {row.completion_rate}%
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="暂无任务进度"
                body="选择项目并点击生成员工填写任务后会显示进度。"
              />
            )}
          </Panel>

          <Panel title="所有问卷回答">
            {adminResponses.length ? (
              <div className="grid gap-2">
                {adminResponses.slice(0, 20).map((row, index) => (
                  <div
                    key={`${row.response_id}-${index}`}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-bold">
                      {String(row.reviewer_name)} 评价{' '}
                      {String(row.reviewee_name)} · {String(row.relation_type)}
                    </p>
                    <p className="mt-1 text-slate-600">
                      题目：{String(row.question_text || '-')} · 评分：
                      {String(row.score || '-')}
                    </p>
                    {row.text_feedback ? (
                      <p className="mt-1 text-slate-500">
                        反馈：{String(row.text_feedback)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无回答数据"
                body="员工提交问卷后，管理员可在这里查看回答数据。"
              />
            )}
          </Panel>

        </main>
      </div>
    );
  }

  function renderEmployeeDashboardPage() {
    if (!currentUser) return renderLoginPage();
    const pendingTasks = employeeTasks.filter(
      (task) => task.status !== 'submitted',
    );
    const completedTasks = employeeTasks.filter(
      (task) => task.status === 'submitted',
    );
    const selectedTask =
      employeeTasks.find((task) => task.id === selectedTaskId) ??
      pendingTasks[0] ??
      employeeTasks[0];
    const taskQuestions = employeeTaskQuestionnaire.dimensions.flatMap(
      (dimension) => dimension.questions,
    );
    const totalTasks = employeeTasks.length;
    const completionRate = totalTasks
      ? Math.round((completedTasks.length / totalTasks) * 100)
      : 0;
    return (
      <div className={pageShellClass}>
        {renderGlobalHeader('我的评审任务')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-sm leading-6 text-slate-700">
            <p className="font-bold text-slate-950">欢迎参与本次组织诊断</p>
            <p className="mt-1">
              填写的目的，是帮助团队发现协作、沟通、流程和工具使用中的真实问题。这不是个人考核，也不会直接用于晋升、淘汰或薪酬决定。
            </p>
            <p className="mt-1">
              大多数任务预计 5-10 分钟完成。你的反馈会被汇总到团队层面的洞察中，用于后续诊断报告和改进行动。
            </p>
            <p className="mt-1 font-semibold text-sky-800">
              下一步：选择下方“我的任务卡片”，完成待填写问卷。
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-950">填写进度</p>
                <p className="mt-1 text-xs text-slate-500">
                  已完成 {completedTasks.length} / {totalTasks} 个任务
                </p>
              </div>
              <span className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-black text-sky-700">
                {completionRate}%
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['待完成任务', pendingTasks.length],
              ['已完成任务', completedTasks.length],
              [
                '自评任务',
                employeeTasks.filter((task) => task.relation_type === 'self')
                  .length,
              ],
              [
                '评价他人',
                employeeTasks.filter((task) => task.relation_type !== 'self')
                  .length,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
              >
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="我的任务卡片">
              {employeeTasks.length ? (
                <div className="grid gap-2">
                  {employeeTasks.map((task) => (
                    <button
                      key={task.id}
                      className={`rounded-xl border p-3 text-left transition-colors ${selectedTask?.id === task.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/60'}`}
                      onClick={() => void loadEmployeeTask(task.id)}
                    >
                      <p className="font-bold text-slate-900">
                        {task.project_name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        评价 {task.reviewee_name} · {task.relation_label}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        截止：{task.end_date || '未设置'} ·{' '}
                        {task.status === 'submitted' ? '已完成' : '待填写'}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="暂无评审任务"
                  body="管理员生成员工填写任务后，你会在这里看到自评和他评待办。"
                />
              )}
            </Panel>

            <Panel
              title={
                selectedTask
                  ? `填写问卷：评价 ${selectedTask.reviewee_name}`
                  : '问卷填写'
              }
            >
              {selectedTask && taskQuestions.length ? (
                <form
                  className="grid gap-4"
                  onSubmit={handleSubmitEmployeeTask}
                >
                  {employeeTaskQuestionnaire.dimensions.map((dimension) => (
                    <div
                      key={dimension.id ?? dimension.name}
                      className="grid gap-3"
                    >
                      <h3 className="font-bold text-slate-950">
                        {dimension.name}
                      </h3>
                      {dimension.questions.map((question) => (
                        <div
                          key={question.id ?? question.text}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="font-semibold text-slate-900">
                            {question.text}
                          </p>
                          {question.open_followup ||
                          question.behavior_anchor ? (
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              开放追问：
                              {question.open_followup ||
                                question.behavior_anchor}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-1">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                key={score}
                                type="button"
                                className={`h-9 w-9 rounded-lg text-sm font-bold ${employeeScores[question.id ?? 0] === score ? 'bg-sky-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}
                                onClick={() =>
                                  setEmployeeScores({
                                    ...employeeScores,
                                    [question.id ?? 0]: score,
                                  })
                                }
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="mt-3 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                            value={
                              employeeQuestionFeedbacks[question.id ?? 0] ?? ''
                            }
                            onChange={(event) =>
                              setEmployeeQuestionFeedbacks({
                                ...employeeQuestionFeedbacks,
                                [question.id ?? 0]: event.target.value,
                              })
                            }
                            placeholder="开放文本反馈：请基于具体场景填写"
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  <Field label="总体反馈">
                    <textarea
                      className={textareaClass}
                      value={employeeOverallComment}
                      onChange={(event) =>
                        setEmployeeOverallComment(event.target.value)
                      }
                    />
                  </Field>
                  <Button
                    type="submit"
                    disabled={busy || selectedTask.status === 'submitted'}
                  >
                    {selectedTask.status === 'submitted'
                      ? '已提交'
                      : '提交问卷'}
                  </Button>
                  {selectedTask.status === 'submitted' ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                      感谢你的填写。后续系统会把反馈汇总到团队层面，帮助组织管理员识别共性问题，并形成改进行动。
                    </div>
                  ) : null}
                </form>
              ) : (
                <EmptyState
                  title="请选择任务"
                  body="选择左侧任务后可以填写自评或他评问卷。"
                />
              )}
            </Panel>
          </div>

          <Panel title="我的提交记录">
            {employeeSubmissions.length ? (
              <div className="grid gap-2">
                {employeeSubmissions.map((row) => (
                  <div
                    key={String(row.id)}
                    className="rounded-lg border border-slate-200 p-3 text-sm"
                  >
                    <p className="font-bold">
                      {String(row.project_name)} · 评价{' '}
                      {String(row.reviewee_name)}
                    </p>
                    <p className="text-slate-500">{String(row.submitted_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无提交记录"
                body="提交过的问卷会显示在这里。"
              />
            )}
          </Panel>
        </main>
      </div>
    );
  }

  function renderFeedbackPage() {
    if (!currentUser) return renderLoginPage();
    const isAdmin = isHrUser;
    const feedbackList = isAdmin ? adminFeedback : myFeedback;
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader(isAdmin ? '员工反馈池' : '员工反馈')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            匿名反馈不会在普通员工端展示身份信息。管理员可用于组织诊断，但不得公开单个评价人的原始内容。
          </div>
          {isAdmin ? (
            <Panel
              title="员工声音智能体"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={handleAddDiagnosisHypothesis}
                    disabled={busy}
                  >
                    <Plus size={16} />
                    新增假设
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleLoadFilteredFeedback}
                  >
                    应用筛选
                  </Button>
                  <Button onClick={handleClusterFeedback} disabled={busy}>
                    <Sparkles size={16} />
                    AI 反馈主题聚类
                  </Button>
                </>
              }
            >
              <p className="mb-4 text-sm leading-6 text-slate-600">
                员工声音智能体用于持续收集组织问题、管理建议、流程卡点、AI
                使用问题和文化氛围问题，并用 AI 聚类帮助管理员
                发现重复主题、风险等级和建议行动。
              </p>
              <div className="grid gap-3 md:grid-cols-4">
                <Field label="类型">
                  <select
                    className={inputClass}
                    value={feedbackFilters.category}
                    onChange={(e) =>
                      setFeedbackFilters({
                        ...feedbackFilters,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="">全部</option>
                    {feedbackCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="状态">
                  <select
                    className={inputClass}
                    value={feedbackFilters.status}
                    onChange={(e) =>
                      setFeedbackFilters({
                        ...feedbackFilters,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="">全部</option>
                    {feedbackStatuses.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="匿名">
                  <select
                    className={inputClass}
                    value={feedbackFilters.anonymous}
                    onChange={(e) =>
                      setFeedbackFilters({
                        ...feedbackFilters,
                        anonymous: e.target.value,
                      })
                    }
                  >
                    <option value="">全部</option>
                    <option value="1">匿名</option>
                    <option value="0">实名</option>
                  </select>
                </Field>
                <Field label="优先级">
                  <select
                    className={inputClass}
                    value={feedbackFilters.priority}
                    onChange={(e) =>
                      setFeedbackFilters({
                        ...feedbackFilters,
                        priority: e.target.value,
                      })
                    }
                  >
                    <option value="">全部</option>
                    <option value="low">low</option>
                    <option value="normal">normal</option>
                    <option value="high">high</option>
                  </select>
                </Field>
              </div>
            </Panel>
          ) : null}
          {!isAdmin ? (
            <Panel title="提交员工意见反馈">
              <form className="grid gap-3" onSubmit={handleSubmitFeedback}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="反馈类型">
                    <select
                      className={inputClass}
                      value={feedbackForm.category}
                      onChange={(e) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          category: e.target.value,
                        })
                      }
                    >
                      {feedbackCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="优先级">
                    <select
                      className={inputClass}
                      value={feedbackForm.priority}
                      onChange={(e) =>
                        setFeedbackForm({
                          ...feedbackForm,
                          priority: e.target.value as 'low' | 'normal' | 'high',
                        })
                      }
                    >
                      <option value="low">low</option>
                      <option value="normal">normal</option>
                      <option value="high">high</option>
                    </select>
                  </Field>
                </div>
                <Field label="标题">
                  <input
                    className={inputClass}
                    value={feedbackForm.title}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        title: e.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <Field label="内容">
                  <textarea
                    className={textareaClass}
                    value={feedbackForm.content}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        content: e.target.value,
                      })
                    }
                    required
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={feedbackForm.anonymous}
                    onChange={(e) =>
                      setFeedbackForm({
                        ...feedbackForm,
                        anonymous: e.target.checked,
                      })
                    }
                  />
                  匿名提交
                </label>
                <Button type="submit" disabled={busy}>
                  提交反馈
                </Button>
              </form>
            </Panel>
          ) : null}

          {isAdmin ? (
            <Panel title="员工声音主题聚类">
              {feedbackClusters.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {feedbackClusters.map((cluster) => (
                    <div
                      key={cluster.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-slate-950">
                          {cluster.theme}
                        </p>
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-bold ${cluster.risk_level === 'high' || cluster.risk_level === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}
                        >
                          {displayRiskLevel(cluster.risk_level)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {cluster.summary}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        证据数量：{cluster.evidence_count} · 相关部门：
                        {cluster.related_departments.join('、') || '未识别'}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        建议：{cluster.suggested_action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="暂无反馈聚类"
                  body="点击 AI 反馈主题聚类后会生成主题、证据数量、相关部门、风险等级和建议行动；没有模型凭证时使用本地规则草稿。"
                />
              )}
            </Panel>
          ) : null}

          <Panel title={isAdmin ? '全部员工反馈' : '我的反馈'}>
            {feedbackList.length ? (
              <div className="grid gap-3">
                {feedbackList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {displayFeedbackCategory(item.category)} ·{' '}
                          {displayPriority(item.priority)} ·{' '}
                          {displayStatus(item.status)}
                          {isAdmin
                            ? ` · ${item.anonymous ? '匿名' : item.employee_name || item.username || '未绑定员工'}`
                            : ''}
                        </p>
                      </div>
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          <select
                            className={`${inputClass} w-32`}
                            value={item.status}
                            onChange={(e) =>
                              void handleFeedbackStatus(item.id, e.target.value)
                            }
                          >
                            {feedbackStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="secondary"
                            onClick={() => void handleFeedbackSummary(item.id)}
                          >
                            AI 总结
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">
                      {item.content}
                    </p>
                    {item.ai_summary ? (
                      <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                        {item.ai_summary}
                      </pre>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无反馈"
                body={
                  isAdmin
                    ? '员工提交反馈后会进入反馈池。'
                    : '你提交过的反馈会显示在这里。'
                }
              />
            )}
          </Panel>
        </main>
      </div>
    );
  }

  function renderDiagnosisPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('诊断假设输入台')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel
            title="诊断假设输入台"
            eyebrow="诊断假设控制台"
          >
            <p className="text-sm leading-6 text-slate-600">
              请先输入你对当前组织、团队或人才问题的判断。AI 会结合 AI
              时代人才模型和组织诊断框架，生成可执行的诊断假设，并用于后续人才模型和问卷生成。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              AI
              输出仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有
              AI 生成内容需要管理员确认。
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel
              title="诊断输入"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={handleSaveDiagnosisDraft}
                    disabled={busy}
                  >
                    <Save size={16} />
                    保存草稿
                  </Button>
                  <Button onClick={handleGenerateDiagnosis} disabled={busy}>
                    <Sparkles size={16} />
                    AI 提炼诊断假设
                  </Button>
                </>
              }
            >
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="关联项目">
                    <select
                      className={inputClass}
                      value={diagnosisDraft.project_id ?? projectId ?? ''}
                      onChange={(event) =>
                        setDiagnosisDraft({
                          ...diagnosisDraft,
                          project_id: event.target.value
                            ? Number(event.target.value)
                            : null,
                        })
                      }
                    >
                      <option value="">不关联项目</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="诊断对象">
                    <select
                      className={inputClass}
                      value={diagnosisDraft.target_scope}
                      onChange={(event) =>
                        setDiagnosisDraft({
                          ...diagnosisDraft,
                          target_scope: event.target.value,
                        })
                      }
                    >
                      {diagnosisScopeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="公司阶段">
                    <select
                      className={inputClass}
                      value={diagnosisDraft.company_stage}
                      onChange={(event) =>
                        setDiagnosisDraft({
                          ...diagnosisDraft,
                          company_stage: event.target.value,
                        })
                      }
                    >
                      {companyStageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="诊断目的">
                  {renderCheckboxGroup(
                    diagnosisPurposeOptions,
                    diagnosisDraft.diagnosis_purpose,
                    (next) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        diagnosis_purpose: next,
                      }),
                  )}
                </Field>
                <Field label="管理员核心判断">
                  <textarea
                    className={textareaClass}
                    placeholder="我怀疑当前问题不是员工执行力差，而是中层管理者目标拆解能力不足，且无法设计 AI 时代的团队工作流。"
                    value={diagnosisDraft.hr_core_judgment}
                    onChange={(event) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        hr_core_judgment: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="想识别的人才">
                  <textarea
                    className={textareaClass}
                    placeholder="我希望识别具备 AI-native 管理潜力的人，包括问题定义能力、AI协作能力、判断验证能力和团队学习扩散能力。"
                    value={diagnosisDraft.target_talent}
                    onChange={(event) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        target_talent: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="重点关注问题">
                  {renderCheckboxGroup(
                    focusIssueOptions,
                    diagnosisDraft.focus_issues,
                    (next) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        focus_issues: next,
                      }),
                  )}
                  <input
                    className={`${inputClass} mt-3`}
                    placeholder="输入自定义关注点后回车添加"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        const value = event.currentTarget.value.trim();
                        if (
                          value &&
                          !diagnosisDraft.focus_issues.includes(value)
                        ) {
                          setDiagnosisDraft({
                            ...diagnosisDraft,
                            focus_issues: [
                              ...diagnosisDraft.focus_issues,
                              value,
                            ],
                          });
                          event.currentTarget.value = '';
                        }
                      }
                    }}
                  />
                </Field>
                <Field label="风控边界">
                  <textarea
                    className={textareaClass}
                    value={diagnosisDraft.constraints}
                    onChange={(event) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        constraints: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="期望输出">
                  {renderCheckboxGroup(
                    expectedOutputOptions,
                    diagnosisDraft.expected_outputs,
                    (next) =>
                      setDiagnosisDraft({
                        ...diagnosisDraft,
                        expected_outputs: next,
                      }),
                  )}
                </Field>
              </div>
            </Panel>

            <Panel title="已保存假设">
              {diagnosisList.length ? (
                <div className="grid gap-2">
                  {diagnosisList.map((item) => (
                    <button
                      key={item.id}
                      className={`rounded-lg border p-3 text-left text-sm ${diagnosisDraft.id === item.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      onClick={() => selectDiagnosis(item)}
                    >
                      <p className="font-bold text-slate-950">
                        {item.target_scope || '未命名诊断'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.company_stage} · {displayStatus(item.status)} ·{' '}
                        {item.updated_at || item.created_at}
                      </p>
                      <p className="mt-2 line-clamp-2 text-slate-600">
                        {item.hr_core_judgment || '暂无核心判断'}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="暂无诊断假设"
                  body="保存草稿后会显示在这里。"
                />
              )}
            </Panel>
          </div>

          <Panel
            title="AI 结构化诊断假设"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={addExtractedHypothesis}
                  disabled={busy}
                >
                  <Plus size={16} />
                  新增假设
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleGenerateDiagnosis}
                  disabled={busy}
                >
                  <RefreshCw size={16} />
                  重新生成
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleConfirmDiagnosis}
                  disabled={
                    busy ||
                    !diagnosisDraft.id ||
                    !diagnosisDraft.ai_extracted_hypotheses.length
                  }
                >
                  <Check size={16} />
                  确认诊断假设
                </Button>
                <Button
                  variant="danger"
                  className="hidden"
                  onClick={handleDeleteDiagnosisHypothesis}
                  disabled={busy || !diagnosisDraft.id}
                >
                  <Trash2 size={16} />
                  删除整组假设
                </Button>
                <Button
                  disabled={!diagnosisDraft.id}
                  onClick={() => {
                    setTalentDraft({
                      ...blankTalentModel,
                      project_id: diagnosisDraft.project_id ?? projectId,
                      hypothesis_id: diagnosisDraft.id ?? null,
                    });
                    goModule('talent');
                  }}
                >
                  进入 AI 人才模型生成
                </Button>
              </>
            }
          >
            {diagnosisDraft.ai_extracted_hypotheses.length ? (
              <div className="grid gap-4">
                {diagnosisDraft.ai_extracted_hypotheses.map((item, index) => (
                  <div
                    key={`${item.hypothesis_title}-${index}`}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <Field label="假设标题">
                        <input
                          className={inputClass}
                          value={item.hypothesis_title}
                          onChange={(event) =>
                            updateExtractedHypothesis(index, {
                              hypothesis_title: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="问题类型">
                        <select
                          className={inputClass}
                          value={item.problem_type}
                          onChange={(event) =>
                            updateExtractedHypothesis(index, {
                              problem_type: event.target
                                .value as ExtractedHypothesis['problem_type'],
                            })
                          }
                        >
                          <option value="individual">个人能力问题</option>
                          <option value="manager">管理方式问题</option>
                          <option value="organization">组织系统问题</option>
                          <option value="ai_transformation">
                            AI 转型问题
                          </option>
                          <option value="governance">治理机制问题</option>
                        </select>
                      </Field>
                      <Button
                        variant="danger"
                        className="self-end"
                        onClick={() => removeExtractedHypothesis(index)}
                      >
                        <Trash2 size={16} />
                        删除
                      </Button>
                    </div>
                    <Field label="假设说明">
                      <textarea
                        className={textareaClass}
                        value={item.hypothesis_detail}
                        onChange={(event) =>
                          updateExtractedHypothesis(index, {
                            hypothesis_detail: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="建议验证方式">
                      <textarea
                        className={textareaClass}
                        value={item.suggested_validation_method}
                        onChange={(event) =>
                          updateExtractedHypothesis(index, {
                            suggested_validation_method: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="建议数据来源，逗号分隔">
                        <input
                          className={inputClass}
                          value={item.suggested_data_sources.join('，')}
                          onChange={(event) =>
                            updateExtractedHypothesis(index, {
                              suggested_data_sources: event.target.value
                                .split(/[，,]/)
                                .map((v) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                      <Field label="相关人才维度，逗号分隔">
                        <input
                          className={inputClass}
                          value={item.related_talent_dimensions.join('，')}
                          onChange={(event) =>
                            updateExtractedHypothesis(index, {
                              related_talent_dimensions: event.target.value
                                .split(/[，,]/)
                                .map((v) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="还没有 AI 诊断假设"
                body="填写管理员判断后点击 AI 提炼诊断假设；没有配置模型时会提示管理员前往设置。"
              />
            )}
          </Panel>
        </main>
      </div>
    );
  }

  function renderTalentModelPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    const confirmedHypotheses = diagnosisList.filter(
      (item) => item.status === 'confirmed',
    );
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('AI 时代人才模型')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel title="AI 时代人才模型" eyebrow="胜任力模型构建器">
            <p className="text-sm leading-6 text-slate-600">
              系统将基于管理员确认的诊断假设，生成适合本次项目的 AI
              时代人才能力模型。你可以编辑维度、行为标准、题目和权重，并将其用于后续问卷生成。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              人才模型仅用于发展反馈、能力诊断和组织改进，不应作为自动化人事决策依据。
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Panel title="生成设置">
              <div className="grid gap-3">
                <Field label="已确认诊断假设">
                  <select
                    className={inputClass}
                    value={talentDraft.hypothesis_id ?? ''}
                    onChange={(event) =>
                      setTalentDraft({
                        ...talentDraft,
                        hypothesis_id: event.target.value
                          ? Number(event.target.value)
                          : null,
                      })
                    }
                  >
                    <option value="">请选择</option>
                    {confirmedHypotheses.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} ·{' '}
                        {item.ai_extracted_hypotheses[0]?.hypothesis_title ||
                          item.target_scope}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="模型模板">
                  <select
                    className={inputClass}
                    value={talentDraft.template || 'AI 原生管理者模型'}
                    onChange={(event) =>
                      setTalentDraft({
                        ...talentDraft,
                        template: event.target.value,
                      })
                    }
                  >
                    {talentTemplates.map((template) => (
                      <option key={template} value={template}>
                        {template}
                      </option>
                    ))}
                  </select>
                </Field>
                <Button
                  onClick={handleGenerateTalentModel}
                  disabled={busy || !talentDraft.hypothesis_id}
                >
                  <Sparkles size={16} />
                  AI 生成人才模型
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveTalentModel}
                  disabled={
                    busy || !talentDraft.name || !talentDraft.dimensions.length
                  }
                >
                  <Save size={16} />
                  保存为本项目人才模型
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleConfirmTalentModel}
                  disabled={busy || !talentDraft.id}
                >
                  <Check size={16} />
                  确认人才模型
                </Button>
                <Button
                  disabled={!talentDraft.id}
                  onClick={() => {
                    setModelQuestionForm({
                      ...modelQuestionForm,
                      hypothesis_id: String(talentDraft.hypothesis_id ?? ''),
                      model_id: String(talentDraft.id ?? ''),
                      constraints:
                        diagnosisList.find(
                          (item) => item.id === talentDraft.hypothesis_id,
                        )?.constraints || modelQuestionForm.constraints,
                    });
                    setActiveTab('questionnaire');
                    goModule('review360');
                  }}
                >
                  基于该模型生成问卷
                </Button>
              </div>
            </Panel>

            <Panel title="已保存人才模型">
              {talentModels.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {talentModels.map((model) => (
                    <button
                      key={model.id}
                      className={`rounded-lg border p-3 text-left text-sm ${talentDraft.id === model.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                      onClick={() => selectTalentModel(model)}
                    >
                      <p className="font-bold text-slate-950">{model.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {displayStatus(model.status)} ·{' '}
                        {(model.dimensions ?? []).length ||
                          model.dimension_count ||
                          0}{' '}
                        个维度
                      </p>
                      <p className="mt-2 line-clamp-2 text-slate-600">
                        {model.description || '暂无说明'}
                      </p>
                      <span
                        className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg bg-sky-600 px-3 text-sm font-semibold text-white"
                        role="button"
                        tabIndex={0}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectTalentModel(model);
                          setTalentDetailOpen(true);
                        }}
                      >
                        查看详情
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="暂无人才模型"
                  body="选择已确认诊断假设后生成并保存人才模型。"
                />
              )}
            </Panel>
          </div>

          <Panel
            title="模型内容与维度"
            actions={
              <Button variant="secondary" onClick={addTalentDimension}>
                <Plus size={16} />
                新增维度
              </Button>
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                <Field label="模型名称">
                  <input
                    className={inputClass}
                    value={talentDraft.name}
                    onChange={(event) =>
                      setTalentDraft({
                        ...talentDraft,
                        name: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="模型说明">
                  <input
                    className={inputClass}
                    value={talentDraft.description}
                    onChange={(event) =>
                      setTalentDraft({
                        ...talentDraft,
                        description: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>

              {talentDraft.dimensions.length ? (
                talentDraft.dimensions.map((dimension, index) => (
                  <div
                    key={`${dimension.name}-${index}`}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_120px_auto]">
                      <Field label="维度名称">
                        <input
                          className={inputClass}
                          value={dimension.name}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              name: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="权重">
                        <input
                          className={inputClass}
                          type="number"
                          step="0.1"
                          min="0"
                          value={dimension.weight}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              weight: Number(event.target.value),
                            })
                          }
                        />
                      </Field>
                      <Button
                        variant="ghost"
                        className="self-end"
                        onClick={() => removeTalentDimension(index)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                    <Field label="定义">
                      <textarea
                        className={textareaClass}
                        value={dimension.description}
                        onChange={(event) =>
                          updateTalentDimension(index, {
                            description: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="低行为标准">
                        <textarea
                          className={textareaClass}
                          value={dimension.low_behavior}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              low_behavior: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="中行为标准">
                        <textarea
                          className={textareaClass}
                          value={dimension.medium_behavior}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              medium_behavior: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="高行为标准">
                        <textarea
                          className={textareaClass}
                          value={dimension.high_behavior}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              high_behavior: event.target.value,
                            })
                          }
                        />
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="适用角色">
                        <input
                          className={inputClass}
                          value={dimension.applicable_roles}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              applicable_roles: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="样例评分题，每行一条">
                        <textarea
                          className={textareaClass}
                          value={dimension.sample_rating_questions.join('\n')}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              sample_rating_questions: event.target.value
                                .split('\n')
                                .map((v) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                      <Field label="样例开放题，每行一条">
                        <textarea
                          className={textareaClass}
                          value={dimension.sample_open_questions.join('\n')}
                          onChange={(event) =>
                            updateTalentDimension(index, {
                              sample_open_questions: event.target.value
                                .split('\n')
                                .map((v) => v.trim())
                                .filter(Boolean),
                            })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="还没有模型维度"
                  body="点击 AI 生成人才模型；没有模型凭证时会返回本地规则模型。"
                />
              )}
            </div>
          </Panel>
          {talentDetailOpen ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
              <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-sky-700">
                      胜任力模型详情
                    </p>
                    <h3 className="text-xl font-black text-slate-950">
                      {talentDraft.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={handleSaveTalentModel}>
                      <Save size={16} />
                      保存
                    </Button>
                    <Button variant="danger" onClick={handleDeleteTalentModel}>
                      <Trash2 size={16} />
                      删除
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setTalentDetailOpen(false)}
                    >
                      关闭
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[
                    ['talent_type', '人才类型'],
                    ['hard_skills', '硬技能'],
                    ['soft_qualities', '软性特质'],
                    ['behavioral_indicators', '行为指标'],
                    ['interview_focus', '访谈关注点'],
                    ['risk_signals', '风险信号'],
                    ['interview_questions', '访谈问题'],
                    ['rationale', '生成依据'],
                  ].map(([key, label]) => (
                    <Field key={key} label={label}>
                      <textarea
                        className={textareaClass}
                        value={String(
                          talentDraft[key as keyof TalentModel] ?? '',
                        )}
                        onChange={(event) =>
                          setTalentDraft({
                            ...talentDraft,
                            [key]: event.target.value,
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                <div className="mt-4 grid gap-3">
                  {talentDraft.dimensions.map((dimension) => (
                    <div
                      key={dimension.id ?? dimension.name}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <p className="font-bold text-slate-950">
                        {dimension.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {dimension.description}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {dimension.low_behavior} / {dimension.medium_behavior} /{' '}
                        {dimension.high_behavior}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  function renderDiagnosisRulesPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    const confirmedHypotheses = diagnosisList.filter(
      (item) => item.status === 'confirmed',
    );
    const availableModels = talentModels.filter(
      (model) => model.status === 'draft' || model.status === 'confirmed',
    );
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('AI 诊断规则生成')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel title="诊断规则" eyebrow="诊断规则构建器">
            <p className="text-sm leading-6 text-slate-600">
              诊断规则用于定义系统如何解释评分差异、开放反馈和员工反馈主题。AI
              会基于已确认的管理员诊断假设和 AI 人才模型生成规则，管理员
              可以编辑后保存。后续组织诊断看板和报告将使用这些规则进行解释。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              规则只用于发展反馈和组织诊断解释，不直接形成自动化人事决策。
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Panel
              title="规则生成输入"
              actions={
                <Button onClick={handleGenerateDiagnosisRules} disabled={busy}>
                  <Sparkles size={16} />
                  AI 生成诊断规则
                </Button>
              }
            >
              <div className="grid gap-3">
                <Field label="项目">
                  <select
                    className={inputClass}
                    value={projectId ?? ''}
                    onChange={(event) =>
                      setProjectId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">请选择项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="已确认诊断假设">
                  <select
                    className={inputClass}
                    value={ruleForm.hypothesis_id}
                    onChange={(event) => {
                      const selected = diagnosisList.find(
                        (item) => item.id === Number(event.target.value),
                      );
                      setRuleForm({
                        ...ruleForm,
                        hypothesis_id: event.target.value,
                        constraints:
                          selected?.constraints || ruleForm.constraints,
                      });
                    }}
                  >
                    <option value="">不选择</option>
                    {confirmedHypotheses.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} ·{' '}
                        {item.ai_extracted_hypotheses[0]?.hypothesis_title ||
                          item.target_scope}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="人才模型">
                  <select
                    className={inputClass}
                    value={ruleForm.model_id}
                    onChange={(event) =>
                      setRuleForm({ ...ruleForm, model_id: event.target.value })
                    }
                  >
                    <option value="">不选择</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {displayStatus(model.status)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="规则生成范围">
                  {renderCheckboxGroup(
                    diagnosisRuleScopes,
                    ruleForm.scopes,
                    (next) => setRuleForm({ ...ruleForm, scopes: next }),
                  )}
                </Field>
                <Field label="风控边界">
                  <textarea
                    className={textareaClass}
                    value={ruleForm.constraints}
                    onChange={(event) =>
                      setRuleForm({
                        ...ruleForm,
                        constraints: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title="编辑规则"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setRuleDraft({
                        ...blankDiagnosisRule,
                        project_id: projectId,
                      })
                    }
                  >
                    新建规则
                  </Button>
                  <Button onClick={handleSaveDiagnosisRule} disabled={busy}>
                    保存规则
                  </Button>
                </>
              }
            >
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="规则名称">
                    <input
                      className={inputClass}
                      value={ruleDraft.rule_name}
                      onChange={(event) =>
                        setRuleDraft({
                          ...ruleDraft,
                          rule_name: event.target.value,
                        })
                      }
                    />
                  </Field>
                  <Field label="条件类型">
                    <select
                      className={inputClass}
                      value={ruleDraft.condition_type}
                      onChange={(event) =>
                        setRuleDraft({
                          ...ruleDraft,
                          condition_type: event.target.value,
                        })
                      }
                    >
                      {conditionTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {conditionTypeLabels[option] || option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="风险等级">
                    <select
                      className={inputClass}
                      value={ruleDraft.risk_level}
                      onChange={(event) =>
                        setRuleDraft({
                          ...ruleDraft,
                          risk_level: event.target
                            .value as DiagnosisRule['risk_level'],
                        })
                      }
                    >
                      {riskLevelOptions.map((option) => (
                        <option key={option} value={option}>
                          {riskLevelLabels[option] || option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="条件 JSON">
                  <textarea
                    className={textareaClass}
                    value={JSON.stringify(ruleDraft.condition_json, null, 2)}
                    onChange={(event) => {
                      try {
                        setRuleDraft({
                          ...ruleDraft,
                          condition_json: JSON.parse(event.target.value),
                        });
                      } catch {
                        setRuleDraft({
                          ...ruleDraft,
                          condition_json: { raw: event.target.value },
                        });
                      }
                    }}
                  />
                </Field>
                <Field label="诊断解释">
                  <textarea
                    className={textareaClass}
                    value={ruleDraft.diagnosis_text}
                    onChange={(event) =>
                      setRuleDraft({
                        ...ruleDraft,
                        diagnosis_text: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="建议行动">
                  <textarea
                    className={textareaClass}
                    value={ruleDraft.suggested_action}
                    onChange={(event) =>
                      setRuleDraft({
                        ...ruleDraft,
                        suggested_action: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="证据来源，逗号分隔">
                  <input
                    className={inputClass}
                    value={ruleDraft.evidence_sources.join('，')}
                    onChange={(event) =>
                      setRuleDraft({
                        ...ruleDraft,
                        evidence_sources: event.target.value
                          .split(/[，,]/)
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </div>
            </Panel>
          </div>

          <Panel
            title="已保存诊断规则"
            actions={
              <Button
                variant="secondary"
                onClick={() => goModule('orgDashboard')}
              >
                应用到组织诊断看板
              </Button>
            }
          >
            {diagnosisRules.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {diagnosisRules.map((rule) => (
                  <div
                    key={rule.id ?? rule.rule_name}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-slate-950">
                        {rule.rule_name}
                      </p>
                      <span
                        className={`rounded-lg px-2 py-1 text-xs font-bold ${rule.risk_level === 'high' || rule.risk_level === 'critical' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}
                      >
                        {displayRiskLevel(rule.risk_level)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {rule.diagnosis_text}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      条件：{displayConditionType(rule.condition_type)} · 证据：
                      {rule.evidence_sources.join('、') || '未填'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      建议：{rule.suggested_action}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => setRuleDraft(rule)}
                      >
                        编辑规则
                      </Button>
                      {rule.id ? (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            void handleDeleteDiagnosisRule(rule.id!)
                          }
                        >
                          删除规则
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无诊断规则"
                body="选择诊断假设和人才模型后点击 AI 生成诊断规则；没有模型凭证时会返回本地规则草稿。"
              />
            )}
          </Panel>
        </main>
      </div>
    );
  }

  function renderOrganizationDashboardPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    const dashboard = organizationDashboard;
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('组织诊断看板')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel
            title="组织诊断看板"
            actions={
              <>
                <Button
                  variant="secondary"
                  onClick={() => void loadOrganizationDashboard()}
                >
                  刷新看板
                </Button>
                <Button
                  onClick={handleGenerateOrganizationRisks}
                  disabled={busy}
                >
                  <Sparkles size={16} />
                  生成组织风险
                </Button>
              </>
            }
          >
            <p className="text-sm leading-6 text-slate-600">
              看板结合 360 评分、AI
              人才模型、诊断规则、员工声音聚类和组织风险，帮助管理员
              判断可能的组织问题，而不是只看问卷平均分。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              高潜人才信号仅作为人才发展线索，不作为晋升或淘汰依据。组织风险需结合业务事实和访谈确认。
            </div>
          </Panel>

          {dashboard ? (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  ['应填任务数', dashboard.completion.total],
                  ['已提交', dashboard.completion.submitted],
                  ['未提交', dashboard.completion.pending],
                  ['完成率', `${dashboard.completion.completion_rate}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-semibold text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel title="AI 时代人才模型表现">
                  <div className="grid gap-3">
                    <p className="text-sm leading-6 text-slate-600">
                      低分维度意味着可能存在能力、流程或管理机制卡点，建议结合诊断规则和访谈验证。
                    </p>
                    {dashboard.talent_model_performance.dimension_averages
                      .length ? (
                      dashboard.talent_model_performance.dimension_averages.map(
                        (dimension) => (
                          <div
                            key={dimension.id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
                          >
                            <span className="font-semibold">
                              {dimension.name}
                            </span>
                            <span
                              className={`rounded-lg px-2 py-1 font-bold ${scoreTone(dimension.avg_score)}`}
                            >
                              {dimension.avg_score ?? '暂无'}
                            </span>
                          </div>
                        ),
                      )
                    ) : (
                      <EmptyState
                        title="暂无维度评分"
                        body="员工提交问卷后会展示各维度平均分、部门差异和层级差异。"
                      />
                    )}
                  </div>
                </Panel>

                <Panel title="360 差异分析">
                  <div className="grid gap-3">
                    <p className="text-sm leading-6 text-slate-600">
                      {dashboard.score_differences.explanation}
                    </p>
                    {dashboard.score_differences.risk_alerts.map(
                      (alert, index) => (
                        <div
                          key={`${alert}-${index}`}
                          className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                        >
                          {alert}
                        </div>
                      ),
                    )}
                    {dashboard.score_differences.group_differences.map(
                      (group) => (
                        <div
                          key={group.relation_type}
                          className="rounded-lg border border-slate-200 p-3 text-sm"
                        >
                          {group.relation_label}：{group.avg_score ?? '暂无'} ·
                          样本 {group.response_count}
                        </div>
                      ),
                    )}
                  </div>
                </Panel>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel title="员工反馈主题">
                  {dashboard.employee_voice.length ? (
                    <div className="grid gap-3">
                      {dashboard.employee_voice.map((cluster) => (
                        <div
                          key={cluster.id}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="font-bold text-slate-950">
                            {cluster.theme} ·{' '}
                            {displayRiskLevel(cluster.risk_level)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {cluster.summary}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            下一步：{cluster.suggested_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="暂无员工声音聚类"
                      body="在员工反馈页点击 AI 反馈主题聚类后，这里会展示高频主题、风险等级和建议行动。"
                    />
                  )}
                </Panel>

                <Panel title="组织风险">
                  {dashboard.organization_risks.length ? (
                    <div className="grid gap-3">
                      {dashboard.organization_risks.map((risk) => (
                        <div
                          key={risk.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <p className="font-bold text-slate-950">
                            {risk.title} · {displayRiskLevel(risk.risk_level)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {risk.description}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-700">
                            建议：{risk.suggested_action}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="暂无组织风险"
                      body="点击生成组织风险后会结合诊断规则、员工声音和 360 差异形成风险解释。"
                    />
                  )}
                </Panel>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Panel title="高潜人才信号">
                  <p className="mb-3 text-sm leading-6 text-slate-600">
                    {dashboard.high_potential_signals.notice}
                  </p>
                  {dashboard.high_potential_signals.employees.length ? (
                    dashboard.high_potential_signals.employees.map(
                      (employee) => (
                        <div
                          key={employee.id}
                          className="rounded-lg border border-slate-200 p-3 text-sm"
                        >
                          <p className="font-bold">
                            {employee.name} · {employee.department}
                          </p>
                          <p className="text-slate-500">
                            平均分：{employee.avg_score ?? '暂无'} ·{' '}
                            {employee.dimension_summary}
                          </p>
                        </div>
                      ),
                    )
                  ) : (
                    <EmptyState
                      title="暂无高潜线索"
                      body="需要问题定义、AI 协作、学习迭代、判断验证等维度有足够评分后才会显示。"
                    />
                  )}
                </Panel>

                <Panel title="AI 转型卡点">
                  <div className="grid gap-3">
                    {dashboard.ai_transformation_bottlenecks.map(
                      (item, index) => (
                        <div
                          key={`${item.title}-${index}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="font-bold text-slate-950">
                            {item.title} · {displayRiskLevel(item.risk_level)}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            建议管理员下一步：{item.suggested_action}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </Panel>
              </div>
            </>
          ) : (
            <EmptyState
              title="暂无看板数据"
              body="请选择项目并刷新看板。数据不足时页面不会报错，可以先生成诊断规则、员工声音聚类和组织风险草稿。"
            />
          )}
        </main>
      </div>
    );
  }

  function renderDiagnosisReportsPage() {
    if (!currentUser || !isHrUser) return renderLoginPage();
    const confirmedHypotheses = diagnosisList.filter(
      (item) => item.status === 'confirmed',
    );
    const availableModels = talentModels.filter(
      (model) => model.status === 'draft' || model.status === 'confirmed',
    );
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('报告生成')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel
            title="诊断报告"
            eyebrow="Organization Report + 30/60/90 Plan"
          >
            <p className="text-sm leading-6 text-slate-600">
              生成组织诊断报告、AI 转型成熟度报告和 30/60/90
              天行动计划。报告默认是草稿，必须由管理员确认。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              本报告仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有结论需要
              管理员结合业务事实进行确认。
            </div>
          </Panel>

          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel
              title="报告生成输入"
              actions={
                <Button
                  onClick={handleGenerateDiagnosisReport}
                  disabled={busy || !projectId}
                >
                  <Sparkles size={16} />
                  生成诊断报告
                </Button>
              }
            >
              <div className="grid gap-3">
                <Field label="项目">
                  <select
                    className={inputClass}
                    value={projectId ?? ''}
                    onChange={(event) =>
                      setProjectId(
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  >
                    <option value="">请选择项目</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="诊断假设，可选">
                  <select
                    className={inputClass}
                    value={diagnosisReportForm.hypothesis_id}
                    onChange={(event) =>
                      setDiagnosisReportForm({
                        ...diagnosisReportForm,
                        hypothesis_id: event.target.value,
                      })
                    }
                  >
                    <option value="">不选择</option>
                    {confirmedHypotheses.map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} ·{' '}
                        {item.ai_extracted_hypotheses[0]?.hypothesis_title ||
                          item.target_scope}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="人才模型，可选">
                  <select
                    className={inputClass}
                    value={diagnosisReportForm.model_id}
                    onChange={(event) =>
                      setDiagnosisReportForm({
                        ...diagnosisReportForm,
                        model_id: event.target.value,
                      })
                    }
                  >
                    <option value="">不选择</option>
                    {availableModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="报告类型">
                  <select
                    className={inputClass}
                    value={diagnosisReportForm.report_type}
                    onChange={(event) =>
                      setDiagnosisReportForm({
                        ...diagnosisReportForm,
                        report_type: event.target.value,
                      })
                    }
                  >
                    {reportTypeOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
                {[
                  ['include_feedback_clusters', '包含员工反馈聚类'],
                  ['include_organization_risks', '包含组织风险'],
                  ['include_action_plan', '包含行动计划'],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(
                        diagnosisReportForm[
                          key as keyof typeof diagnosisReportForm
                        ],
                      )}
                      onChange={(event) =>
                        setDiagnosisReportForm({
                          ...diagnosisReportForm,
                          [key]: event.target.checked,
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
                <Button
                  variant="secondary"
                  onClick={handleGenerateActionPlans}
                  disabled={busy || !projectId}
                >
                  生成 30/60/90 行动计划
                </Button>
              </div>
            </Panel>

            <Panel
              title="报告草稿与管理员确认"
              actions={
                <>
                  <Button
                    variant="secondary"
                    onClick={handleSaveDiagnosisReport}
                    disabled={!selectedDiagnosisReport}
                  >
                    保存报告
                  </Button>
                  <Button
                    onClick={handleConfirmDiagnosisReport}
                    disabled={
                      !selectedDiagnosisReport ||
                      selectedDiagnosisReport.status === 'confirmed'
                    }
                  >
                    <Check size={16} />
                    管理员确认报告
                  </Button>
                </>
              }
            >
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                <div className="grid content-start gap-2">
                  {diagnosisReports.length ? (
                    diagnosisReports.map((report) => (
                      <button
                        key={report.id}
                        className={`rounded-lg border p-3 text-left text-sm ${selectedDiagnosisReportId === report.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        onClick={() => {
                          setSelectedDiagnosisReportId(report.id);
                          setDiagnosisReportDraft(report.content);
                        }}
                      >
                        <p className="font-bold text-slate-950">
                          {report.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {displayReportType(report.report_type)}{' '}
                          · {displayStatus(report.status)}
                        </p>
                      </button>
                    ))
                  ) : (
                    <EmptyState
                      title="暂无报告"
                      body="点击生成诊断报告后，报告草稿会显示在这里。"
                    />
                  )}
                </div>
                <div>
                  {selectedDiagnosisReport ? (
                    <>
                      <div className="mb-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                          {displayReportType(
                            selectedDiagnosisReport.report_type,
                          )}
                        </span>
                        <span className="rounded-lg bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                          {displayStatus(selectedDiagnosisReport.status)}
                        </span>
                      </div>
                      <textarea
                        className="min-h-[520px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        value={diagnosisReportDraft}
                        onChange={(event) =>
                          setDiagnosisReportDraft(event.target.value)
                        }
                      />
                    </>
                  ) : (
                    <EmptyState
                      title="请选择或生成报告"
                      body="报告会包含诊断摘要、关键发现、证据来源、风险等级、建议行动、30/60/90 计划和管理员确认区。"
                    />
                  )}
                </div>
              </div>
            </Panel>
          </div>

          <Panel title="30/60/90 天行动计划">
            {actionPlans.length ? (
              <div className="grid gap-3 md:grid-cols-3">
                {['30天', '60天', '90天'].map((timeline) => (
                  <div
                    key={timeline}
                    className="grid content-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-lg font-black text-slate-950">
                      {timeline}
                    </p>
                    {actionPlans
                      .filter((plan) => plan.timeline === timeline)
                      .map((plan) => (
                        <div
                          key={plan.id}
                          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                        >
                          <p className="font-bold text-slate-950">
                            {plan.title}
                          </p>
                          <p className="mt-1 leading-6 text-slate-600">
                            {plan.description}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            {displayStatus(plan.status)} ·{' '}
                            {displayTargetType(plan.target_type)}
                          </p>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无行动计划"
                body="点击生成 30/60/90 行动计划后，会生成快速澄清、流程改造、试点复盘和长期组织改进任务。"
              />
            )}
          </Panel>
        </main>
      </div>
    );
  }

  function renderHomePageClean() {
    const adminSteps = [
      ['创建诊断项目', '明确诊断场景、参与对象和项目周期。', 'projectWorkspace'],
      ['设置诊断目标和组织能力维度', '确定要观察的组织能力和问题边界。', 'organizationDiagnosis'],
      ['确认诊断假设与胜任力模型', '把组织问题转成可验证假设和能力标准。', 'diagnosis'],
      ['生成并发放综合问卷', '组合组织诊断、胜任力、360评审和开放反馈问题。', 'review360'],
      ['查看专家诊断会、报告和行动计划', '形成共识、生成报告，并落到行动追踪。', 'expertCouncil'],
    ] as const;
    const employeeCards = [
      ['为什么需要填写', '帮助团队发现协作、沟通、管理和工具使用中的真实问题。'],
      ['这不是个人考核', '系统关注整体趋势，不给个人贴标签，不自动决定晋升、淘汰或薪酬。'],
      ['大概耗时', '通常需要 5-8 分钟。请尽量真实表达。'],
      ['数据如何使用', '反馈会汇总成团队层面的洞察，帮助管理员制定改进计划。'],
      ['你能获得什么', '你的反馈会帮助团队减少无效沟通、重复劳动和不清晰的目标。'],
      ['后续会发生什么', '管理员会查看团队趋势、组织专家诊断会，并推进改进行动。'],
    ];
    return (
      <div className={pageShellClass}>
        {renderGlobalTopNavClean()}
        <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:px-8">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-sky-700">
              AI 组织诊断与行动共识平台
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">
              让组织问题从“感觉”变成证据、共识和行动
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              系统围绕同一条主流程运行：创建项目 → 设置诊断目标 → 配置组织能力维度 →
              生成或编辑诊断假设 → 生成胜任力模型 → 生成综合问卷 → 员工填写 →
              数据洞察 → AI 专家诊断会 → 生成报告 → 制定行动计划 → 后续复盘。
            </p>
          </section>

          {currentUser?.role === 'employee' ? (
            <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                员工填写说明
              </h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {employeeCards.map(([title, body]) => (
                  <div key={title} className="rounded-lg bg-white p-4">
                    <p className="font-black text-slate-950">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => goModule('myTasks')}>查看我的任务</Button>
                <Button
                  variant="secondary"
                  onClick={() => goModule('organizationFeedback')}
                >
                  提交员工反馈
                </Button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-sky-100 bg-sky-50 p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">
                管理员第一次使用向导
              </h2>
              <div className="mt-4 grid gap-3">
                {adminSteps.map(([title, body, module], index) => (
                  <div
                    key={title}
                    className="grid gap-3 rounded-lg bg-white p-4 md:grid-cols-[40px_minmax(0,1fr)_auto]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 font-black text-sky-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-black text-slate-950">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {body}
                      </p>
                    </div>
                    <Button
                      variant={index === 0 ? 'primary' : 'secondary'}
                      onClick={() => goModule(module as Module)}
                    >
                      下一步
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    );
  }

  function renderHomePage() {
    const moduleCards = [
      {
        title: '诊断假设',
        body: '输入组织管理员对组织、团队和人才问题的判断，由 AI 提炼为可验证的诊断假设。',
        icon: <Bot className="text-sky-700" size={24} />,
        action: () => goModule('diagnosis'),
      },
      {
        title: 'AI人才模型',
        body: '基于诊断假设生成 AI 时代能力模型，支持编辑维度、行为标准、样例题目和权重。',
        icon: <Sparkles className="text-emerald-700" size={24} />,
        action: () => goModule('talent'),
      },
      {
        title: '360评审 Agent',
        body: '设计评审项目、生成问卷、配置关系、收集多方反馈并生成 AI 发展报告。',
        icon: <BrainCircuit className="text-sky-700" size={24} />,
        action: () => goModule('review360'),
      },
      {
        title: '组织诊断',
        body: '结合诊断规则、员工声音、360 差异和 AI 人才模型识别组织管理问题。',
        icon: <BarChart3 className="text-emerald-700" size={24} />,
        action: () => goModule('orgDashboard'),
      },
      {
        title: '诊断规则',
        body: '定义系统如何解释评分差异、开放反馈、员工声音主题和 AI 转型信号。',
        icon: <ClipboardList className="text-indigo-700" size={24} />,
        action: () => goModule('rules'),
      },
      {
        title: '员工声音智能体',
        body: '收集员工日常意见、AI 使用问题和组织卡点，并用 AI 聚类识别重复主题。',
        icon: <FileText className="text-violet-700" size={24} />,
        action: () => goModule('feedback'),
      },
      {
        title: '诊断报告',
        body: '生成组织诊断报告、AI 转型成熟度报告和 30/60/90 天行动计划。',
        icon: <FileText className="text-rose-700" size={24} />,
        action: () => goModule('diagnosisReports'),
      },
      {
        title: '管理员控制台',
        body: '查看账号、项目、任务进度、反馈状态和 AI 报告生成情况。',
        icon: <ShieldCheck className="text-amber-700" size={24} />,
        action: () => goModule('admin'),
      },
    ];
    const visibleModuleCards =
      currentUser?.role === 'admin'
        ? moduleCards
        : currentUser?.role === 'employee'
          ? [
              {
                title: '我的评审任务',
                body: '查看自评和他评待办，提交 360 问卷并查看自己的提交记录。',
                icon: <ClipboardCheck className="text-sky-700" size={24} />,
                action: () => goModule('employee'),
              },
              {
                title: '员工反馈',
                body: '提交组织问题、管理建议、流程问题、AI 使用问题和文化氛围反馈。',
                icon: <FileText className="text-violet-700" size={24} />,
                action: () => goModule('feedback'),
              },
            ]
          : [];

    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalTopNavClean()}

        <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:px-8">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-sky-700">
              组织发展诊断平台
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">
              组织诊断、人才发展与 360 评审智能体
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              当前网站集成了 360 评审智能体，用于帮助组织管理员
              设计评审项目、生成问卷、收集多方反馈、分析能力盲区与组织协作问题，并生成需要
              确认发展反馈报告。
            </p>
          </section>

          <section className="rounded-lg border border-sky-100 bg-sky-50 p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-sm font-bold text-sky-700">
                  {currentUser?.role === 'employee'
                    ? '员工说明'
                    : '管理员流程'}
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  {currentUser?.role === 'employee'
                    ? '这不是个人考试。'
                    : '发现组织问题、能力差距和行动优先级。'}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {currentUser?.role === 'employee'
                    ? '这不是个人考核，也不会自动决定晋升、淘汰或薪酬。你的填写会帮助团队看见真实协作、管理、流程和工具问题。通常需要 5-10 分钟，结果会用于团队改进和后续行动复盘。'
                    : '这是 AI 组织诊断与行动共识平台：从项目创建、诊断设计、证据收集、专家诊断会，到洞察、报告、行动计划和复盘追踪，形成一个完整闭环。'}
                </p>
              </div>
              <div className="grid gap-2 text-sm font-semibold text-slate-700">
                {(
                  currentUser?.role === 'employee'
                    ? ['了解目的', '填写问卷/360', '提交真实反馈', '查看后续说明']
                    : ['创建项目', '设计诊断', '收集证据', '专家辩论', '查看洞察', '生成报告', '行动追踪']
                ).map((step, index, steps) => (
                  <div key={step} className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sky-700">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                    {index < steps.length - 1 ? (
                      <ArrowRight size={16} className="text-sky-500" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleModuleCards.length ? (
              visibleModuleCards.map((card) => (
                <button
                  key={card.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                  onClick={card.action}
                >
                  {card.icon}
                  <h2 className="mt-4 text-xl font-black text-slate-950">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {card.body}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 md:col-span-2 lg:col-span-3">
                请登录后进入对应工作台。未登录用户只展示首页和登录入口。
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  function renderProjectPage() {
    return (
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <Panel
          title={editingProjectId ? '编辑项目' : '创建项目'}
          eyebrow="项目中心是唯一的项目创建入口"
        >
          <form className="grid gap-4" onSubmit={handleProjectSubmit}>
            <Field label="项目名称">
              <input
                className={inputClass}
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, name: event.target.value })
                }
                placeholder="例如：2026 年中层管理者 360 评审"
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="诊断场景">
                <select
                  className={inputClass}
                  value={projectForm.project_type}
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      project_type: event.target.value as Project['project_type'],
                    })
                  }
                >
                  <option value="combined">综合组织诊断</option>
                  <option value="org_diagnosis">组织诊断</option>
                  <option value="review_360">360 评审</option>
                </select>
              </Field>
              <Field label="项目状态">
                <select
                  className={inputClass}
                  value={projectForm.status}
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      status: event.target.value as Project['status'],
                    })
                  }
                >
                  <option value="draft">草稿</option>
                  <option value="active">进行中</option>
                  <option value="completed">已完成</option>
                </select>
              </Field>
            </div>
            <Field label="项目说明">
              <textarea
                className={textareaClass}
                value={projectForm.description}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    description: event.target.value,
                  })
                }
                placeholder="说明本次组织诊断的背景、业务场景和预期成果。"
              />
            </Field>
            <Field label="诊断目标">
              <textarea
                className={textareaClass}
                value={projectForm.purpose}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    purpose: event.target.value,
                  })
                }
                placeholder="例如：识别跨部门协同效率下降的关键原因，并形成可执行的改进行动。"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="开始时间">
                <input
                  className={inputClass}
                  type="date"
                  value={projectForm.start_date}
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      start_date: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="结束时间">
                <input
                  className={inputClass}
                  type="date"
                  value={projectForm.end_date}
                  onChange={(event) =>
                    setProjectForm({
                      ...projectForm,
                      end_date: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
            <Field label="参与对象">
              <textarea
                className={textareaClass}
                value={projectForm.scope}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    scope: event.target.value,
                    target_scope: event.target.value,
                  })
                }
                placeholder="例如：总部 P6-P8 管理者，覆盖产品、研发、销售和职能团队"
              />
            </Field>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                className="mt-1 h-4 w-4 accent-sky-600"
                type="checkbox"
                checked={projectForm.anonymous}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    anonymous: event.target.checked,
                  })
                }
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  匿名收集
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  开启后，少于 3 人的群体不单独展示原始评论，帮助员工更安心表达。
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                <Save size={16} />
                {editingProjectId ? '保存项目' : '创建项目'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setProjectId(null);
                  setEditingProjectId(null);
                  setProjectForm(blankProject);
                }}
              >
                <Plus size={16} />
                新建草稿
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!currentProject}
                onClick={() => currentProject && setEditingProjectId(currentProject.id)}
              >
                编辑当前项目
              </Button>
              {currentProject ? (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => void handleDeleteProject(currentProject)}
                >
                  <Trash2 size={16} />
                  删除当前项目
                </Button>
              ) : null}
            </div>
          </form>
        </Panel>

        <div className="grid gap-4">
          <Panel
            title="AI 接口配置"
            eyebrow={
              aiSettings?.hasModelCredential ||
              aiSettings?.[settingsConfiguredField as keyof AISettings]
                ? '模型调用凭证已配置'
                : '模型调用凭证未配置'
            }
          >
            <form className="grid gap-3" onSubmit={handleSaveAISettings}>
              <Field label="模型调用凭证">
                <input
                  className={inputClass}
                  type={maskedInputType}
                  value={aiForm.modelCredential}
                  onChange={(event) =>
                    setAiForm({
                      ...aiForm,
                      modelCredential: event.target.value,
                    })
                  }
                  placeholder="OpenAI-compatible 模型调用凭证"
                />
              </Field>
              <Field label="模型服务地址">
                <input
                  className={inputClass}
                  value={aiForm.base_url}
                  onChange={(event) =>
                    setAiForm({ ...aiForm, base_url: event.target.value })
                  }
                />
              </Field>
              <Field label="模型名称">
                <input
                  className={inputClass}
                  value={aiForm.model}
                  onChange={(event) =>
                    setAiForm({ ...aiForm, model: event.target.value })
                  }
                />
              </Field>
              <Button type="submit" disabled={busy}>
                <ShieldCheck size={16} />
                保存配置
              </Button>
            </form>
          </Panel>

          <Panel title="项目概览">
            {projects.length ? (
              <div className="grid gap-3">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    className={`rounded-lg border p-3 text-left transition ${
                      project.id === projectId
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => {
                      setProjectId(project.id);
                      setNotice(`已切换到项目「${project.name}」`);
                    }}
                  >
                    <p className="font-bold text-slate-900">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {project.start_date || '未设开始'} 至{' '}
                      {project.end_date || '未设结束'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无项目"
                body="请在项目中心创建第一个诊断项目。创建后，诊断维度、问卷、反馈、报告都会按项目隔离保存。"
              />
            )}
          </Panel>
          <Panel title="项目列表与操作">
            {projects.length ? (
              <div className="grid gap-3">
                {projects.map((project) => (
                  <article
                    key={project.id}
                    className={`rounded-lg border p-4 ${
                      project.id === projectId
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">
                          {project.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {projectTypeLabels[project.project_type]} ·{' '}
                          {displayStatus(project.status)}
                        </p>
                      </div>
                      {project.id === projectId ? (
                        <span className="rounded-lg bg-sky-100 px-2 py-1 text-xs font-bold text-sky-700">
                          当前项目
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {project.description ||
                        project.purpose ||
                        project.scope ||
                        '暂无项目说明'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      参与对象：{project.scope || project.target_scope || '未填写'}
                    </p>
                    <div className="mt-3 grid gap-2 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-xs leading-5 text-slate-600 md:grid-cols-2">
                      <p>
                        <span className="font-semibold text-slate-800">诊断目标：</span>
                        {project.purpose || '未填写'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">创建时间：</span>
                        {project.created_at || '未记录'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">更新时间：</span>
                        {project.updated_at || '未记录'}
                      </p>
                      <p>
                        <span className="font-semibold text-slate-800">当前状态：</span>
                        {displayStatus(project.status)}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setProjectId(project.id);
                          setNotice(`已切换到项目「${project.name}」`);
                        }}
                      >
                        设为当前项目
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setProjectId(project.id);
                          setEditingProjectId(project.id);
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setProjectId(project.id);
                          setEditingProjectId(project.id);
                        }}
                      >
                        查看详情
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => void handleDeleteProject(project)}
                      >
                        删除
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无项目"
                body="请在项目中心填写左侧表单创建第一个诊断项目。"
              />
            )}
          </Panel>
        </div>
      </div>
    );
  }

  function renderQuestionnairePage() {
    const questionnaireDimensions = questionnaire.dimensions ?? [];
    const confirmedHypotheses = diagnosisList.filter(
      (item) => item.status === 'confirmed',
    );
    const availableTalentModels = talentModels.filter(
      (model) => model.status === 'draft' || model.status === 'confirmed',
    );
    return requireProject(
      <div className="grid gap-4">
        <Panel title="问卷如何承接诊断设计" eyebrow="证据收集说明">
          <div className="grid gap-4 text-sm leading-6 text-slate-700">
            <p>
              组织诊断假设回答：“当前组织可能出了什么问题？”组织能力维度回答：“我们从哪些组织能力角度观察问题？”胜任力模型回答：“解决这些组织问题，需要管理者和员工具备哪些能力与行为？”诊断问卷回答：“我们如何收集证据，验证这些假设和能力差距？”
            </p>
            <p>
              问卷不是独立功能，而是证据收集工具。系统会把已确认的诊断假设、组织能力维度和胜任力模型转化为可填写的问题，用来支持后续的数据洞察、AI 专家诊断会、诊断报告和行动计划。
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-bold text-slate-950">组织诊断题</p>
                <p>验证组织问题和组织能力维度。</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-bold text-slate-950">胜任力题</p>
                <p>验证能力标准和行为表现。</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-bold text-slate-950">360 评审题</p>
                <p>收集多视角反馈。</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-bold text-slate-950">开放反馈题</p>
                <p>收集真实描述和补充信息。</p>
              </div>
            </div>
            <div className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sky-900">
              生成顺序：选择问题来源 → 选择目标对象 → 选择问卷长度 → 生成问卷 → 预览与编辑 → 保存到问卷中心。
            </div>
          </div>
        </Panel>
        <Panel title="证据收集方案" eyebrow="证据收集方案">
          <p className="text-sm leading-6 text-slate-600">
            问卷不是独立功能，而是证据收集方案的一部分。一个问卷可以同时包含组织诊断问题、人才/胜任力模型问题、360评审问题和开放反馈问题；生成后统一进入问卷中心，按当前项目隔离管理。
          </p>
        </Panel>
        <Panel
          title="AI 生成胜任力模型"
          eyebrow="胜任力模型"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={handleInspectQuestionnaire}
                disabled={busy || !questionnaireDimensions.length}
              >
                <AlertTriangle size={16} />
                检查题目
              </Button>
              <Button onClick={handleGenerateQuestionnaire} disabled={busy}>
                <Sparkles size={16} />
                AI 生成问卷
              </Button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="岗位">
              <input
                className={inputClass}
                value={generateForm.role}
                onChange={(event) =>
                  setGenerateForm({ ...generateForm, role: event.target.value })
                }
              />
            </Field>
            <Field label="层级">
              <input
                className={inputClass}
                value={generateForm.level}
                onChange={(event) =>
                  setGenerateForm({
                    ...generateForm,
                    level: event.target.value,
                  })
                }
              />
            </Field>
          </div>
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
            AI 仅生成发展反馈草稿，不直接决定晋升、淘汰或薪酬。问卷与报告都需要
            管理员确认。
          </div>
        </Panel>

        <Panel
          title="AI 时代诊断问卷生成"
          eyebrow="组织诊断与胜任力模型"
          actions={
            <Button
              onClick={handleGenerateQuestionnaireFromModel}
              disabled={
                busy ||
                !modelQuestionForm.hypothesis_id ||
                !modelQuestionForm.model_id
              }
            >
              <Sparkles size={16} />
              基于模型生成问卷
            </Button>
          }
        >
          <p className="text-sm leading-6 text-slate-600">
            基于管理员已确认的诊断假设和 AI
            时代人才模型，生成更贴合公司真实问题的评分题、行为观察题和开放题。
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="选择诊断假设">
              <select
                className={inputClass}
                value={modelQuestionForm.hypothesis_id}
                onChange={(event) => {
                  const selected = diagnosisList.find(
                    (item) => item.id === Number(event.target.value),
                  );
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    hypothesis_id: event.target.value,
                    constraints:
                      selected?.constraints || modelQuestionForm.constraints,
                  });
                }}
              >
                <option value="">请选择已确认诊断假设</option>
                {confirmedHypotheses.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} ·{' '}
                    {item.ai_extracted_hypotheses[0]?.hypothesis_title ||
                      item.target_scope}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="选择人才模型">
              <select
                className={inputClass}
                value={modelQuestionForm.model_id}
                onChange={(event) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    model_id: event.target.value,
                  })
                }
              >
                <option value="">请选择已保存人才模型</option>
                {availableTalentModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} · {displayStatus(model.status)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="目标对象">
              <select
                className={inputClass}
                value={modelQuestionForm.target_level}
                onChange={(event) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    target_level: event.target.value,
                  })
                }
              >
                {targetLevelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="问卷长度">
              <select
                className={inputClass}
                value={modelQuestionForm.question_count}
                onChange={(event) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    question_count: Number(event.target.value),
                  })
                }
              >
                <option value={12}>精简版 12题</option>
                <option value={24}>标准版 24题</option>
                <option value={36}>深度版 36题</option>
              </select>
            </Field>
            <Field label="评价关系">
              {renderCheckboxGroup(
                ['自评', '上级', '同级', '下级', '协作方'],
                modelQuestionForm.relation_types,
                (next) =>
                  setModelQuestionForm({
                    ...modelQuestionForm,
                    relation_types: next,
                  }),
              )}
            </Field>
            <Field label="题型">
              <div className="flex flex-wrap gap-2">
                {modelQuestionTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                      modelQuestionForm.question_types.includes(type.value)
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    onClick={() =>
                      setModelQuestionForm({
                        ...modelQuestionForm,
                        question_types: toggleValue(
                          modelQuestionForm.question_types,
                          type.value,
                        ),
                      })
                    }
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="风控边界">
                <textarea
                  className={textareaClass}
                  value={modelQuestionForm.constraints}
                  onChange={(event) =>
                    setModelQuestionForm({
                      ...modelQuestionForm,
                      constraints: event.target.value,
                    })
                  }
                />
              </Field>
            </div>
          </div>

          {false && modelGeneratedQuestions.length ? (
            <div className="mt-5 grid gap-3">
              <p className="text-sm font-bold text-slate-900">
                最近一次基于模型生成的问题
              </p>
              {modelGeneratedQuestions.slice(0, 12).map((question, index) => (
                <div
                  key={`${question.dimension_name}-${index}`}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
                >
                  <p className="font-bold text-slate-950">
                    维度：{question.dimension_name} / 题型：{' '}
                    {question.question_type}
                  </p>
                  <p className="mt-1 text-slate-700">
                    题目：{question.content}
                  </p>
                  <p className="mt-1 text-slate-500">
                    评价关系：{question.relation_scope}
                  </p>
                  {question.open_followup ? (
                    <p className="mt-1 text-slate-500">
                      开放追问：{question.open_followup}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <Panel
          title="问卷维度与行为化题目"
          actions={
            <>
              <Button variant="secondary" onClick={addDimension}>
                <Plus size={16} />
                添加维度
              </Button>
              <Button
                onClick={handleSaveQuestionnaire}
                disabled={busy || !questionnaireDimensions.length}
              >
                <Save size={16} />
                保存问卷
              </Button>
            </>
          }
        >
          {questionnaireDimensions.length ? (
            <div className="grid gap-4">
              {questionnaireDimensions.map((dimension, dimensionIndex) => (
                <div
                  key={dimension.id ?? dimensionIndex}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_auto]">
                    <Field label="维度名称">
                      <input
                        className={inputClass}
                        value={dimension.name}
                        onChange={(event) =>
                          updateDimension(dimensionIndex, {
                            name: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="维度说明">
                      <input
                        className={inputClass}
                        value={dimension.description}
                        onChange={(event) =>
                          updateDimension(dimensionIndex, {
                            description: event.target.value,
                          })
                        }
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      className="self-end"
                      onClick={() => removeDimension(dimensionIndex)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {dimension.questions.map((question, questionIndex) => (
                      <div
                        key={question.id ?? questionIndex}
                        className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]"
                      >
                        <Field label={`题目 ${questionIndex + 1}`}>
                          <input
                            className={inputClass}
                            value={question.text}
                            onChange={(event) =>
                              updateQuestion(dimensionIndex, questionIndex, {
                                text: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <Field label="行为锚点">
                          <textarea
                            className={inputClass}
                            value={question.behavior_anchor}
                            onChange={(event) =>
                              updateQuestion(dimensionIndex, questionIndex, {
                                behavior_anchor: event.target.value,
                              })
                            }
                          />
                        </Field>
                        <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                          <Field label="适用评价关系">
                            <select
                              className={inputClass}
                              value={question.relation_scope ?? 'all'}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  relation_scope: event.target.value,
                                })
                              }
                            >
                              {relationScopeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="评分类型">
                            <select
                              className={inputClass}
                              value={question.rating_type ?? 'score_1_5'}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  rating_type: event.target.value,
                                })
                              }
                            >
                              {ratingTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                        </div>
                        <div className="grid gap-3 md:grid-cols-4 lg:col-span-3">
                          <Field label="问题来源">
                            <select
                              className={inputClass}
                              value={question.source_type ?? 'manual'}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  source_type: event.target.value,
                                })
                              }
                            >
                              <option value="manual">手动添加</option>
                              <option value="hypothesis">组织诊断</option>
                              <option value="talent_model">胜任力模型</option>
                              <option value="ai_model">胜任力模型</option>
                            </select>
                          </Field>
                          <Field label="题目类型">
                            <select
                              className={inputClass}
                              value={question.question_type ?? 'rating'}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  question_type: event.target.value,
                                })
                              }
                            >
                              {modelQuestionTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="开放追问">
                            <input
                              className={inputClass}
                              value={question.open_followup ?? ''}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  open_followup: event.target.value,
                                  behavior_anchor:
                                    question.behavior_anchor ||
                                    event.target.value,
                                })
                              }
                            />
                          </Field>
                          <label className="flex items-center gap-2 self-end text-sm font-semibold text-slate-700">
                            <input
                              type="checkbox"
                              checked={question.required ?? true}
                              onChange={(event) =>
                                updateQuestion(dimensionIndex, questionIndex, {
                                  required: event.target.checked,
                                })
                              }
                            />
                            必填
                          </label>
                        </div>
                        <Button
                          variant="ghost"
                          className="self-end"
                          onClick={() =>
                            removeQuestion(dimensionIndex, questionIndex)
                          }
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      onClick={() => addQuestion(dimensionIndex)}
                    >
                      <Plus size={16} />
                      添加题目
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有问卷题目"
              body="输入岗位和层级后生成胜任力模型，也可以手动添加维度。"
            />
          )}
        </Panel>

        {issues.length ? (
          <Panel title="问卷质量检查结果">
            <div className="grid gap-3">
              {issues.map((issue, index) => (
                <div
                  key={`${issue.type}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {issue.type}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    {issue.question}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {issue.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>,
    );
  }

  function renderEmployeesPage() {
    return requireProject(
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <div className="grid gap-4">
          <Panel title="手动录入员工" eyebrow="员工管理">
            <form className="grid gap-3" onSubmit={handleCreateEmployee}>
              <Field label="姓名">
                <input
                  className={inputClass}
                  value={employeeForm.name}
                  onChange={(event) =>
                    setEmployeeForm({
                      ...employeeForm,
                      name: event.target.value,
                    })
                  }
                  required
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                <Field label="部门">
                  <input
                    className={inputClass}
                    value={employeeForm.department}
                    onChange={(event) =>
                      setEmployeeForm({
                        ...employeeForm,
                        department: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="岗位">
                  <input
                    className={inputClass}
                    value={employeeForm.role}
                    onChange={(event) =>
                      setEmployeeForm({
                        ...employeeForm,
                        role: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="层级">
                  <input
                    className={inputClass}
                    value={employeeForm.level}
                    onChange={(event) =>
                      setEmployeeForm({
                        ...employeeForm,
                        level: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="直属上级">
                  <input
                    className={inputClass}
                    value={employeeForm.manager}
                    onChange={(event) =>
                      setEmployeeForm({
                        ...employeeForm,
                        manager: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Button type="submit" disabled={busy}>
                <UserPlus size={16} />
                添加员工
              </Button>
            </form>
          </Panel>

          <Panel
            title="批量导入"
            actions={
              <Button onClick={handleImportEmployees} disabled={busy}>
                <Upload size={16} />
                导入
              </Button>
            }
          >
            <textarea
              className={textareaClass}
              value={csvText}
              onChange={(event) => setCsvText(event.target.value)}
            />
          </Panel>
        </div>

        <Panel title="员工名单" eyebrow={`${employees.length} 人`}>
          {employees.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                    <th className="py-3 pr-3">姓名</th>
                    <th className="py-3 pr-3">部门</th>
                    <th className="py-3 pr-3">岗位</th>
                    <th className="py-3 pr-3">层级</th>
                    <th className="py-3 pr-3">直属上级</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-slate-100">
                      <td className="py-3 pr-3 font-semibold text-slate-900">
                        {employee.name}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {employee.department || '-'}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {employee.role || '-'}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {employee.level || '-'}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {employee.manager || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="暂无员工"
              body="可以手动录入，也可以粘贴 CSV 或制表符分隔文本批量导入。"
            />
          )}
        </Panel>
      </div>,
    );
  }

  function renderRelationshipsPage() {
    const privacyWarnings = Object.values(
      relationships.reduce<
        Record<string, { subject: string; relation: string; count: number }>
      >((acc, relationship) => {
        if (relationship.relation_type === 'self') return acc;
        const key = `${relationship.subject_employee_id}-${relationship.relation_type}`;
        acc[key] = acc[key] ?? {
          subject: relationship.subject_name,
          relation: relationship.relation_label,
          count: 0,
        };
        acc[key].count += 1;
        return acc;
      }, {}),
    ).filter((item) => item.count > 0 && item.count < 3);

    return requireProject(
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
        <Panel
          title="配置评价人"
          eyebrow="Rater Map"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={handleCreateSelfRelationships}
                disabled={busy || !employees.length}
              >
                <Plus size={16} />
                补齐自评
              </Button>
              <Button
                onClick={handleGenerateTasks}
                disabled={busy || !relationships.length}
              >
                生成员工填写任务
              </Button>
            </>
          }
        >
          {employees.length ? (
            <form className="grid gap-3" onSubmit={handleCreateRelationship}>
              <Field label="被评人">
                <select
                  className={inputClass}
                  value={relationshipForm.subject_employee_id}
                  onChange={(event) =>
                    setRelationshipForm({
                      ...relationshipForm,
                      subject_employee_id: Number(event.target.value),
                    })
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · {employee.department || '未填部门'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="评价人">
                <select
                  className={inputClass}
                  value={relationshipForm.evaluator_employee_id}
                  onChange={(event) =>
                    setRelationshipForm({
                      ...relationshipForm,
                      evaluator_employee_id: Number(event.target.value),
                    })
                  }
                >
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · {employee.department || '未填部门'}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="关系类型">
                <select
                  className={inputClass}
                  value={relationshipForm.relation_type}
                  onChange={(event) =>
                    setRelationshipForm({
                      ...relationshipForm,
                      relation_type: event.target.value as RelationType,
                    })
                  }
                >
                  {relationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" disabled={busy}>
                <Link2 size={16} />
                添加关系
              </Button>
            </form>
          ) : (
            <EmptyState
              title="先添加员工"
              body="员工名单存在后才能配置上级、同级、下级、协作方和自评关系。"
            />
          )}
        </Panel>

        <Panel title="评价关系清单" eyebrow={`${relationships.length} 条`}>
          {relationships.length ? (
            <div className="grid gap-4">
              {privacyWarnings.length ? (
                <div className="grid gap-2">
                  {privacyWarnings.map((item) => (
                    <div
                      key={`${item.subject}-${item.relation}`}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                    >
                      {item.subject} 的{item.relation}评价群体人数少于 3
                      人，不建议单独展示原始评论。
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-normal text-slate-500">
                      <th className="py-3 pr-3">被评人</th>
                      <th className="py-3 pr-3">评价人</th>
                      <th className="py-3 pr-3">关系</th>
                      <th className="py-3 pr-3">状态</th>
                      <th className="py-3 pr-3">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relationships.map((relationship) => (
                      <tr
                        key={relationship.id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3 pr-3 font-semibold text-slate-900">
                          {relationship.subject_name}
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          {relationship.evaluator_name}
                        </td>
                        <td className="py-3 pr-3 text-slate-600">
                          {relationship.relation_label}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${relationship.submitted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                          >
                            {relationship.submitted ? '已提交' : '待填写'}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <Button
                            variant="ghost"
                            onClick={() =>
                              handleDeleteRelationship(relationship.id)
                            }
                          >
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="暂无评价关系"
              body="为每个被评人配置评价人后，问卷填写页会自动生成待办。"
            />
          )}
        </Panel>
      </div>,
    );
  }

  function renderResponsePage() {
    return requireProject(
      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.3fr)]">
        <Panel title="选择待填写关系" eyebrow="Survey">
          {relationships.length ? (
            <div className="grid gap-2">
              {relationships.map((relationship) => (
                <button
                  key={relationship.id}
                  className={`rounded-lg border p-3 text-left transition ${
                    selectedAssignment?.id === relationship.id
                      ? 'border-sky-300 bg-sky-50'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedAssignmentId(relationship.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {relationship.evaluator_name} 评价{' '}
                        {relationship.subject_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {relationship.relation_label}
                      </p>
                    </div>
                    {relationship.submitted ? (
                      <Check className="text-emerald-600" size={18} />
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="暂无填写任务"
              body="先到评价关系页配置评价人。"
            />
          )}
        </Panel>

        <Panel
          title="问卷填写"
          eyebrow={
            selectedAssignment
              ? `${selectedAssignment.evaluator_name} → ${selectedAssignment.subject_name}`
              : undefined
          }
        >
          {selectedAssignment && questions.length ? (
            <form className="grid gap-5" onSubmit={handleSubmitResponse}>
              {(questionnaire.dimensions ?? []).map((dimension) => (
                <div
                  key={dimension.id ?? dimension.name}
                  className="grid gap-3"
                >
                  <div>
                    <h3 className="text-base font-bold text-slate-950">
                      {dimension.name}
                    </h3>
                    {dimension.description ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {dimension.description}
                      </p>
                    ) : null}
                  </div>
                  {dimension.questions.map((question) => (
                    <div
                      key={question.id ?? question.text}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold text-slate-900">
                            {question.text}
                          </p>
                          {question.open_followup ||
                          question.behavior_anchor ? (
                            <p className="mt-1 text-xs text-slate-500">
                              开放追问：
                              {question.open_followup ||
                                question.behavior_anchor}
                            </p>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              type="button"
                              className={`h-9 w-9 rounded-lg text-sm font-bold transition ${
                                scores[question.id ?? 0] === score
                                  ? 'bg-sky-600 text-white'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                              }`}
                              onClick={() =>
                                setScores({
                                  ...scores,
                                  [question.id ?? 0]: score,
                                })
                              }
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        className="mt-3 min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                        value={questionFeedbacks[question.id ?? 0] ?? ''}
                        onChange={(event) =>
                          setQuestionFeedbacks({
                            ...questionFeedbacks,
                            [question.id ?? 0]: event.target.value,
                          })
                        }
                        placeholder="逐题开放反馈：请填写具体场景、观察到的行为和发展建议"
                      />
                    </div>
                  ))}
                </div>
              ))}
              <Field label="开放文本反馈">
                <textarea
                  className={textareaClass}
                  value={responseComment}
                  onChange={(event) => setResponseComment(event.target.value)}
                  placeholder="填写可观察事实、具体场景、建议继续保持或改进的行为"
                />
              </Field>
              <Button type="submit" disabled={busy}>
                <Send size={16} />
                提交问卷
              </Button>
            </form>
          ) : (
            <EmptyState
              title="问卷或任务未就绪"
              body="需要先完成问卷设计，并配置至少一条评价关系。"
            />
          )}
        </Panel>
      </div>,
    );
  }

  function renderAnalyticsPage() {
    return requireProject(
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['完成率', `${analytics?.completion_rate ?? 0}%`],
            ['员工数', analytics?.employee_count ?? 0],
            ['评价关系', analytics?.relationships_count ?? 0],
            ['已提交', analytics?.responses_count ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="各维度平均分">
            {analytics?.dimension_averages.length ? (
              <div className="grid gap-3">
                {analytics.dimension_averages.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-slate-800">
                        {item.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${scoreTone(item.avg_score)}`}
                      >
                        {item.avg_score ?? '-'}
                      </span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-sky-500"
                        style={{
                          width: `${((item.avg_score ?? 0) / 5) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无评分数据"
                body="提交问卷后会显示维度均分。"
              />
            )}
          </Panel>

          <Panel title="不同评价人群体差异">
            {analytics?.group_differences.length ? (
              <div className="grid gap-3">
                {analytics.group_differences.map((item) => (
                  <div
                    key={item.relation_type}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {item.relation_label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.response_count} 份答卷
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-sm font-bold ${scoreTone(item.avg_score)}`}
                    >
                      {item.avg_score ?? '-'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无群体差异"
                body="不同关系类型提交后会自动汇总。"
              />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Panel title="自评与他评差距">
            {analytics?.self_other_gaps.length ? (
              <div className="grid gap-3">
                {analytics.self_other_gaps.map((item) => (
                  <div
                    key={item.employee_id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">
                        {item.employee_name}
                      </p>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${item.gap == null ? 'bg-slate-100 text-slate-500' : Math.abs(item.gap) >= 0.6 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}
                      >
                        差距 {item.gap ?? '-'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      自评 {item.self_avg ?? '-'} · 他评{' '}
                      {item.others_avg ?? '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无差距数据"
                body="需要同时存在自评和他评答卷。"
              />
            )}
          </Panel>

          <Panel title="部门热力图">
            {analytics?.department_heatmap.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                      <th className="py-3 pr-3">部门</th>
                      {heatmap.dimensions.map((dimension) => (
                        <th key={dimension} className="py-3 pr-3">
                          {dimension}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {heatmap.departments.map((department) => (
                      <tr
                        key={department}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3 pr-3 font-bold text-slate-900">
                          {department}
                        </td>
                        {heatmap.dimensions.map((dimension) => {
                          const cell = analytics.department_heatmap.find(
                            (item) =>
                              (item.department || '未填部门') === department &&
                              item.dimension_name === dimension,
                          );
                          return (
                            <td key={dimension} className="py-3 pr-3">
                              <span
                                className={`inline-flex min-w-12 justify-center rounded-lg px-2 py-1 text-xs font-bold ${scoreTone(cell?.avg_score)}`}
                              >
                                {cell?.avg_score ?? '-'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="暂无部门热力图"
                body="员工部门和答卷数据齐备后会自动生成。"
              />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="开放反馈高频主题">
            {analytics?.feedback_themes?.length ? (
              <div className="grid gap-3">
                {analytics.feedback_themes.map((item) => (
                  <div
                    key={item.theme}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >
                    <span className="font-bold text-slate-900">
                      {item.theme}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无反馈主题"
                body="提交逐题文本反馈后会自动汇总高频主题。"
              />
            )}
          </Panel>

          <Panel title="风险提示">
            {analytics?.risk_alerts?.length ? (
              <div className="grid gap-2">
                {analytics.risk_alerts.map((alert) => (
                  <div
                    key={alert}
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900"
                  >
                    {alert}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="暂无风险提示"
                body="评分与反馈数据齐备后会出现自动提示。"
              />
            )}
          </Panel>
        </div>
      </div>,
    );
  }

  function renderReportsPage() {
    return requireProject(
      <div className="grid gap-4">
        <Panel
          title="个人 360 报告"
          eyebrow="管理员确认"
          actions={
            <>
              <select
                className={`${inputClass} w-56`}
                value={reportEmployeeId ?? ''}
                onChange={(event) =>
                  setReportEmployeeId(Number(event.target.value))
                }
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} · {employee.department || '未填部门'}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleGenerateReport}
                disabled={busy || !employees.length}
              >
                <Bot size={16} />
                生成 AI 360 报告
              </Button>
            </>
          }
        >
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="grid content-start gap-2">
              {reports.length ? (
                reports.map((report) => (
                  <button
                    key={report.id}
                    className={`rounded-lg border p-3 text-left transition ${
                      selectedReportId === report.id
                        ? 'border-sky-300 bg-sky-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <p className="font-bold text-slate-900">
                      {report.employee_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.department || '未填部门'}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${report.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
                    >
                      {report.status === 'confirmed' ? '管理员已确认' : '待确认'}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="暂无报告"
                  body="选择员工后生成个人 360 报告草稿。"
                />
              )}
            </div>

            <div className="grid gap-3">
              <textarea
                className="min-h-[520px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                value={reportDraft}
                onChange={(event) => setReportDraft(event.target.value)}
                placeholder="生成后可在此编辑报告内容"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveReport}
                  disabled={busy || !selectedReport}
                >
                  <Save size={16} />
                  保存人工修改
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleConfirmReport}
                  disabled={busy || !selectedReport}
                >
                  <ShieldCheck size={16} />
                  管理员确认报告
                </Button>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            title="组织层面诊断摘要"
            actions={
              <Button onClick={handleGenerateOrgDiagnosis} disabled={busy}>
                <Sparkles size={16} />
                生成组织诊断
              </Button>
            }
          >
            <textarea
              className="min-h-[300px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
              value={orgDiagnosis}
              onChange={(event) => setOrgDiagnosis(event.target.value)}
              placeholder="组织诊断摘要会显示在这里"
            />
          </Panel>

          <Panel title="AI 与人工记录">
            <div className="grid gap-4">
              <div>
                <p className="mb-2 text-sm font-bold text-slate-900">
                  AI 生成记录
                </p>
                <div className="grid gap-2">
                  {aiRuns.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.feature}
                      </p>
                      <p>
                        {entry.model || '-'} ·{' '}
                        {entry.used_fallback ? '本地草稿' : 'AI'}
                      </p>
                    </div>
                  ))}
                  {!aiRuns.length ? (
                    <p className="text-sm text-slate-500">暂无 AI 记录</p>
                  ) : null}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-bold text-slate-900">
                  人工修改记录
                </p>
                <div className="grid gap-2">
                  {editHistory.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border border-slate-200 p-2 text-xs text-slate-600"
                    >
                      <p className="font-semibold text-slate-900">
                        {entry.entity_type}
                      </p>
                      <p>
                        {entry.editor || '管理员'} · {entry.created_at}
                      </p>
                    </div>
                  ))}
                  {!editHistory.length ? (
                    <p className="text-sm text-slate-500">暂无人工修改记录</p>
                  ) : null}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>,
    );
  }

  const renderers: Record<Tab, () => ReactNode> = {
    project: renderProjectPage,
    questionnaire: renderQuestionnairePage,
    employees: renderEmployeesPage,
    relationships: renderRelationshipsPage,
    response: renderResponsePage,
    analytics: renderAnalyticsPage,
    reports: renderReportsPage,
  };

  if (activeModule === 'home') {
    return renderHomePageClean();
  }
  if (activeModule === 'login') {
    return renderLoginPage();
  }
  if (activeModule === 'executiveDashboard') {
    return renderExecutiveDashboardPage();
  }
  if (activeModule === 'projectWorkspace') {
    return renderProjectWorkspacePage();
  }
  if (activeModule === 'organizationDiagnosis') {
    return renderOrganizationDiagnosisOSPage();
  }
  if (activeModule === 'talentOverview') {
    return renderTalentOverviewPage();
  }
  if (activeModule === 'surveyCenter') {
    return renderSurveyCenterPage();
  }
  if (activeModule === 'responseTracking') {
    return renderResponseTrackingPage();
  }
  if (activeModule === 'dashboard') {
    if (currentUser?.role === 'admin') return renderExecutiveDashboardPage();
    if (currentUser?.role === 'employee') return renderMyTasksPage();
    return renderOrganizationDiagnosisOSPage();
  }
  if (activeModule === 'reportsOS') {
    return renderReportsOSPage();
  }
  if (activeModule === 'myTasks' || activeModule === 'surveys') {
    return renderMyTasksPage();
  }
  if (activeModule === 'my360Feedback') {
    return renderEmployeeDashboardPage();
  }
  if (activeModule === 'myCapabilityProfile') {
    return renderMyCapabilityProfilePage();
  }
  if (activeModule === 'organizationFeedback') {
    return renderOrganizationFeedbackOSPage();
  }
  if (activeModule === 'myGrowthReport') {
    return renderReportsOSPage();
  }
  if (activeModule === 'admin') {
    return renderAdminDashboardPage();
  }
  if (activeModule === 'employee') {
    return renderEmployeeDashboardPage();
  }
  if (activeModule === 'feedback') {
    return renderFeedbackPage();
  }
  if (activeModule === 'diagnosis') {
    return renderDiagnosisPage();
  }
  if (activeModule === 'talent') {
    return renderTalentModelPage();
  }
  if (activeModule === 'rules') {
    return renderDiagnosisRulesPage();
  }
  if (activeModule === 'orgDashboard') {
    return renderOrganizationDashboardPage();
  }
  if (activeModule === 'diagnosisReports') {
    return renderDiagnosisReportsPage();
  }
  if (activeModule === 'expertCouncil') {
    return renderExpertCouncilPageClean();
  }
  if (!currentUser) {
    return renderLoginPage();
  }
  if (!isHrUser) {
    return renderEmployeeDashboardPage();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {renderGlobalTopNavClean()}
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <div className="flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-3 text-white">
            <Activity size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">组织发展诊断平台</p>
              <p className="text-xs text-slate-300">360评审助手</p>
            </div>
          </div>
          <nav className="mt-5 grid gap-2">
            <button
              className="flex items-center gap-3 rounded-lg bg-sky-50 px-3 py-2.5 text-left text-sm font-semibold text-sky-700"
              onClick={() => setActiveModule('review360')}
            >
              <BrainCircuit size={18} />
              360评审助手
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('home')}
            >
              <Activity size={18} />
              组织咨询首页
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('diagnosis')}
            >
              <Bot size={18} />
                诊断假设
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('talent')}
            >
              <Sparkles size={18} />
              AI人才模型
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('rules')}
            >
              <ClipboardList size={18} />
              诊断规则
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('orgDashboard')}
            >
              <BarChart3 size={18} />
              组织诊断看板
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('diagnosisReports')}
            >
              <FileText size={18} />
              报告生成
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('admin')}
            >
              <ShieldCheck size={18} />
              管理员控制台
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('employee')}
            >
              <ClipboardCheck size={18} />
              我的评审任务
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={() => goModule('feedback')}
            >
              <FileText size={18} />
              员工反馈
            </button>
            <button
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-950"
              onClick={handleLogout}
            >
              <Users size={18} />
              退出登录
            </button>
          </nav>
          <nav className="mt-4 grid gap-1 border-t border-slate-200 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-sky-50 text-sky-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-[65px] z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sky-700">
                  {currentProject ? currentProject.name : '创建或选择项目'}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">
                  {tabs.find((tab) => tab.key === activeTab)?.label}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`${inputClass} w-64`}
                  value={projectId ?? ''}
                  onChange={(event) =>
                    setProjectId(
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                >
                  <option value="">未选择项目</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  onClick={() => void refreshAll()}
                  disabled={busy}
                >
                  <RefreshCw size={16} />
                  刷新
                </Button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                    activeTab === tab.key
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </header>

          <div className="px-4 py-5 lg:px-8">
            {error ? (
              <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                <span>{notice}</span>
                <button
                  className="text-emerald-900"
                  onClick={() => setNotice('')}
                >
                  关闭
                </button>
              </div>
            ) : null}
            {busy ? (
              <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
                处理中...
              </div>
            ) : null}
            {renderers[activeTab]()}
          </div>
        </main>
      </div>
    </div>
  );
}
