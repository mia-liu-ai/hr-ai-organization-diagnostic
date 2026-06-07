import type {
  ActionPlan,
  AdminDashboard,
  Analytics,
  AuditEntry,
  DiagnosisHypothesis,
  DiagnosisReport,
  DiagnosisRule,
  Employee,
  ExecutiveDashboard,
  FeedbackCluster,
  FeedbackItem,
  ModelGeneratedQuestion,
  OrganizationDashboard,
  OrganizationDiagnosisDimension,
  OrganizationDiagnosisResult,
  OrganizationFeedback,
  OrganizationRisk,
  OSReport,
  Project,
  ProjectProgress,
  Questionnaire,
  Relationship,
  Report,
  ReviewTask,
  Survey,
  TalentModel,
  TalentProfile,
  User,
} from './types';

export const DEMO_STORAGE_KEY = 'hr_ai_demo_dataset_v1';
export const DEMO_SESSION_VALUE = 'demo-session-employee123-admin';

const now = '2026-06-07 09:00:00';

export const demoProjects: Project[] = [
  {
    id: 101,
    name: '组织积极性调动项目',
    description:
      '围绕 AI 转型期的目标牵引、管理授权、跨部门协同和员工积极性进行组织诊断与 360 评审。',
    project_type: 'combined',
    target_scope: '总部管理者与关键协作团队',
    purpose: '组织诊断与发展反馈',
    scope: '产品、研发、销售、交付、人力与运营团队',
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    anonymous: true,
    status: 'active',
    created_at: now,
    updated_at: now,
  },
];

export const demoUsers: User[] = [
  { id: 1, username: 'admin', role: 'admin', employee_id: null, status: 'active', created_at: now },
  { id: 2, username: 'hr', role: 'hr', employee_id: null, status: 'active', created_at: now },
  { id: 3, username: 'boss', role: 'boss', employee_id: null, status: 'active', created_at: now },
  { id: 4, username: 'employee123', role: 'employee', employee_id: 201, employee_name: '陈一诺', status: 'active', created_at: now },
];

export const demoOrgDimensions: OrganizationDiagnosisDimension[] = [
  {
    key: 'strategy_alignment',
    label: '战略共识',
    description: '目标是否清晰、被理解并能转化为团队优先级。',
    questions: [
      { key: 'strategy_alignment_1', text: '我清楚本季度最重要的组织目标。', score_min: 1, score_max: 5 },
      { key: 'strategy_alignment_2', text: '团队目标能被拆解为明确行动。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'management_activation',
    label: '管理激活',
    description: '管理者是否能通过授权、反馈和教练激发积极性。',
    questions: [
      { key: 'management_activation_1', text: '管理者能及时给出有帮助的反馈。', score_min: 1, score_max: 5 },
      { key: 'management_activation_2', text: '关键任务有清晰授权边界。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'collaboration',
    label: '跨部门协同',
    description: '跨团队协作是否顺畅、透明、有共同节奏。',
    questions: [
      { key: 'collaboration_1', text: '跨部门需求能快速对齐优先级。', score_min: 1, score_max: 5 },
      { key: 'collaboration_2', text: '冲突能被及时升级并解决。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'execution',
    label: '执行闭环',
    description: '任务推进、复盘和问题闭环能力。',
    questions: [
      { key: 'execution_1', text: '重要事项有负责人、时间点和验收标准。', score_min: 1, score_max: 5 },
      { key: 'execution_2', text: '复盘能沉淀为下一轮改进。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'employee_voice',
    label: '员工声音',
    description: '员工是否敢于表达、组织是否回应真实问题。',
    questions: [
      { key: 'employee_voice_1', text: '员工能安全表达不同意见。', score_min: 1, score_max: 5 },
      { key: 'employee_voice_2', text: '反馈能被看见并形成后续动作。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'ai_adoption',
    label: 'AI 应用',
    description: 'AI 是否进入真实工作流并提升效率。',
    questions: [
      { key: 'ai_adoption_1', text: '团队会用 AI 辅助完成高频任务。', score_min: 1, score_max: 5 },
      { key: 'ai_adoption_2', text: 'AI 使用经验能在团队中共享。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'talent_density',
    label: '人才密度',
    description: '关键人才是否被识别、发展和保留。',
    questions: [
      { key: 'talent_density_1', text: '关键岗位有清晰继任或备份。', score_min: 1, score_max: 5 },
      { key: 'talent_density_2', text: '高潜员工能获得挑战性任务。', score_min: 1, score_max: 5 },
    ],
  },
  {
    key: 'trust_fairness',
    label: '信任公平',
    description: '规则、评价与资源分配是否透明可信。',
    questions: [
      { key: 'trust_fairness_1', text: '绩效与机会分配标准足够透明。', score_min: 1, score_max: 5 },
      { key: 'trust_fairness_2', text: '团队成员相信组织会公平处理问题。', score_min: 1, score_max: 5 },
    ],
  },
];

export const demoQuestionnaire: Questionnaire = {
  used_fallback: true,
  dimensions: demoOrgDimensions.slice(0, 4).map((dimension, index) => ({
    id: 1000 + index,
    name: dimension.label,
    description: dimension.description,
    sort_order: index,
    questions: dimension.questions.map((question, qIndex) => ({
      id: 2000 + index * 10 + qIndex,
      text: question.text,
      content: question.text,
      behavior_anchor: `${dimension.label}的可观察行为示例`,
      question_type: qIndex % 2 === 0 ? 'rating' : 'open_feedback',
      relation_scope: 'all',
      rating_type: 'score_1_5',
      open_followup: '请补充一个具体场景或例子。',
      weight: 1,
      sort_order: qIndex,
    })),
  })),
};

export const demoQuestionnaires: Survey[] = [
  {
    id: 301,
    project_id: 101,
    survey_type: 'review_360',
    title: '管理者 360 发展反馈问卷',
    description: '覆盖管理激活、协同、执行闭环与 AI 应用。',
    status: 'active',
    created_by: 1,
    created_at: now,
    task_status: 'pending',
    submitted_count: 6,
    pending_count: 2,
    completion_rate: 75,
  },
  {
    id: 302,
    project_id: 101,
    survey_type: 'org_diagnosis',
    title: '组织积极性与协同诊断问卷',
    description: '覆盖八大组织能力维度。',
    status: 'active',
    created_by: 1,
    created_at: now,
    task_status: 'pending',
    submitted_count: 5,
    pending_count: 3,
    completion_rate: 63,
  },
];

export const demoEmployees: Employee[] = [
  { id: 201, project_id: 101, name: '陈一诺', department: '产品部', role: '产品经理', level: 'P7', manager: '林嘉' },
  { id: 202, project_id: 101, name: '林嘉', department: '产品部', role: '产品负责人', level: 'M2', manager: '周远' },
  { id: 203, project_id: 101, name: '王澈', department: '研发部', role: '后端负责人', level: 'M1', manager: '周远' },
  { id: 204, project_id: 101, name: '赵晴', department: '销售部', role: '销售经理', level: 'P7', manager: '周远' },
  { id: 205, project_id: 101, name: '孙墨', department: '交付部', role: '交付经理', level: 'P6', manager: '林嘉' },
  { id: 206, project_id: 101, name: '许岩', department: '人力部', role: 'HRBP', level: 'P6', manager: '周远' },
  { id: 207, project_id: 101, name: '周远', department: '管理层', role: '事业部负责人', level: 'M3', manager: '' },
  { id: 208, project_id: 101, name: '刘澜', department: '运营部', role: '运营专家', level: 'P6', manager: '林嘉' },
];

export const demoRelationships: Relationship[] = [
  { id: 401, project_id: 101, subject_employee_id: 201, evaluator_employee_id: 201, relation_type: 'self', relation_label: '自评', subject_name: '陈一诺', evaluator_name: '陈一诺', submitted: 0 },
  { id: 402, project_id: 101, subject_employee_id: 202, evaluator_employee_id: 201, relation_type: 'direct_report', relation_label: '下级', subject_name: '林嘉', evaluator_name: '陈一诺', submitted: 0 },
  { id: 403, project_id: 101, subject_employee_id: 203, evaluator_employee_id: 201, relation_type: 'peer', relation_label: '同级', subject_name: '王澈', evaluator_name: '陈一诺', submitted: 1 },
  { id: 404, project_id: 101, subject_employee_id: 201, evaluator_employee_id: 202, relation_type: 'manager', relation_label: '上级', subject_name: '陈一诺', evaluator_name: '林嘉', submitted: 1 },
];

export const demoTasks: ReviewTask[] = demoRelationships.map((item) => ({
  id: item.id,
  project_id: item.project_id,
  project_name: demoProjects[0].name,
  reviewee_id: item.subject_employee_id,
  reviewer_id: item.evaluator_employee_id,
  reviewee_name: item.subject_name,
  reviewer_name: item.evaluator_name,
  relation_type: item.relation_type,
  relation_label: item.relation_label,
  status: item.submitted ? 'submitted' : 'pending',
  end_date: '2026-06-30',
  created_at: now,
  submitted_at: item.submitted ? now : null,
}));

export const demoHypotheses: DiagnosisHypothesis[] = [
  '目标拆解不充分导致团队积极性下降',
  '中层授权边界不清造成重复确认',
  '跨部门优先级冲突消耗关键人才',
  'AI 工具使用停留在个人效率层',
  '反馈机制弱导致员工声音无法闭环',
].map((title, index) => ({
  id: 501 + index,
  project_id: 101,
  created_by: 1,
  target_scope: '总部管理者与关键协作团队',
  diagnosis_purpose: ['组织诊断', '发展反馈', 'AI转型诊断'],
  company_stage: 'AI转型期',
  hr_core_judgment: '组织积极性不足并非单点绩效问题，而是目标、授权、协同和反馈机制共同作用。',
  target_talent: '中层管理者、关键项目负责人、高潜员工',
  focus_issues: ['目标拆解', '跨部门协同', '管理授权', '员工反馈', 'AI使用'],
  constraints: '不用于淘汰、薪酬或晋升直接决策，所有结论需 HR 人工确认。',
  expected_outputs: ['组织诊断报告', 'AI转型成熟度报告', '30/60/90天行动计划'],
  ai_extracted_hypotheses: [
    {
      hypothesis_title: title,
      hypothesis_detail: `假设 ${index + 1}：${title}，需要通过 360 评分、开放反馈和组织诊断问卷共同验证。`,
      problem_type: index === 3 ? 'ai_transformation' : index === 1 ? 'manager' : 'organization',
      suggested_validation_method: '对比自评/他评差异、部门热力图和开放反馈主题。',
      suggested_data_sources: ['360评分', '开放反馈', '组织诊断问卷', '项目访谈记录'],
      related_talent_dimensions: ['管理激活', '跨部门协同', '执行闭环'],
    },
  ],
  status: 'confirmed',
  created_at: now,
  updated_at: now,
  used_fallback: true,
}));

export const demoTalentModels: TalentModel[] = [
  {
    id: 601,
    project_id: 101,
    hypothesis_id: 501,
    template: 'AI-native Manager Model',
    name: 'AI 原生管理者胜任力模型',
    description: '用于识别管理者在 AI 转型期的目标牵引、授权、协同和反馈能力。',
    source_type: 'demo',
    status: 'confirmed',
    dimensions: ['目标牵引', '授权与教练', '跨部门协同', 'AI 工作流设计'].map((name, index) => ({
      id: 610 + index,
      name,
      description: `${name}能力维度`,
      low_behavior: '依赖个人经验，缺少结构化方法。',
      medium_behavior: '能在典型场景稳定应用。',
      high_behavior: '能带动团队形成可复制机制。',
      applicable_roles: '管理者, 项目负责人',
      weight: 1,
      sample_rating_questions: [`他/她在${name}上表现稳定。`],
      sample_open_questions: [`请举例说明他/她在${name}上的具体行为。`],
    })),
  },
  {
    id: 602,
    project_id: 101,
    hypothesis_id: 504,
    template: 'High Potential AI Talent Model',
    name: '高潜 AI 协作人才模型',
    description: '用于识别能把 AI 能力转化为业务成果的高潜员工。',
    source_type: 'demo',
    status: 'confirmed',
    dimensions: ['学习敏捷', '问题定义', 'AI 协作', '业务落地'].map((name, index) => ({
      id: 620 + index,
      name,
      description: `${name}能力维度`,
      low_behavior: '等待明确指令，主动探索不足。',
      medium_behavior: '能在明确任务中使用 AI 提升效率。',
      high_behavior: '能重构任务流程并分享方法。',
      applicable_roles: '全员, 高潜员工',
      weight: 1,
      sample_rating_questions: [`他/她在${name}上有可观察表现。`],
      sample_open_questions: [`请描述一个${name}相关场景。`],
    })),
  },
];

export const demoModelQuestions: ModelGeneratedQuestion[] =
  demoQuestionnaire.dimensions.flatMap((dimension) =>
    dimension.questions.map((question) => ({
      id: question.id,
      project_id: 101,
      hypothesis_id: 501,
      model_id: 601,
      dimension_id: dimension.id,
      dimension_name: dimension.name,
      content: question.text,
      question_type: question.question_type || 'rating',
      relation_scope: question.relation_scope,
      rating_type: question.rating_type,
      open_followup: question.open_followup || '',
      weight: question.weight || 1,
    })),
  );

export const demoAnalytics: Analytics = {
  employee_count: 8,
  relationships_count: 16,
  responses_count: 11,
  completion_rate: 69,
  dimension_averages: demoQuestionnaire.dimensions.map((dimension, index) => ({
    id: dimension.id || index,
    name: dimension.name,
    avg_score: [3.2, 3.4, 2.9, 3.6][index] ?? 3.3,
    score_count: 22,
  })),
  group_differences: [
    { relation_type: 'manager', relation_label: '上级', avg_score: 3.8, response_count: 3, score_count: 24 },
    { relation_type: 'peer', relation_label: '同级', avg_score: 3.1, response_count: 4, score_count: 32 },
    { relation_type: 'direct_report', relation_label: '下级', avg_score: 2.9, response_count: 4, score_count: 32 },
  ],
  self_other_gaps: [
    { employee_id: 201, employee_name: '陈一诺', self_avg: 4.1, others_avg: 3.2, gap: 0.9 },
    { employee_id: 202, employee_name: '林嘉', self_avg: 4.0, others_avg: 3.0, gap: 1.0 },
  ],
  department_heatmap: [
    { department: '产品部', dimension_name: '战略共识', avg_score: 3.5 },
    { department: '产品部', dimension_name: '跨部门协同', avg_score: 2.8 },
    { department: '研发部', dimension_name: '执行闭环', avg_score: 3.7 },
    { department: '销售部', dimension_name: '管理激活', avg_score: 3.0 },
  ],
  feedback_themes: [
    { theme: '目标变化频繁', count: 5 },
    { theme: '跨部门等待时间长', count: 4 },
    { theme: 'AI 工具缺少团队规范', count: 3 },
  ],
  risk_alerts: ['中层管理者自评与他评差异较大', '跨部门协同维度低于 3.0', 'AI 使用缺少治理与复盘机制'],
};

export const demoFeedback: FeedbackItem[] = [
  {
    id: 701,
    user_id: 4,
    employee_id: 201,
    username: 'employee123',
    employee_name: '陈一诺',
    category: 'collaboration',
    title: '跨部门需求优先级不清',
    content: '产品和交付对同一客户需求的优先级理解不同，导致反复返工。',
    anonymous: 0,
    status: 'new',
    priority: 'high',
    ai_summary: '跨部门优先级与决策机制需要明确。',
    created_at: now,
    updated_at: now,
  },
  {
    id: 702,
    user_id: null,
    employee_id: null,
    username: null,
    employee_name: null,
    category: 'ai_usage',
    title: 'AI 使用经验没有沉淀',
    content: '大家都在试 AI，但好用的提示词和流程没有共享。',
    anonymous: 1,
    status: 'reviewing',
    priority: 'normal',
    ai_summary: 'AI 应用需要团队级工作流和知识库。',
    created_at: now,
    updated_at: now,
  },
];

export const demoOrganizationFeedback: OrganizationFeedback[] = [
  { id: 801, project_id: 101, user_id: 4, username: 'employee123', feedback_type: 'collaboration', content: '跨部门例会有信息同步，但缺少最终拍板人。', is_anonymous: false, created_at: now },
  { id: 802, project_id: 101, user_id: null, username: null, feedback_type: 'ai_tools', content: 'AI 工具使用标准不统一，担心数据边界。', is_anonymous: true, created_at: now },
];

export const demoFeedbackClusters: FeedbackCluster[] = [
  { id: 901, project_id: 101, theme: '目标与优先级不稳定', summary: '多个团队提到目标变化后缺少同步和重新排序。', evidence_count: 5, related_departments: ['产品部', '交付部'], risk_level: 'high', suggested_action: '建立周度优先级仲裁机制。', created_by: 1, created_at: now },
  { id: 902, project_id: 101, theme: 'AI 使用缺少组织规范', summary: '员工愿意使用 AI，但缺少场景库、数据边界和复盘。', evidence_count: 3, related_departments: ['研发部', '运营部'], risk_level: 'medium', suggested_action: '建立 AI 工作流样板和使用红线。', created_by: 1, created_at: now },
];

export const demoRisks: OrganizationRisk[] = [
  { id: 1001, project_id: 101, risk_type: 'collaboration', title: '跨部门协同摩擦', description: '协同维度评分低且开放反馈重复出现等待和返工。', evidence_json: { score: 2.9, mentions: 4 }, affected_scope: '产品-交付-研发', risk_level: 'high', suggested_action: '设立跨部门优先级会议和单一负责人。', status: 'open', created_at: now, updated_at: now },
  { id: 1002, project_id: 101, risk_type: 'ai_governance', title: 'AI 应用分散', description: 'AI 使用停留在个人层面，缺少组织复用。', evidence_json: { mentions: 3 }, affected_scope: '全员', risk_level: 'medium', suggested_action: '沉淀 5 个高频 AI 工作流样板。', status: 'open', created_at: now, updated_at: now },
];

export const demoDiagnosisRules: DiagnosisRule[] = [
  { id: 1101, project_id: 101, hypothesis_id: 501, model_id: 601, rule_name: '自评高于他评', condition_type: 'self_other_gap', condition_json: { threshold: 0.8 }, diagnosis_text: '自我认知和他人感知存在差异，需要结合具体行为反馈。', risk_level: 'medium', suggested_action: '安排反馈面谈并聚焦可观察行为。', evidence_sources: ['360评分', '开放反馈'], created_at: now, updated_at: now },
  { id: 1102, project_id: 101, hypothesis_id: 503, model_id: 601, rule_name: '协同维度低分', condition_type: 'low_dimension_score', condition_json: { dimension: '跨部门协同', threshold: 3 }, diagnosis_text: '跨团队协作可能存在目标冲突或决策延迟。', risk_level: 'high', suggested_action: '建立跨部门优先级仲裁和升级机制。', evidence_sources: ['部门热力图', '反馈主题'], created_at: now, updated_at: now },
];

export const demoTalentProfiles: TalentProfile[] = demoEmployees.slice(0, 4).map((employee, index) => ({
  id: 1201 + index,
  project_id: 101,
  user_id: employee.id === 201 ? 4 : 20 + index,
  username: employee.id === 201 ? 'employee123' : employee.name,
  talent_type: ['ai_leverager', 'growth_driver', 'stable_operator', 'explorer'][index],
  talent_type_label: ['AI 杠杆型人才', '增长驱动型人才', '稳定交付型人才', '探索型人才'][index],
  dimension_scores_json: { 目标牵引: 3.6, 协同: 3.1, AI协作: 3.8, 执行闭环: 3.5 },
  dimension_scores: { 目标牵引: 3.6, 协同: 3.1, AI协作: 3.8, 执行闭环: 3.5 },
  native_strength: '能主动把 AI 工具嵌入日常任务，并愿意分享方法。',
  ai_collaboration_level: 'L3',
  best_fit_tasks: ['AI 工作流试点', '跨部门需求澄清', '知识库沉淀'],
  not_recommended_tasks: ['高度重复且无优化空间的事务'],
  recommended_agents: ['会议纪要 Agent', '需求澄清 Agent'],
  growth_suggestion: '下一阶段重点提升跨部门影响力和结构化复盘。',
  created_at: now,
  updated_at: now,
}));

export const demoReports: Report[] = [
  { id: 1301, project_id: 101, employee_id: 201, employee_name: '陈一诺', department: '产品部', content: '陈一诺在 AI 协作和需求澄清上有优势，建议提升跨部门影响力。', status: 'draft', ai_run_id: null, created_at: now, updated_at: now, confirmed_at: null },
];

export const demoOSReports: OSReport[] = [
  { id: 1401, project_id: 101, report_type: 'hr_report', user_id: null, title: '组织积极性调动诊断报告', content: '核心结论：积极性问题来自目标、授权、协同和反馈闭环四个机制短板。建议 30 天内完成目标重排和跨部门机制试点。', created_at: now, updated_at: now },
  { id: 1402, project_id: 101, report_type: 'employee_report', user_id: 4, title: '陈一诺个人成长报告', content: '优势：AI 协作、问题定义。发展建议：提高跨部门推动中的决策同步能力。', created_at: now, updated_at: now },
];

export const demoDiagnosisReports: DiagnosisReport[] = [
  { id: 1501, project_id: 101, hypothesis_id: 501, model_id: 601, report_type: '组织诊断报告', title: '组织积极性与协同诊断报告', content: '诊断摘要：当前组织积极性下降主要由目标拆解、授权边界和跨部门协同摩擦造成。行动建议：建立 30/60/90 天节奏。', status: 'draft', created_by: 1, confirmed_by: null, confirmed_at: null, created_at: now, updated_at: now, used_fallback: true },
];

export const demoActionPlans: ActionPlan[] = [
  { id: 1601, project_id: 101, report_id: 1501, owner_id: null, target_type: 'organization', target_id: null, title: '30 天：目标与优先级重排', description: '统一本季度目标、关键战役和跨部门依赖。', timeline: '30天', status: 'todo', ai_generated: true, created_at: now, updated_at: now },
  { id: 1602, project_id: 101, report_id: 1501, owner_id: null, target_type: 'organization', target_id: null, title: '60 天：跨部门协同机制试点', description: '在产品-研发-交付链路试点单一负责人和升级机制。', timeline: '60天', status: 'todo', ai_generated: true, created_at: now, updated_at: now },
  { id: 1603, project_id: 101, report_id: 1501, owner_id: null, target_type: 'organization', target_id: null, title: '90 天：AI 工作流沉淀', description: '沉淀高频 AI 工作流、提示词模板和数据使用边界。', timeline: '90天', status: 'todo', ai_generated: true, created_at: now, updated_at: now },
];

export const demoOrgResult: OrganizationDiagnosisResult = {
  project_id: 101,
  dimension_scores_json: {
    strategy_alignment: 3.4,
    management_activation: 3.1,
    collaboration: 2.9,
    execution: 3.5,
    employee_voice: 3.0,
    ai_adoption: 3.2,
    talent_density: 3.3,
    trust_fairness: 3.1,
  },
  dimension_scores: {
    strategy_alignment: 3.4,
    management_activation: 3.1,
    collaboration: 2.9,
    execution: 3.5,
    employee_voice: 3.0,
    ai_adoption: 3.2,
    talent_density: 3.3,
    trust_fairness: 3.1,
  },
  total_score: 3.2,
  maturity_level: 'L2 AI 流程增强型',
  summary: '组织具备转型意愿，但管理激活、跨部门协同和 AI 工作流机制仍需补强。',
  sample: true,
};

export const demoExecutiveDashboard: ExecutiveDashboard = {
  project_id: 101,
  organization_maturity: 'L2 AI 流程增强型',
  organization_health: 68,
  ai_native_readiness: 56,
  dimension_scores: demoOrgResult.dimension_scores,
  key_risks: demoAnalytics.risk_alerts,
  talent_distribution: [
    { talent_type: 'ai_leverager', label: 'AI 杠杆型人才', count: 2 },
    { talent_type: 'growth_driver', label: '增长驱动型人才', count: 2 },
    { talent_type: 'stable_operator', label: '稳定交付型人才', count: 3 },
    { talent_type: 'explorer', label: '探索型人才', count: 1 },
  ],
  review360_summary: {
    completion_rate: demoAnalytics.completion_rate,
    dimension_averages: demoAnalytics.dimension_averages,
  },
  organization_feedback: {
    theme_distribution: [
      { feedback_type: 'collaboration', count: 4 },
      { feedback_type: 'ai_tools', count: 3 },
      { feedback_type: 'management', count: 2 },
    ],
    risk_count: 2,
    summary: '员工反馈集中在协同、目标稳定性和 AI 使用规范。',
    recent_feedback: demoOrganizationFeedback,
  },
  action_plan: [
    { period: '30天', action: '完成目标重排和关键依赖澄清。' },
    { period: '60天', action: '试点跨部门优先级仲裁机制。' },
    { period: '90天', action: '沉淀 AI 工作流样板并纳入复盘。' },
  ],
  sample: true,
};

export const demoOrganizationDashboard: OrganizationDashboard = {
  project_id: 101,
  completion: { total: 16, submitted: 11, pending: 5, completion_rate: 69 },
  talent_model_performance: {
    dimension_averages: demoAnalytics.dimension_averages,
    high_dimensions: demoAnalytics.dimension_averages.filter((item) => (item.avg_score || 0) >= 3.5),
    low_dimensions: demoAnalytics.dimension_averages.filter((item) => (item.avg_score || 0) < 3.2),
    department_differences: demoAnalytics.department_heatmap,
    level_differences: [
      { level: 'M1', dimension_name: '管理激活', avg_score: 3.0 },
      { level: 'P7', dimension_name: '跨部门协同', avg_score: 2.9 },
    ],
  },
  score_differences: {
    self_other_gaps: demoAnalytics.self_other_gaps,
    group_differences: demoAnalytics.group_differences,
    risk_alerts: demoAnalytics.risk_alerts,
    explanation: '自评与他评差异、协同低分和反馈主题共同指向管理机制问题。',
  },
  employee_voice: demoFeedbackClusters,
  organization_risks: demoRisks,
  diagnosis_rules: demoDiagnosisRules,
  high_potential_signals: {
    count: 2,
    employees: [
      { id: 201, name: '陈一诺', department: '产品部', avg_score: 3.8, dimension_summary: 'AI 协作和问题定义突出' },
      { id: 204, name: '赵晴', department: '销售部', avg_score: 3.7, dimension_summary: '客户洞察强' },
    ],
    notice: '仅用于发展建议，不用于直接人事决策。',
  },
  ai_transformation_bottlenecks: [
    { title: 'AI 使用分散', risk_level: 'medium', suggested_action: '建立场景库和数据边界。' },
    { title: '跨部门流程未重构', risk_level: 'high', suggested_action: '选择一个端到端流程试点。' },
  ],
  empty_state: '',
};

export const demoAdminDashboard: AdminDashboard = {
  project_count: 1,
  employee_count: 8,
  pending_tasks: 5,
  submitted_tasks: 11,
  completion_rate: 69,
  latest_feedback: demoFeedback,
  latest_reports: demoReports,
};

export const demoProjectProgress: ProjectProgress = {
  project_id: 101,
  total: 16,
  submitted: 11,
  pending: 5,
  completion_rate: 69,
  by_department: [
    { department: '产品部', total: 5, submitted: 3, pending: 2, completion_rate: 60 },
    { department: '研发部', total: 4, submitted: 3, pending: 1, completion_rate: 75 },
    { department: '销售部', total: 3, submitted: 2, pending: 1, completion_rate: 67 },
  ],
  by_employee: demoEmployees.slice(0, 4).map((employee, index) => ({
    employee_id: employee.id,
    name: employee.name,
    department: employee.department,
    total: 2,
    submitted: index % 2 === 0 ? 1 : 2,
    pending: index % 2 === 0 ? 1 : 0,
    completion_rate: index % 2 === 0 ? 50 : 100,
  })),
};

export const demoAiRuns: AuditEntry[] = [
  { id: 1701, feature: 'AI 专家诊断会', model: 'demo-fallback', used_fallback: 1, created_at: now },
  { id: 1702, feature: '问卷生成', model: 'demo-fallback', used_fallback: 1, created_at: now },
];

export const demoEditHistory: AuditEntry[] = [
  { id: 1801, entity_type: 'questionnaire', entity_id: 101, editor: 'HR', created_at: now },
  { id: 1802, entity_type: 'diagnosis_report', entity_id: 1501, editor: 'HR', created_at: now },
];

export const demoData = {
  projects: demoProjects,
  users: demoUsers,
  organizationDimensions: demoOrgDimensions,
  questionnaire: demoQuestionnaire,
  questionnaires: demoQuestionnaires,
  employees: demoEmployees,
  relationships: demoRelationships,
  tasks: demoTasks,
  hypotheses: demoHypotheses,
  talentModels: demoTalentModels,
  modelQuestions: demoModelQuestions,
  analytics: demoAnalytics,
  feedback: demoFeedback,
  organizationFeedback: demoOrganizationFeedback,
  feedbackClusters: demoFeedbackClusters,
  risks: demoRisks,
  diagnosisRules: demoDiagnosisRules,
  talentProfiles: demoTalentProfiles,
  reports: demoReports,
  osReports: demoOSReports,
  diagnosisReports: demoDiagnosisReports,
  actionPlans: demoActionPlans,
  orgResult: demoOrgResult,
  executiveDashboard: demoExecutiveDashboard,
  organizationDashboard: demoOrganizationDashboard,
  adminDashboard: demoAdminDashboard,
  projectProgress: demoProjectProgress,
  aiRuns: demoAiRuns,
  editHistory: demoEditHistory,
};

export type DemoData = typeof demoData;

export function cloneDemoData(): DemoData {
  return JSON.parse(JSON.stringify(demoData)) as DemoData;
}

export function readDemoData(): DemoData {
  if (typeof localStorage === 'undefined') return cloneDemoData();
  const stored = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!stored) return cloneDemoData();
  try {
    return { ...cloneDemoData(), ...JSON.parse(stored) } as DemoData;
  } catch {
    return cloneDemoData();
  }
}

export function writeDemoData(next: DemoData) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
  }
}

export function initializeDemoData() {
  const data = cloneDemoData();
  writeDemoData(data);
  return data;
}

export function demoUserForUsername(username: string): User {
  return (
    demoUsers.find((user) => user.username === username) ||
    demoUsers.find((user) => user.username === 'employee123') ||
    demoUsers[0]
  );
}
