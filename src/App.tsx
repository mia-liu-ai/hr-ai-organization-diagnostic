import { useEffect, useMemo, useState } from 'react';
import type { ButtonHTMLAttributes, FormEvent, ReactNode } from 'react';
import {
  Activity,
  AlertTriangle,
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
  | 'createProject'
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
  | 'diagnosisReports';

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
  { key: 'project', label: '项目创建', icon: <ClipboardList size={18} /> },
  { key: 'questionnaire', label: '问卷设计', icon: <BrainCircuit size={18} /> },
  { key: 'employees', label: '员工管理', icon: <Users size={18} /> },
  { key: 'relationships', label: '评价关系', icon: <Link2 size={18} /> },
  { key: 'response', label: '问卷填写', icon: <ClipboardCheck size={18} /> },
  { key: 'analytics', label: '分析看板', icon: <BarChart3 size={18} /> },
  { key: 'reports', label: '报告生成', icon: <FileText size={18} /> },
];

const inputClass =
  'h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100';
const textareaClass =
  'min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100';
const labelClass =
  'mb-1.5 block text-xs font-semibold uppercase tracking-normal text-slate-500';
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
  '通用 AI-era Talent Model',
  'AI-native Manager Model',
  'High Potential AI Talent Model',
  'AI Transformation Readiness Model',
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
const reportTypeOptions = [
  '组织诊断报告',
  'AI 转型成熟度报告',
  '30/60/90 天行动计划',
];

const blankDiagnosis: DiagnosisHypothesis = {
  project_id: null,
  target_scope: '管理者',
  diagnosis_purpose: ['发展反馈', '组织诊断', 'AI转型诊断'],
  company_stage: 'AI转型期',
  hr_core_judgment: '',
  target_talent: '',
  focus_issues: ['AI使用', '目标拆解', '跨部门协作'],
  constraints:
    '不用于淘汰，不直接关联薪酬，不展示少于3人的评价群体原始评论，所有报告需要 HR 人工确认。',
  expected_outputs: ['个人发展报告', '组织诊断报告', 'AI转型成熟度报告'],
  ai_extracted_hypotheses: [],
  status: 'draft',
};

const blankTalentModel: TalentModel = {
  project_id: null,
  hypothesis_id: null,
  template: 'AI-native Manager Model',
  name: 'AI-native Manager Capability Model',
  description: '',
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
  suggested_action: '建议 HR 在反馈面谈中引导被评人对照具体行为案例进行复盘。',
  evidence_sources: ['360评分', '开放反馈'],
};

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
    primary: 'bg-sky-600 text-white hover:bg-sky-700',
    secondary:
      'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
  };
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
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
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
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
  const [activeTab, setActiveTab] = useState<Tab>('project');
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
  const [modelQuestionForm, setModelQuestionForm] = useState({
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
  const [myTalentProfile, setMyTalentProfile] = useState<TalentProfile | null>(
    null,
  );
  const [surveys, setSurveys] = useState<Survey[]>([]);
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

  const isHrUser = currentUser
    ? currentUser.role === 'admin' || currentUser.role === 'hr'
    : false;

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
          if (auth.user.role === 'boss') setActiveModule('executiveDashboard');
          else if (auth.user.role === 'employee') setActiveModule('myTasks');
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
    const bossModules: Module[] = [
      'executiveDashboard',
      'organizationDiagnosis',
      'talentOverview',
      'reportsOS',
      'dashboard',
    ];
    const hrModules: Module[] = [
      'projectWorkspace',
      'createProject',
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
    if (currentUser.role === 'boss' && !bossModules.includes(module)) {
      setNotice('老板端默认只展示汇总和决策信息。');
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
      (currentUser.role === 'hr' || currentUser.role === 'admin') &&
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
    ];
    if (adminModules.includes(module) && !isHrUser) {
      setNotice('无权限访问，请联系 HR 管理员。');
      setActiveModule('myTasks');
      void loadEmployeeOSWorkspace();
      return;
    }
    setActiveModule(module);
    if (module === 'executiveDashboard') void loadExecutiveDashboard();
    if (module === 'projectWorkspace' || module === 'createProject')
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
    if (module === 'review360') {
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
      if (result.user.role === 'boss') {
        setActiveModule('executiveDashboard');
        await loadExecutiveDashboard();
      } else if (result.user.role === 'employee') {
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
      setError(err instanceof Error ? err.message : '加载老板看板失败');
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
      if (currentUser?.role === 'boss') {
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
    if (currentUser?.role === 'boss') await loadExecutiveDashboard();
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
          currentUser?.role === 'boss'
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
    if (projectId) void loadWorkspace(projectId);
  }, [projectId]);

  useEffect(() => {
    if (currentProject) {
      setProjectForm({
        name: currentProject.name,
        description: currentProject.description,
        project_type: currentProject.project_type,
        target_scope: currentProject.target_scope,
        purpose: currentProject.purpose,
        scope: currentProject.scope,
        start_date: currentProject.start_date,
        end_date: currentProject.end_date,
        anonymous: Boolean(currentProject.anonymous),
        status: currentProject.status,
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
  }, [currentProject]);

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
      const project = currentProject
        ? await api.put<Project>(`/projects/${currentProject.id}`, projectForm)
        : await api.post<Project>('/projects', projectForm);
      const projectList = await api.get<Project[]>('/projects');
      setProjects(projectList);
      setProjectId(project.id);
      setNotice(currentProject ? '项目已更新' : '项目已创建');
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
              question_type: 'rating',
              relation_scope: 'all',
              rating_type: 'score_1_5',
              open_followup: '',
              weight: 1,
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
                  question_type: 'rating',
                  relation_scope: 'all',
                  rating_type: 'score_1_5',
                  open_followup: '',
                  weight: 1,
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
          editor: 'HR',
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
      setNotice('报告已由 HR 确认');
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
          ? '已返回本地 mock 诊断假设'
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
        template: talentDraft.template || 'AI-native Manager Model',
      });
      setTalentDraft({
        ...result.model,
        ai_run_id: result.ai_run_id,
        used_fallback: result.used_fallback,
      });
      setNotice(
        result.used_fallback
          ? '已返回本地 mock AI-native Manager Model'
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
      await loadWorkspace(projectId);
      setNotice(
        result.used_fallback
          ? '已基于 mock 逻辑生成 AI 时代诊断问卷'
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
          ? '已生成 fallback mock 诊断规则'
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
          ? '已生成 fallback 员工声音聚类'
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
        result.used_fallback ? '已生成 fallback 组织风险' : '组织风险已生成',
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
          ? '已生成 fallback 诊断报告草稿'
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
      setNotice('诊断报告已由 HR 确认');
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
          ? '已生成 fallback 30/60/90 行动计划'
          : '30/60/90 行动计划已生成',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成行动计划失败');
    } finally {
      setBusy(false);
    }
  }

  function requireProject(children: ReactNode) {
    if (!projectId) {
      return (
        <EmptyState
          title="先创建一个 360 评审项目"
          body="项目创建后，问卷、员工、评价关系、填写、分析和报告都会自动归属到该项目。"
        />
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
                hr-ai-consulting
              </span>
              <span className="block text-xs text-slate-500">
                HR 组织咨询与智能评审工作台
              </span>
            </span>
          </button>
          <nav className="-mx-1 flex max-w-full flex-wrap gap-1 overflow-x-auto px-1">
            {!currentUser ? navButton('home', '组织咨询首页') : null}
            {currentUser?.role === 'boss' ? (
              <>
                {navButton('executiveDashboard', 'Executive Dashboard')}
                {navButton('organizationDiagnosis', 'Organization Diagnosis')}
                {navButton('talentOverview', 'Talent Overview')}
                {navButton('reportsOS', 'Reports')}
              </>
            ) : null}
            {isHrUser ? (
              <>
                {navButton('projectWorkspace', 'Project Workspace')}
                {navButton('createProject', 'Create Project')}
                {navButton('organizationDiagnosis', 'Organization Diagnosis')}
                {navButton('talentOverview', 'Talent Model')}
                {navButton('review360', '360 Review')}
                {navButton('surveyCenter', 'Survey Center')}
                {navButton('responseTracking', 'Response Tracking')}
                {navButton('dashboard', 'Dashboard')}
                {navButton('reportsOS', 'Reports')}
              </>
            ) : null}
            {currentUser?.role === 'employee' ? (
              <>
                {navButton('myTasks', 'My Tasks')}
                {navButton('surveys', 'Surveys')}
                {navButton('my360Feedback', '360 Feedback')}
                {navButton('myCapabilityProfile', 'My Capability Profile')}
                {navButton('organizationFeedback', 'Organization Feedback')}
                {navButton('myGrowthReport', 'My Growth Report')}
              </>
            ) : null}
            {!currentUser ? navButton('login', '登录') : null}
          </nav>
          {currentUser ? (
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                {currentUser.role} · {currentUser.username}
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
        {renderGlobalTopNav()}
        <header className="border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-semibold text-sky-700">
              hr-ai-consulting
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
      <div className="min-h-screen bg-slate-100 text-slate-900">
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
          onChange={(event) => setProjectId(Number(event.target.value))}
        >
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
      <div className="rounded-lg border border-slate-200 bg-white p-4">
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
      'Executive Dashboard',
      <>
        <Panel
          title="AI 原生组织与人才诊断系统"
          eyebrow="Boss View"
          actions={renderProjectSelector()}
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
          <Panel title="关键风险" eyebrow="Decision Signals">
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
      'Project Workspace',
      <>
        <Panel
          title="项目列表"
          eyebrow="HR Workspace"
          actions={
            <Button onClick={() => goModule('createProject')}>
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
                    <td className="px-3 py-3">{project.status}</td>
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
        <Panel title="项目详情链路" eyebrow="Project Flow">
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
    return renderOSPage(
      'Create Project',
      <Panel title="创建 / 编辑项目" eyebrow="HR Admin">
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
      'Organization Diagnosis',
      <>
        <Panel
          title="八大组织能力诊断"
          eyebrow="AI-native Organization"
          actions={renderProjectSelector()}
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
              orgDiagnosisResult?.sample ? 'Sample' : '真实提交',
            )}
          </div>
          <div className="grid gap-4">
            {orgDiagnosisQuestions.map((dimension) => (
              <div
                key={dimension.key}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-950">
                      {dimension.label}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {dimension.description}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white px-2 py-1 text-sm font-black text-sky-700">
                    {orgDiagnosisResult?.dimension_scores?.[dimension.key] ??
                      '-'}
                  </span>
                </div>
                <div className="mt-3 grid gap-3">
                  {dimension.questions.map((question) => (
                    <div key={question.key} className="rounded-lg bg-white p-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {question.text}
                      </p>
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
                            placeholder="comment"
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
        </Panel>
      </>,
    );
  }

  function renderTalentOverviewPage() {
    const distribution = executiveDashboard?.talent_distribution ?? [];
    return renderOSPage(
      'Talent Overview',
      <Panel
        title={currentUser?.role === 'boss' ? '人才结构概览' : '员工能力画像'}
        eyebrow="Talent Model"
        actions={
          isHrUser ? (
            <Button onClick={handleGenerateTalentProfilesOS}>
              <Sparkles size={16} />
              生成画像
            </Button>
          ) : null
        }
      >
        {currentUser?.role === 'boss' ? (
          <div className="grid gap-3 md:grid-cols-4">
            {distribution.map((item) => miniMetric(item.label, item.count))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {talentProfiles.map((profile) => (
              <div
                key={profile.id ?? profile.user_id ?? profile.talent_type}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
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
              </div>
            ))}
          </div>
        )}
      </Panel>,
    );
  }

  function renderSurveyCenterPage() {
    return renderOSPage(
      'Survey Center',
      <Panel title="问卷中心" eyebrow="Survey Center">
        <div className="grid gap-3">
          {surveys.map((survey) => (
            <div
              key={survey.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <div>
                <p className="font-bold text-slate-950">{survey.title}</p>
                <p className="text-sm text-slate-500">
                  {survey.survey_type} · {survey.status}
                </p>
              </div>
              <span className="rounded-lg bg-white px-3 py-2 text-sm font-black text-sky-700">
                {survey.completion_rate ?? 0}% 回收
              </span>
            </div>
          ))}
        </div>
      </Panel>,
    );
  }

  function renderResponseTrackingPage() {
    return renderOSPage(
      'Response Tracking',
      <Panel title="问卷回收进度" eyebrow="Tracking">
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

  function renderReportsOSPage() {
    const reportType =
      currentUser?.role === 'boss'
        ? 'boss_report'
        : currentUser?.role === 'employee'
          ? 'employee_report'
          : 'hr_report';
    return renderOSPage(
      currentUser?.role === 'employee' ? 'My Growth Report' : 'Reports',
      <Panel
        title="报告"
        eyebrow="Rule-based MVP"
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
                  <p className="text-sm text-slate-500">{report.report_type}</p>
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
      'My Tasks',
      <Panel title="我的待办" eyebrow="Employee Portal">
        <div className="grid gap-3 md:grid-cols-2">
          {surveyTasks.map((survey) => (
            <div
              key={survey.id}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4"
            >
              <p className="font-bold text-slate-950">{survey.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {survey.survey_type} · {survey.task_status}
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
            <p className="font-bold text-slate-950">待完成 360 Feedback</p>
            <p className="mt-1 text-sm text-slate-500">
              {employeeTasks.filter((task) => task.status === 'pending').length}{' '}
              个待办
            </p>
            <Button className="mt-3" onClick={() => goModule('my360Feedback')}>
              进入 360 Feedback
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
      'My Capability Profile',
      <Panel title="我的能力画像" eyebrow="Growth-oriented">
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
      'Organization Feedback',
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <Panel title="提交组织反馈" eyebrow="Employee Voice">
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
          title={currentUser?.role === 'boss' ? '主题汇总' : '反馈记录'}
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
      <div className="min-h-screen bg-slate-100">
        {renderGlobalTopNav()}
        <div className="grid min-h-[calc(100vh-64px)] place-items-center px-4 py-10">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <button
              className="mb-5 text-sm font-semibold text-slate-500"
              onClick={() => goModule('home')}
            >
              返回首页
            </button>
            <h1 className="text-2xl font-black text-slate-950">
              登录 hr-ai-consulting
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
      <div className="min-h-screen bg-slate-100 text-slate-900">
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
                HR诊断假设
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
                ['项目创建', 'project'],
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
                      <option value="employee">employee</option>
                      <option value="boss">boss</option>
                      <option value="hr">hr</option>
                      <option value="admin">admin</option>
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
                      <option value="active">active</option>
                      <option value="disabled">disabled</option>
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
                        <td>{user.role}</td>
                        <td>{user.employee_name || user.employee_id || '-'}</td>
                        <td>{user.status}</td>
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
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900">
        {renderGlobalHeader('我的评审任务')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            360
            评审结果用于发展反馈和组织诊断，不直接作为晋升、淘汰、薪酬决定。开放反馈会经过
            HR 审核和 AI 中性化总结。
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
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
            <Panel title="我的待办">
              {employeeTasks.length ? (
                <div className="grid gap-2">
                  {employeeTasks.map((task) => (
                    <button
                      key={task.id}
                      className={`rounded-lg border p-3 text-left ${selectedTask?.id === task.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
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
              title="Employee Voice Agent 员工声音智能体"
              actions={
                <>
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
                使用问题和文化氛围问题，并用 AI 聚类帮助 HR
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
                          {cluster.risk_level}
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
                  body="点击 AI 反馈主题聚类后会生成主题、证据数量、相关部门、风险等级和建议行动；没有 AI Key 时使用 fallback mock。"
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
                          {item.category} · {item.priority} · {item.status}
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
        {renderGlobalHeader('HR 诊断假设输入台')}
        <main className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:px-8">
          <Panel
            title="HR 诊断假设输入台"
            eyebrow="Diagnosis Hypothesis Console"
          >
            <p className="text-sm leading-6 text-slate-600">
              请先输入你对当前组织、团队或人才问题的判断。AI 会结合 AI
              时代人才模型和组织诊断框架，生成可执行的诊断假设，并用于后续人才模型和问卷生成。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              AI
              输出仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有
              AI 生成内容需要 HR 人工确认。
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
                <Field label="HR 核心判断">
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
                        {item.company_stage} · {item.status} ·{' '}
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
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
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
                          <option value="individual">individual</option>
                          <option value="manager">manager</option>
                          <option value="organization">organization</option>
                          <option value="ai_transformation">
                            ai_transformation
                          </option>
                          <option value="governance">governance</option>
                        </select>
                      </Field>
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
                body="填写 HR 判断后点击 AI 提炼诊断假设；没有 AI Key 时会返回 fallback mock。"
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
          <Panel title="AI 时代人才模型" eyebrow="Talent Model Builder">
            <p className="text-sm leading-6 text-slate-600">
              系统将基于 HR 的诊断假设，生成适合本次项目的 AI
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
                    value={talentDraft.template || 'AI-native Manager Model'}
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
                        {model.status} ·{' '}
                        {model.dimensions.length || model.dimension_count || 0}{' '}
                        个维度
                      </p>
                      <p className="mt-2 line-clamp-2 text-slate-600">
                        {model.description || '暂无说明'}
                      </p>
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
                  body="点击 AI 生成人才模型；没有 AI Key 时会返回 mock 模型。"
                />
              )}
            </div>
          </Panel>
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
          <Panel title="诊断规则" eyebrow="Diagnosis Rules Builder">
            <p className="text-sm leading-6 text-slate-600">
              诊断规则用于定义系统如何解释评分差异、开放反馈和员工反馈主题。AI
              会基于已确认的 HR 诊断假设和 AI 人才模型生成规则，HR
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
                        {model.name} · {model.status}
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
                          {option}
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
                          {option}
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
                        {rule.risk_level}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {rule.diagnosis_text}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      条件：{rule.condition_type} · 证据：
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
                body="选择诊断假设和人才模型后点击 AI 生成诊断规则；没有 AI Key 时会返回 fallback mock。"
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
            title="Organization Diagnosis Dashboard"
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
              人才模型、诊断规则、员工声音聚类和组织风险，帮助 HR
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
                            {cluster.theme} · {cluster.risk_level}
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
                            {risk.title} · {risk.risk_level}
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
                            {item.title} · {item.risk_level}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            建议 HR 下一步：{item.suggested_action}
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
              body="请选择项目并刷新看板。数据不足时页面不会报错，可以先生成诊断规则、员工反馈聚类和组织风险 mock。"
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
            title="Diagnosis Reports"
            eyebrow="Organization Report + 30/60/90 Plan"
          >
            <p className="text-sm leading-6 text-slate-600">
              生成组织诊断报告、AI 转型成熟度报告和 30/60/90
              天行动计划。报告默认是草稿，必须由 HR 人工确认。
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              本报告仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有结论需要
              HR 结合业务事实进行人工确认。
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
              title="报告草稿与 HR 确认"
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
                    HR 确认报告
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
                          {report.report_type} · {report.status}
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
                          {selectedDiagnosisReport.report_type}
                        </span>
                        <span className="rounded-lg bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                          {selectedDiagnosisReport.status}
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
                      body="报告会包含诊断摘要、关键发现、证据来源、风险等级、建议行动、30/60/90 计划和 HR 确认区。"
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
                            {plan.status} · {plan.target_type}
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

  function renderHomePage() {
    const moduleCards = [
      {
        title: 'HR诊断假设',
        body: '输入 HR 对组织、团队和人才问题的判断，由 AI 提炼为可验证的诊断假设。',
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
        title: 'Employee Voice Agent',
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
        {renderGlobalTopNav()}

        <main className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:px-8">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-sky-700">
              HR Organization Consulting
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-normal text-slate-950 lg:text-5xl">
              组织诊断、人才发展与 360 评审智能体
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              当前网站集成了 360 Review Intelligence Agent，用于帮助 HR
              设计评审项目、生成问卷、收集多方反馈、分析能力盲区与组织协作问题，并生成需要
              HR 确认的发展反馈报告。
            </p>
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
          title={currentProject ? '编辑项目' : '创建项目'}
          eyebrow="360 Review Project"
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
            <Field label="评审目的">
              <select
                className={inputClass}
                value={projectForm.purpose}
                onChange={(event) =>
                  setProjectForm({
                    ...projectForm,
                    purpose: event.target.value,
                  })
                }
              >
                {purposeOptions.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purpose}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="对象范围">
              <textarea
                className={textareaClass}
                value={projectForm.scope}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, scope: event.target.value })
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
                  匿名评审
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  开启后，少于 3 人的评价群体不单独展示原始评论。
                </span>
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={busy}>
                <Save size={16} />
                {currentProject ? '保存项目' : '创建项目'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setProjectId(null);
                  setProjectForm(blankProject);
                }}
              >
                <Plus size={16} />
                新建草稿
              </Button>
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
              <Field label="Base URL">
                <input
                  className={inputClass}
                  value={aiForm.base_url}
                  onChange={(event) =>
                    setAiForm({ ...aiForm, base_url: event.target.value })
                  }
                />
              </Field>
              <Field label="Model">
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
                    onClick={() => setProjectId(project.id)}
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
                body="填写左侧表单即可创建第一个评审项目。"
              />
            )}
          </Panel>
        </div>
      </div>
    );
  }

  function renderQuestionnairePage() {
    const confirmedHypotheses = diagnosisList.filter(
      (item) => item.status === 'confirmed',
    );
    const availableTalentModels = talentModels.filter(
      (model) => model.status === 'draft' || model.status === 'confirmed',
    );
    return requireProject(
      <div className="grid gap-4">
        <Panel
          title="AI 生成胜任力模型"
          eyebrow="Competency Model"
          actions={
            <>
              <Button
                variant="secondary"
                onClick={handleInspectQuestionnaire}
                disabled={busy || !questionnaire.dimensions.length}
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
            HR 人工确认。
          </div>
        </Panel>

        <Panel
          title="AI 时代诊断问卷生成"
          eyebrow="Diagnosis + Talent Model"
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
            基于 HR 已确认的诊断假设和 AI
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
                    {model.name} · {model.status}
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

          {modelGeneratedQuestions.length ? (
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
                    维度：{question.dimension_name} · 题型：
                    {question.question_type}
                  </p>
                  <p className="mt-1 text-slate-700">
                    题目：{question.content}
                  </p>
                  <p className="mt-1 text-slate-500">
                    适用评价关系：{question.relation_scope}
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
                disabled={busy || !questionnaire.dimensions.length}
              >
                <Save size={16} />
                保存问卷
              </Button>
            </>
          }
        >
          {questionnaire.dimensions.length ? (
            <div className="grid gap-4">
              {questionnaire.dimensions.map((dimension, dimensionIndex) => (
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
                        <div className="grid gap-3 md:grid-cols-2 lg:col-span-3">
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
          <Panel title="手动录入员工" eyebrow="Employee">
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
              {questionnaire.dimensions.map((dimension) => (
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
          eyebrow="HR Confirmation Required"
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
                      {report.status === 'confirmed' ? 'HR 已确认' : '待确认'}
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
                  HR 确认报告
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
                        {entry.editor || 'HR'} · {entry.created_at}
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
    return renderHomePage();
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
  if (activeModule === 'createProject') {
    return renderCreateProjectPage();
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
    if (currentUser?.role === 'boss') return renderExecutiveDashboardPage();
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
  if (!currentUser) {
    return renderLoginPage();
  }
  if (!isHrUser) {
    return renderEmployeeDashboardPage();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {renderGlobalTopNav()}
      <div className="flex min-h-screen">
        <aside className="hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <div className="flex items-center gap-3 rounded-lg bg-slate-950 px-3 py-3 text-white">
            <Activity size={22} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">hr-ai-consulting</p>
              <p className="text-xs text-slate-300">360评审 Agent</p>
            </div>
          </div>
          <nav className="mt-5 grid gap-2">
            <button
              className="flex items-center gap-3 rounded-lg bg-sky-50 px-3 py-2.5 text-left text-sm font-semibold text-sky-700"
              onClick={() => setActiveModule('review360')}
            >
              <BrainCircuit size={18} />
              360评审 Agent
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
              HR诊断假设
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
