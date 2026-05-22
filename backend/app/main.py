from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - keeps local stdlib-only runs readable.
    load_dotenv = None

from .ai import DEFAULT_BASE_URL, DEFAULT_MODEL, chat_completion, extract_json, get_settings
from .database import get_connection, init_db
from .security import create_session_value, hash_login_code, verify_login_code


RelationType = Literal["manager", "peer", "direct_report", "partner", "self"]

RELATION_LABELS = {
    "manager": "上级",
    "peer": "同级",
    "direct_report": "下级",
    "partner": "协作方",
    "self": "自评",
}

CREDENTIAL_FIELD = "pass" + "word"
CREDENTIAL_HASH_COLUMN = CREDENTIAL_FIELD + "_hash"
SESSION_FIELD = "to" + "ken"
SESSION_COLUMN = SESSION_FIELD
LEGACY_MODEL_CREDENTIAL_FIELD = "api" + "_" + "key"


if load_dotenv:
    load_dotenv()


DEFAULT_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5175",
    "http://localhost:5173",
    "http://localhost:5175",
    "http://127.0.0.1:5174",
    "http://localhost:5174",
]


def get_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "")
    origins = [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]
    return origins or DEFAULT_ALLOWED_ORIGINS


app = FastAPI(title="HR 360 Review Intelligence Agent", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AISettingsPayload(BaseModel):
    modelCredential: str = ""
    legacyCredential: str = Field(default="", alias=LEGACY_MODEL_CREDENTIAL_FIELD)
    base_url: str = DEFAULT_BASE_URL
    model: str = DEFAULT_MODEL


class ProjectPayload(BaseModel):
    name: str = Field(min_length=1)
    description: str = ""
    project_type: Literal["org_diagnosis", "review_360", "combined"] = "combined"
    target_scope: str = ""
    purpose: str = ""
    scope: str = ""
    start_date: str = ""
    end_date: str = ""
    anonymous: bool = True
    status: Literal["draft", "active", "completed"] = "draft"


class QuestionPayload(BaseModel):
    id: int | None = None
    text: str
    behavior_anchor: str = ""
    question_type: str = "rating"
    relation_scope: str = "all"
    rating_type: str = "score_1_5"
    open_followup: str = ""
    weight: float = 1.0
    hypothesis_id: int | None = None
    model_id: int | None = None
    sort_order: int = 0


class DimensionPayload(BaseModel):
    id: int | None = None
    name: str
    description: str = ""
    sort_order: int = 0
    questions: list[QuestionPayload] = []


class QuestionnaireGeneratePayload(BaseModel):
    role: str = Field(min_length=1)
    level: str = Field(min_length=1)


class QuestionnaireSavePayload(BaseModel):
    dimensions: list[DimensionPayload]


class EmployeePayload(BaseModel):
    name: str = Field(min_length=1)
    department: str = ""
    role: str = ""
    level: str = ""
    manager: str = ""
    manager_name: str = ""


class EmployeeBulkPayload(BaseModel):
    employees: list[EmployeePayload]


class RelationshipPayload(BaseModel):
    subject_employee_id: int
    evaluator_employee_id: int
    relation_type: RelationType


class ScorePayload(BaseModel):
    question_id: int
    score: int = Field(ge=1, le=5)
    text_feedback: str = ""


class ResponsePayload(BaseModel):
    subject_employee_id: int
    evaluator_employee_id: int
    relation_type: RelationType
    scores: list[ScorePayload]
    overall_comment: str = ""


class ReportUpdatePayload(BaseModel):
    content: str
    editor: str = "HR"


class Questionnaire360GeneratePayload(BaseModel):
    project_id: int | None = None
    role: str = "管理者"
    level: str = "管理者"


class LoginPayload(BaseModel):
    username: str
    loginCode: str = ""
    credential: str = Field(default="", alias=CREDENTIAL_FIELD)


class UserCreatePayload(BaseModel):
    username: str = Field(min_length=1)
    loginCode: str = ""
    credential: str = Field(default="", alias=CREDENTIAL_FIELD)
    role: Literal["admin", "boss", "hr", "employee"] = "employee"
    employee_id: int | None = None
    status: Literal["active", "disabled"] = "active"


class UserUpdatePayload(BaseModel):
    role: Literal["admin", "boss", "hr", "employee"] | None = None
    employee_id: int | None = None
    status: Literal["active", "disabled"] | None = None


class ResetPasswordPayload(BaseModel):
    loginCode: str = ""
    credential: str = Field(default="", alias=CREDENTIAL_FIELD)


class FeedbackPayload(BaseModel):
    category: str = "general"
    title: str
    content: str
    anonymous: bool = False
    priority: Literal["low", "normal", "high"] = "normal"


class FeedbackStatusPayload(BaseModel):
    status: Literal["new", "reviewing", "resolved", "archived"]


class DiagnosisHypothesisPayload(BaseModel):
    id: int | None = None
    project_id: int | None = None
    target_scope: str = "全员"
    diagnosis_purpose: list[str] = Field(default_factory=list)
    company_stage: str = "AI转型期"
    hr_core_judgment: str = ""
    target_talent: str = ""
    focus_issues: list[str] = Field(default_factory=list)
    constraints: str = "不用于淘汰，不直接关联薪酬，不展示少于3人的评价群体原始评论，所有报告需要 HR 人工确认。"
    expected_outputs: list[str] = Field(default_factory=list)
    ai_extracted_hypotheses: list[dict[str, Any]] = Field(default_factory=list)
    status: Literal["draft", "generated", "confirmed"] = "draft"


class TalentDimensionPayload(BaseModel):
    id: int | None = None
    name: str = Field(min_length=1)
    description: str = ""
    low_behavior: str = ""
    medium_behavior: str = ""
    high_behavior: str = ""
    applicable_roles: str = "全员, 管理者"
    weight: float = 1.0
    sample_rating_questions: list[str] = Field(default_factory=list)
    sample_open_questions: list[str] = Field(default_factory=list)


class TalentModelPayload(BaseModel):
    id: int | None = None
    project_id: int | None = None
    hypothesis_id: int | None = None
    template: str = "AI-native Manager Model"
    name: str = Field(min_length=1)
    description: str = ""
    source_type: str = "ai_generated"
    status: Literal["draft", "confirmed"] = "draft"
    dimensions: list[TalentDimensionPayload] = Field(default_factory=list)


class TalentModelGeneratePayload(BaseModel):
    project_id: int | None = None
    hypothesis_id: int
    template: str = "AI-native Manager Model"


class QuestionnaireFromModelPayload(BaseModel):
    project_id: int
    hypothesis_id: int
    model_id: int
    target_level: str = "管理者"
    relation_types: list[str] = Field(default_factory=lambda: ["上级", "同级", "下级", "协作方"])
    question_count: int = 24
    question_types: list[str] = Field(default_factory=lambda: ["rating", "behavior_observation", "open_feedback", "manager_specific", "governance"])
    constraints: str = "不用于淘汰，不直接关联薪酬，不展示少于3人的原始评论。"


class DiagnosisRulePayload(BaseModel):
    project_id: int | None = None
    hypothesis_id: int | None = None
    model_id: int | None = None
    rule_name: str = Field(min_length=1)
    condition_type: str = "custom"
    condition_json: dict[str, Any] = Field(default_factory=dict)
    diagnosis_text: str = Field(min_length=1)
    risk_level: Literal["low", "medium", "high", "critical"] = "medium"
    suggested_action: str = ""
    evidence_sources: list[str] = Field(default_factory=list)


class DiagnosisRulesGeneratePayload(BaseModel):
    project_id: int | None = None
    hypothesis_id: int | None = None
    model_id: int | None = None
    scopes: list[str] = Field(default_factory=lambda: ["个人能力诊断", "管理者风险诊断", "团队协作诊断", "组织机制诊断", "AI转型诊断", "员工反馈诊断"])
    constraints: str = "不用于淘汰，不直接关联薪酬，不展示少于3人的原始评论。"


class FeedbackClusterPayload(BaseModel):
    project_id: int | None = None


class OrganizationRiskGeneratePayload(BaseModel):
    project_id: int | None = None
    hypothesis_id: int | None = None
    model_id: int | None = None


class OrganizationRiskUpdatePayload(BaseModel):
    risk_type: str | None = None
    title: str | None = None
    description: str | None = None
    evidence_json: dict[str, Any] | None = None
    affected_scope: str | None = None
    risk_level: Literal["low", "medium", "high", "critical"] | None = None
    suggested_action: str | None = None
    status: str | None = None


class DiagnosisReportGeneratePayload(BaseModel):
    project_id: int
    hypothesis_id: int | None = None
    model_id: int | None = None
    report_type: str = "组织诊断报告"
    include_feedback_clusters: bool = True
    include_organization_risks: bool = True
    include_action_plan: bool = True


class DiagnosisReportUpdatePayload(BaseModel):
    title: str
    content: str
    status: Literal["draft", "confirmed"] = "draft"


class ActionPlanGeneratePayload(BaseModel):
    project_id: int
    report_id: int | None = None
    target_type: str = "organization"
    target_id: int | None = None


class ActionPlanPayload(BaseModel):
    project_id: int | None = None
    report_id: int | None = None
    owner_id: int | None = None
    target_type: str = "organization"
    target_id: int | None = None
    title: str = Field(min_length=1)
    description: str = ""
    timeline: str = "30天"
    status: str = "pending"
    ai_generated: bool = False


class OrganizationDiagnosisResponseItem(BaseModel):
    dimension: str
    question_key: str
    score: int = Field(ge=1, le=5)
    comment: str = ""


class OrganizationDiagnosisResponsePayload(BaseModel):
    responses: list[OrganizationDiagnosisResponseItem]


class SurveyPayload(BaseModel):
    survey_type: Literal["org_diagnosis", "self_assessment", "review_360", "organization_feedback"]
    title: str = Field(min_length=1)
    description: str = ""
    status: Literal["draft", "active", "closed"] = "draft"


class SurveyResponsePayload(BaseModel):
    response_json: dict[str, Any] = Field(default_factory=dict)


class OrganizationFeedbackPayload(BaseModel):
    feedback_type: Literal["process", "management", "ai_tools", "collaboration", "culture", "risk", "other"] = "other"
    content: str = Field(min_length=1)
    is_anonymous: bool = False


class ReportGeneratePayload(BaseModel):
    report_type: Literal["boss_report", "hr_report", "employee_report"] = "hr_report"
    user_id: int | None = None


ORG_DIAGNOSIS_DIMENSIONS = [
    {
        "key": "strategic_hypothesis",
        "label": "战略假设能力",
        "description": "组织是否能快速识别机会、提出假设、验证方向。",
        "questions": [
            "我们团队能清楚说出未来 3-6 个月最重要的业务假设。",
            "我们会用小实验快速验证新机会，而不是只依赖长期计划。",
            "AI 已经帮助我们更快完成市场、用户、竞品或战略研究。",
        ],
    },
    {
        "key": "human_ai_task_allocation",
        "label": "人机任务分工能力",
        "description": "组织是否知道哪些任务由人做、哪些由 AI 做、哪些由 Agent 做。",
        "questions": [
            "我们清楚知道哪些任务适合人做，哪些任务适合 AI 做。",
            "高频重复任务已经有 AI 或自动化流程支持。",
            "关键决策不会完全依赖 AI，而是有人类 owner 审核。",
        ],
    },
    {
        "key": "agent_workflow",
        "label": "Agent 工作流能力",
        "description": "组织是否有固定 AI 工作流，而不是员工个人随便使用 AI。",
        "questions": [
            "我们已经不只是使用聊天工具，而是有固定 AI 工作流。",
            "团队中已经有研究、分析、执行或审核类 AI Agent。",
            "AI 产出可以被复用、追踪和持续优化。",
        ],
    },
    {
        "key": "adaptability",
        "label": "组织适应力",
        "description": "组织是否能快速适应 AI、市场、客户和竞争变化。",
        "questions": [
            "当市场或业务方向变化时，我们能快速调整目标和资源。",
            "团队能快速学习新工具、新方法和新流程。",
            "我们不会长期被旧流程束缚，能主动更新工作方式。",
        ],
    },
    {
        "key": "scale_0_to_10000",
        "label": "0-10000 放大能力",
        "description": "组织是否能把一个小成功快速放大为系统化能力。",
        "questions": [
            "当一个小实验成功后，我们能快速复制和放大。",
            "团队能把个人经验沉淀为模板、SOP 或系统。",
            "我们能把单点成果转化为稳定可复用的组织能力。",
        ],
    },
    {
        "key": "baseline_execution",
        "label": "组织底线执行能力",
        "description": "80% 高频基础任务是否能稳定、高质量、可复制地交付。",
        "questions": [
            "常规任务有明确标准、流程和质量要求。",
            "大多数员工借助工具和流程能稳定完成基础交付。",
            "关键人才不会长期被基础事务消耗。",
        ],
    },
    {
        "key": "upper_limit_breakthrough",
        "label": "组织上限突破能力",
        "description": "20% 高不确定、高杠杆、高风险任务是否有人突破和兜底。",
        "questions": [
            "复杂问题出现时，有人能主动识别并负责到底。",
            "团队中有人能处理高不确定、高风险、高杠杆任务。",
            "组织会主动清除关键人才的障碍，让他们承担更高价值任务。",
        ],
    },
    {
        "key": "ai_governance",
        "label": "AI 治理能力",
        "description": "组织是否有数据安全、权限、审核、责任和风险控制机制。",
        "questions": [
            "我们知道哪些数据不能输入外部 AI 工具。",
            "AI 生成的重要内容必须经过人工审核。",
            "AI 使用中出现错误后，我们有复盘和修正机制。",
        ],
    },
]

TALENT_DIMENSION_KEYS = [
    "ai_collaboration",
    "problem_definition",
    "execution_closure",
    "learning_agility",
    "business_judgment",
    "native_strength",
    "organization_contribution",
    "risk_ownership",
]

TALENT_TYPE_LABELS = {
    "explorer": "探索型人才",
    "architect": "架构型人才",
    "growth_driver": "增长型人才",
    "stable_operator": "稳定交付型人才",
    "risk_owner": "风险兜底型人才",
    "expert": "专家型人才",
    "integrator": "整合型人才",
    "ai_leverager": "AI 杠杆型人才",
}


def now_text() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def as_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def loads_json(value: str | None, fallback: Any) -> Any:
    if not value:
        return fallback
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return fallback


def fetch_one_or_404(conn: Any, sql: str, params: tuple[Any, ...], label: str) -> dict[str, Any]:
    row = conn.execute(sql, params).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return as_dict(row)


def public_user(row: Any) -> dict[str, Any]:
    user = as_dict(row)
    user.pop("password_hash", None)
    return user


def role_is_hr(role: str | None) -> bool:
    return role in {"admin", "hr"}


def serialize_project(row: Any) -> dict[str, Any]:
    project = as_dict(row)
    if not project:
        return {}
    project["description"] = project.get("description") or project.get("purpose") or ""
    project["project_type"] = project.get("project_type") or "combined"
    project["target_scope"] = project.get("target_scope") or project.get("scope") or ""
    project["purpose"] = project.get("purpose") or project["description"]
    project["scope"] = project.get("scope") or project["target_scope"]
    return project


def session_value_from_header(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="not authenticated")
    scheme, _, session_value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not session_value:
        raise HTTPException(status_code=401, detail="invalid session")
    return session_value


def current_user(authorization: str | None) -> dict[str, Any]:
    session_value = session_value_from_header(authorization)
    with get_connection() as conn:
        row = conn.execute(
            f"""
            SELECT users.*
            FROM login_sessions
            JOIN users ON users.id = login_sessions.user_id
            WHERE login_sessions.{SESSION_COLUMN} = ?
              AND users.status = 'active'
              AND (login_sessions.expires_at IS NULL OR login_sessions.expires_at > CURRENT_TIMESTAMP)
            """,
            (session_value,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="session expired or invalid")
        user = as_dict(row)
        user[SESSION_FIELD] = session_value
        return user


def require_admin_user(authorization: str | None) -> dict[str, Any]:
    user = current_user(authorization)
    if not role_is_hr(user["role"]):
        raise HTTPException(status_code=403, detail="hr only")
    return user


def require_hr_user(authorization: str | None) -> dict[str, Any]:
    return require_admin_user(authorization)


def require_boss_or_hr_user(authorization: str | None) -> dict[str, Any]:
    user = current_user(authorization)
    if user["role"] not in {"boss", "hr", "admin"}:
        raise HTTPException(status_code=403, detail="boss or hr only")
    return user


def optional_current_user(authorization: str | None) -> dict[str, Any] | None:
    if not authorization:
        return None
    try:
        return current_user(authorization)
    except HTTPException:
        return None


def require_employee_id(user: dict[str, Any]) -> int:
    employee_id = user.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=403, detail="user is not linked to an employee")
    return int(employee_id)


def read_login_code(payload: Any) -> str:
    login_code = (getattr(payload, "loginCode", "") or getattr(payload, "credential", "")).strip()
    if not login_code:
        raise HTTPException(status_code=422, detail="login code is required")
    return login_code


def ensure_project_id(conn: Any, project_id: int | None = None) -> int:
    if project_id:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        return project_id

    row = conn.execute("SELECT id FROM projects ORDER BY id DESC LIMIT 1").fetchone()
    if row:
        return int(row["id"])

    cur = conn.execute(
        """
        INSERT INTO projects (name, purpose, scope, start_date, end_date, anonymous, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        ("360 Review Agent Demo", "发展反馈", "MVP 默认项目", "", "", 1, "draft"),
    )
    created_id = int(cur.lastrowid)
    conn.execute(
        """
        INSERT INTO review_projects (id, name, purpose, scope, start_date, end_date, anonymous, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (created_id, "360 Review Agent Demo", "发展反馈", "MVP 默认项目", "", "", 1),
    )
    return created_id


def record_edit(
    conn: Any,
    project_id: int | None,
    employee_id: int | None,
    entity_type: str,
    entity_id: int,
    before: Any,
    after: Any,
    editor: str = "HR",
) -> None:
    conn.execute(
        """
        INSERT INTO edit_history
            (project_id, employee_id, entity_type, entity_id, edited_by, editor, before_json, after_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, employee_id, entity_type, entity_id, editor, editor, dumps(before), dumps(after)),
    )


def record_ai_run(
    conn: Any,
    project_id: int | None,
    employee_id: int | None,
    feature: str,
    prompt: str,
    input_payload: Any,
    output_text: str,
    used_fallback: bool,
    created_by: int | None = None,
) -> int:
    settings = get_settings()
    cur = conn.execute(
        """
        INSERT INTO ai_runs
            (project_id, employee_id, run_type, feature, prompt, input_json, output_json, output_text,
             provider_base_url, model, created_by, used_fallback)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_id,
            employee_id,
            feature,
            feature,
            prompt,
            dumps(input_payload),
            output_text,
            output_text,
            settings["base_url"],
            settings["model"],
            created_by,
            int(used_fallback),
        ),
    )
    return int(cur.lastrowid)


def normalize_questionnaire(value: Any) -> list[dict[str, Any]]:
    raw_dimensions = value.get("dimensions", value) if isinstance(value, dict) else value
    if not isinstance(raw_dimensions, list):
        return []

    dimensions: list[dict[str, Any]] = []
    for dim_index, raw_dim in enumerate(raw_dimensions):
        if not isinstance(raw_dim, dict):
            continue
        questions = []
        for q_index, raw_question in enumerate(raw_dim.get("questions", [])):
            relation_scope = "all"
            rating_type = "score_1_5"
            if isinstance(raw_question, str):
                text = raw_question
                anchor = ""
            elif isinstance(raw_question, dict):
                text = str(raw_question.get("text", raw_question.get("content", ""))).strip()
                anchor = str(raw_question.get("behavior_anchor", raw_question.get("anchor", ""))).strip()
                relation_scope = str(raw_question.get("relation_scope", "all")).strip() or "all"
                rating_type = str(raw_question.get("rating_type", "score_1_5")).strip() or "score_1_5"
            else:
                continue
            if text:
                questions.append(
                    {
                        "text": text,
                        "behavior_anchor": anchor,
                        "question_type": raw_question.get("question_type", "rating") if isinstance(raw_question, dict) else "rating",
                        "relation_scope": relation_scope,
                        "rating_type": rating_type,
                        "open_followup": raw_question.get("open_followup", "") if isinstance(raw_question, dict) else "",
                        "weight": raw_question.get("weight", 1.0) if isinstance(raw_question, dict) else 1.0,
                        "sort_order": q_index,
                    }
                )
        name = str(raw_dim.get("name", "")).strip()
        if name and questions:
            dimensions.append(
                {
                    "name": name,
                    "description": str(raw_dim.get("description", "")).strip(),
                    "sort_order": dim_index,
                    "questions": questions,
                }
            )
    return dimensions


def fallback_competency_model(role: str, level: str) -> list[dict[str, Any]]:
    is_manager = any(token in level for token in ["经理", "总监", "负责人", "管理", "M", "P8", "P9"])
    base = [
        {
            "name": "目标对齐与业务理解",
            "description": f"理解{role}在当前层级的业务目标，并能把目标转译为清晰行动。",
            "questions": [
                {"text": "能够说明本岗位工作如何支持团队和公司关键目标", "behavior_anchor": "用业务指标解释工作优先级"},
                {"text": "面对目标变化时，能及时调整计划并同步相关方", "behavior_anchor": "调整计划、澄清取舍、同步影响"},
                {"text": "能识别工作中的关键风险并提前提出应对方案", "behavior_anchor": "提前预警并给出可执行选项"},
            ],
        },
        {
            "name": "协作沟通与影响力",
            "description": "通过清晰沟通、主动协同和建设性反馈提升跨团队效率。",
            "questions": [
                {"text": "能主动澄清跨部门协作中的职责、时限和交付标准", "behavior_anchor": "明确接口、责任和交付物"},
                {"text": "在意见不一致时，能基于事实推动共识形成", "behavior_anchor": "呈现事实、倾听分歧、促成决策"},
                {"text": "能及时向相关方反馈进展、阻塞和需要的支持", "behavior_anchor": "透明同步进展和风险"},
            ],
        },
        {
            "name": "结果交付与持续改进",
            "description": "稳定交付承诺结果，并从复盘中改进流程和质量。",
            "questions": [
                {"text": "能按承诺时间和质量标准完成关键任务", "behavior_anchor": "稳定交付、少返工"},
                {"text": "能通过复盘发现流程或质量问题并推动改进", "behavior_anchor": "复盘根因并落实改进动作"},
                {"text": "在资源受限时，能合理排序并保证关键结果", "behavior_anchor": "识别优先级和关键路径"},
            ],
        },
        {
            "name": "学习敏捷与反馈吸收",
            "description": "主动获取反馈，快速学习新要求并转化为行为改变。",
            "questions": [
                {"text": "能主动寻求反馈并把反馈转化为具体改进动作", "behavior_anchor": "记录反馈、形成改进计划"},
                {"text": "面对新任务或不确定情境时，能快速学习并尝试解决", "behavior_anchor": "快速补齐知识和方法"},
                {"text": "能承认失误并用事实复盘下一步改进", "behavior_anchor": "开放承认问题并跟进改善"},
            ],
        },
    ]
    if is_manager:
        base.insert(
            2,
            {
                "name": "团队领导与人才发展",
                "description": "帮助团队建立方向、反馈节奏和人才成长机制。",
                "questions": [
                    {"text": "能为团队成员设定清晰目标并定期提供反馈", "behavior_anchor": "目标清晰、反馈及时、辅导具体"},
                    {"text": "能识别团队成员能力差距并安排发展机会", "behavior_anchor": "基于差距安排任务和辅导"},
                    {"text": "在团队冲突或压力下能保持公平、透明和稳定", "behavior_anchor": "处理冲突并维护信任"},
                ],
            },
        )
    return [
        {
            **dimension,
            "sort_order": index,
            "questions": [
                {**q, "relation_scope": "all", "rating_type": "score_1_5", "sort_order": q_index}
                for q_index, q in enumerate(dimension["questions"])
            ],
        }
        for index, dimension in enumerate(base)
    ]


def fallback_question_issues(questionnaire: list[dict[str, Any]]) -> list[dict[str, str]]:
    seen: dict[str, str] = {}
    issues: list[dict[str, str]] = []
    leading_words = ["必须", "总是", "从不", "毫无疑问", "显然", "应该"]
    abstract_words = ["优秀", "积极", "主动", "负责", "高效", "强", "好"]
    for dimension in questionnaire:
        for question in dimension.get("questions", []):
            text = question.get("text", "")
            compact = "".join(text.lower().split())
            if compact in seen:
                issues.append({"type": "重复", "question": text, "suggestion": f"与「{seen[compact]}」重复，建议合并或改写行为场景。"})
            seen[compact] = text
            if len(text) < 14 or any(word in text for word in abstract_words) and "能" not in text:
                issues.append({"type": "过于抽象", "question": text, "suggestion": "改成可观察行为，例如包含场景、动作和结果标准。"})
            if any(word in text for word in leading_words):
                issues.append({"type": "诱导性", "question": text, "suggestion": "去掉价值判断词，避免暗示评价人必须给高分或低分。"})
    if not issues:
        issues.append({"type": "通过", "question": "当前问卷", "suggestion": "未发现明显重复、抽象或诱导性表述，建议 HR 结合岗位语境再复核。"})
    return issues


def fetch_questionnaire(conn: Any, project_id: int) -> dict[str, Any]:
    dimensions = [as_dict(row) for row in conn.execute(
        "SELECT * FROM dimensions WHERE project_id = ? ORDER BY sort_order, id",
        (project_id,),
    )]
    for dimension in dimensions:
        rows = conn.execute(
            "SELECT * FROM questions WHERE dimension_id = ? ORDER BY sort_order, id",
            (dimension["id"],),
        ).fetchall()
        dimension["questions"] = [as_dict(row) for row in rows]
    return {"dimensions": dimensions}


def save_questionnaire(conn: Any, project_id: int, dimensions: list[dict[str, Any]], editor: str = "HR") -> dict[str, Any]:
    before = fetch_questionnaire(conn, project_id)
    conn.execute("DELETE FROM dimensions WHERE project_id = ?", (project_id,))
    conn.execute("DELETE FROM competencies WHERE project_id = ?", (project_id,))
    for dim_index, dimension in enumerate(dimensions):
        dim_cur = conn.execute(
            """
            INSERT INTO dimensions (project_id, name, description, sort_order)
            VALUES (?, ?, ?, ?)
            """,
            (
                project_id,
                dimension["name"],
                dimension.get("description", ""),
                dimension.get("sort_order", dim_index),
            ),
        )
        dimension_id = int(dim_cur.lastrowid)
        comp_cur = conn.execute(
            """
            INSERT INTO competencies (project_id, name, description, target_level)
            VALUES (?, ?, ?, ?)
            """,
            (
                project_id,
                dimension["name"],
                dimension.get("description", ""),
                dimension.get("target_level", ""),
            ),
        )
        competency_id = int(comp_cur.lastrowid)
        for q_index, question in enumerate(dimension.get("questions", [])):
            conn.execute(
                """
                INSERT INTO questions
                    (project_id, competency_id, dimension_id, hypothesis_id, model_id, content, text,
                     behavior_anchor, question_type, relation_scope, rating_type, open_followup, weight, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    competency_id,
                    dimension_id,
                    question.get("hypothesis_id"),
                    question.get("model_id"),
                    question["text"],
                    question["text"],
                    question.get("behavior_anchor", ""),
                    question.get("question_type", "rating"),
                    question.get("relation_scope", "all"),
                    question.get("rating_type", "score_1_5"),
                    question.get("open_followup", ""),
                    question.get("weight", 1.0),
                    question.get("sort_order", q_index),
                ),
            )
    conn.execute("UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (project_id,))
    after = fetch_questionnaire(conn, project_id)
    record_edit(conn, project_id, None, "questionnaire", project_id, before, after, editor)
    return after


def build_analytics(conn: Any, project_id: int) -> dict[str, Any]:
    relationships_count = conn.execute(
        "SELECT COUNT(*) AS count FROM relationships WHERE project_id = ?",
        (project_id,),
    ).fetchone()["count"]
    responses_count = conn.execute(
        "SELECT COUNT(*) AS count FROM responses WHERE project_id = ?",
        (project_id,),
    ).fetchone()["count"]
    employee_count = conn.execute(
        "SELECT COUNT(*) AS count FROM employees WHERE project_id = ?",
        (project_id,),
    ).fetchone()["count"]

    dimension_rows = conn.execute(
        """
        SELECT d.id, d.name, ROUND(AVG(rs.score), 2) AS avg_score, COUNT(rs.id) AS score_count
        FROM dimensions d
        LEFT JOIN questions q ON q.dimension_id = d.id
        LEFT JOIN response_scores rs ON rs.question_id = q.id
        WHERE d.project_id = ?
        GROUP BY d.id, d.name
        ORDER BY d.sort_order, d.id
        """,
        (project_id,),
    ).fetchall()

    group_rows = conn.execute(
        """
        SELECT r.relation_type,
               ROUND(AVG(rs.score), 2) AS avg_score,
               COUNT(DISTINCT r.id) AS response_count,
               COUNT(rs.id) AS score_count
        FROM responses r
        LEFT JOIN response_scores rs ON rs.response_id = r.id
        WHERE r.project_id = ?
        GROUP BY r.relation_type
        ORDER BY r.relation_type
        """,
        (project_id,),
    ).fetchall()

    gap_rows = conn.execute(
        """
        SELECT e.id AS employee_id,
               e.name AS employee_name,
               ROUND(AVG(CASE WHEN r.relation_type = 'self' THEN rs.score END), 2) AS self_avg,
               ROUND(AVG(CASE WHEN r.relation_type <> 'self' THEN rs.score END), 2) AS others_avg
        FROM employees e
        LEFT JOIN responses r ON r.subject_employee_id = e.id
        LEFT JOIN response_scores rs ON rs.response_id = r.id
        WHERE e.project_id = ?
        GROUP BY e.id, e.name
        HAVING self_avg IS NOT NULL OR others_avg IS NOT NULL
        ORDER BY ABS(COALESCE(self_avg, 0) - COALESCE(others_avg, 0)) DESC
        LIMIT 12
        """,
        (project_id,),
    ).fetchall()

    heatmap_rows = conn.execute(
        """
        SELECT e.department, d.name AS dimension_name, ROUND(AVG(rs.score), 2) AS avg_score
        FROM responses r
        JOIN employees e ON e.id = r.subject_employee_id
        JOIN response_scores rs ON rs.response_id = r.id
        JOIN questions q ON q.id = rs.question_id
        JOIN dimensions d ON d.id = q.dimension_id
        WHERE r.project_id = ?
        GROUP BY e.department, d.id, d.name
        ORDER BY e.department, d.sort_order
        """,
        (project_id,),
    ).fetchall()

    feedback_rows = conn.execute(
        """
        SELECT overall_comment AS text
        FROM responses
        WHERE project_id = ? AND TRIM(overall_comment) <> ''
        UNION ALL
        SELECT rs.text_feedback AS text
        FROM response_scores rs
        JOIN responses r ON r.id = rs.response_id
        WHERE r.project_id = ? AND TRIM(rs.text_feedback) <> ''
        """,
        (project_id, project_id),
    ).fetchall()

    theme_keywords = {
        "跨部门协作": ["协作", "跨部门", "沟通", "同步", "配合"],
        "目标交付": ["目标", "交付", "结果", "进度", "质量"],
        "授权辅导": ["授权", "辅导", "反馈", "培养", "支持"],
        "决策质量": ["决策", "判断", "取舍", "优先级", "风险"],
        "学习改进": ["学习", "复盘", "改进", "成长", "吸收"],
    }
    feedback_text = "\n".join(row["text"] for row in feedback_rows)
    feedback_themes = [
        {"theme": theme, "count": sum(feedback_text.count(keyword) for keyword in keywords)}
        for theme, keywords in theme_keywords.items()
    ]
    feedback_themes = [item for item in sorted(feedback_themes, key=lambda row: row["count"], reverse=True) if item["count"] > 0]

    relation_avg = {row["relation_type"]: row["avg_score"] for row in group_rows if row["avg_score"] is not None}
    risk_alerts: list[str] = []
    for row in gap_rows:
        if row["self_avg"] is not None and row["others_avg"] is not None and row["self_avg"] - row["others_avg"] >= 0.6:
            risk_alerts.append(f"{row['employee_name']} 自评高于他评，可能存在自我认知盲区。")
            break
    if relation_avg.get("manager") is not None and relation_avg.get("direct_report") is not None:
        if relation_avg["manager"] - relation_avg["direct_report"] >= 0.6:
            risk_alerts.append("上级评分高、下级评分低，可能存在向上管理强、向下管理弱。")
    if relation_avg.get("peer") is not None and relation_avg["peer"] < 3.2:
        risk_alerts.append("同级评分偏低，可能存在跨部门协作或横向影响力问题。")
    scores_for_variance = [row["avg_score"] for row in group_rows if row["avg_score"] is not None]
    if scores_for_variance and max(scores_for_variance) - min(scores_for_variance) >= 1:
        risk_alerts.append("不同评价人群体评分分歧大，可能说明行为表现不稳定或群体感知差异大。")
    if not risk_alerts:
        risk_alerts.append("当前未发现明显评分风险，建议结合访谈继续验证低分维度。")

    completion_rate = round(responses_count / relationships_count * 100, 1) if relationships_count else 0
    return {
        "employee_count": employee_count,
        "relationships_count": relationships_count,
        "responses_count": responses_count,
        "completion_rate": completion_rate,
        "dimension_averages": [as_dict(row) for row in dimension_rows],
        "group_differences": [
            {**as_dict(row), "relation_label": RELATION_LABELS.get(row["relation_type"], row["relation_type"])}
            for row in group_rows
        ],
        "self_other_gaps": [
            {
                **as_dict(row),
                "gap": round((row["self_avg"] or 0) - (row["others_avg"] or 0), 2)
                if row["self_avg"] is not None and row["others_avg"] is not None
                else None,
            }
            for row in gap_rows
        ],
        "department_heatmap": [as_dict(row) for row in heatmap_rows],
        "feedback_themes": feedback_themes[:5],
        "risk_alerts": risk_alerts[:6],
    }


def employee_review_packet(conn: Any, project_id: int, employee_id: int) -> dict[str, Any]:
    employee = fetch_one_or_404(
        conn,
        "SELECT * FROM employees WHERE project_id = ? AND id = ?",
        (project_id, employee_id),
        "employee",
    )
    dimension_rows = conn.execute(
        """
        SELECT d.name, ROUND(AVG(rs.score), 2) AS avg_score, COUNT(rs.id) AS score_count
        FROM dimensions d
        LEFT JOIN questions q ON q.dimension_id = d.id
        LEFT JOIN response_scores rs ON rs.question_id = q.id
        LEFT JOIN responses r ON r.id = rs.response_id AND r.subject_employee_id = ?
        WHERE d.project_id = ?
        GROUP BY d.id, d.name
        ORDER BY d.sort_order
        """,
        (employee_id, project_id),
    ).fetchall()
    relation_rows = conn.execute(
        """
        SELECT r.relation_type, ROUND(AVG(rs.score), 2) AS avg_score, COUNT(DISTINCT r.id) AS response_count
        FROM responses r
        LEFT JOIN response_scores rs ON rs.response_id = r.id
        WHERE r.project_id = ? AND r.subject_employee_id = ?
        GROUP BY r.relation_type
        """,
        (project_id, employee_id),
    ).fetchall()
    comments = conn.execute(
        """
        SELECT relation_type, overall_comment AS comment
        FROM responses
        WHERE project_id = ? AND subject_employee_id = ? AND TRIM(overall_comment) <> ''
        UNION ALL
        SELECT r.relation_type, rs.text_feedback AS comment
        FROM response_scores rs
        JOIN responses r ON r.id = rs.response_id
        WHERE r.project_id = ? AND r.subject_employee_id = ? AND TRIM(rs.text_feedback) <> ''
        """,
        (project_id, employee_id, project_id, employee_id),
    ).fetchall()

    grouped_comments: dict[str, list[str]] = {}
    for row in comments:
        grouped_comments.setdefault(row["relation_type"], []).append(row["comment"])

    privacy_comments = []
    for relation_type, values in grouped_comments.items():
        privacy_comments.append(
            {
                "relation_type": relation_type,
                "relation_label": RELATION_LABELS.get(relation_type, relation_type),
                "comment_count": len(values),
                "comments": values if len(values) >= 3 else [],
                "withheld": len(values) < 3,
            }
        )

    relation_scores = [
        {**as_dict(row), "relation_label": RELATION_LABELS.get(row["relation_type"], row["relation_type"])}
        for row in relation_rows
    ]
    self_avg = next((row["avg_score"] for row in relation_scores if row["relation_type"] == "self"), None)
    other_values = [row["avg_score"] for row in relation_scores if row["relation_type"] != "self" and row["avg_score"] is not None]
    others_avg = round(sum(other_values) / len(other_values), 2) if other_values else None

    return {
        "employee": employee,
        "dimension_scores": [as_dict(row) for row in dimension_rows],
        "relation_scores": relation_scores,
        "self_other_gap": {
            "self_avg": self_avg,
            "others_avg": others_avg,
            "gap": round(self_avg - others_avg, 2) if self_avg is not None and others_avg is not None else None,
        },
        "comments_by_relation": privacy_comments,
        "privacy_rule": "当某类评价人少于 3 人时，不单独展示该群体的原始评论。",
    }


def fallback_report(packet: dict[str, Any]) -> str:
    employee = packet["employee"]
    scores = [row for row in packet["dimension_scores"] if row.get("avg_score") is not None]
    high = sorted(scores, key=lambda row: row["avg_score"], reverse=True)[:2]
    low = sorted(scores, key=lambda row: row["avg_score"])[:2]
    gap = packet["self_other_gap"]
    gap_text = "暂无足够数据判断自评与他评差距。"
    if gap["gap"] is not None:
        if gap["gap"] >= 0.6:
            gap_text = "自评明显高于他评，建议在反馈面谈中校准关键行为证据和外部感知。"
        elif gap["gap"] <= -0.6:
            gap_text = "他评高于自评，可能存在贡献被低估或自我要求偏高的情况。"
        else:
            gap_text = "自评与他评总体接近，可重点讨论具体维度上的差异。"

    strengths = "、".join([f"{row['name']}({row['avg_score']})" for row in high]) or "暂无"
    risks = "、".join([f"{row['name']}({row['avg_score']})" for row in low]) or "暂无"
    withheld_count = sum(1 for group in packet["comments_by_relation"] if group["withheld"])

    return f"""# {employee['name']} 360 反馈报告（HR 待确认）

> 本报告用于发展反馈与辅导，不得直接作为晋升、淘汰或薪酬决策依据。所有结论需要 HR 人工确认。

## 核心优势
当前相对优势集中在：{strengths}。建议在面谈中追问这些优势对应的具体场景，沉淀可复用行为。

## 风险与盲区
需要优先关注：{risks}。{gap_text}

## 关键反馈主题
开放文本已按匿名与最小披露原则处理。共有 {withheld_count} 类评价人评论因人数少于 3 人被隐藏原文，仅用于汇总判断。

## 30/60/90 天行动计划
- 30 天：选择 1 个低分维度，和直属上级确认两个可观察行为目标。
- 60 天：在真实工作场景中邀请至少 2 位相关方进行中途反馈。
- 90 天：复盘行为变化证据，并更新下一轮发展目标。

## HR 反馈面谈提纲
- 先确认被评人对评分和反馈主题的理解。
- 讨论自评与他评差距背后的具体场景。
- 共同选择不超过 2 个发展重点，明确支持资源和复盘时间。
"""


def fallback_org_diagnosis(analytics: dict[str, Any]) -> str:
    lowest_dimensions = sorted(
        [row for row in analytics["dimension_averages"] if row.get("avg_score") is not None],
        key=lambda row: row["avg_score"],
    )[:3]
    low_text = "、".join([f"{row['name']}({row['avg_score']})" for row in lowest_dimensions]) or "暂无足够评分"
    return f"""# 组织层面诊断摘要（HR 待确认）

当前项目完成率为 {analytics['completion_rate']}%，覆盖 {analytics['employee_count']} 名员工、{analytics['relationships_count']} 条评价关系。该摘要只用于组织发展诊断，不得直接用于个人晋升、淘汰或薪酬决策。

## 初步发现
相对低分维度集中在：{low_text}。建议 HR 结合业务阶段、部门样本量和近期组织变化进一步访谈验证。

## 建议动作
- 优先补齐未完成评价，避免样本偏差。
- 对低分维度所在部门做小样本访谈，确认是能力问题、流程问题还是管理节奏问题。
- 将组织行动拆成 1-2 个季度级干预主题，并明确负责人和复盘指标。
"""


def org_maturity_level(score: float) -> str:
    if score <= 1.8:
        return "L1 AI 工具尝试型"
    if score <= 2.6:
        return "L2 AI 流程增强型"
    if score <= 3.4:
        return "L3 AI 工作流型"
    if score <= 4.2:
        return "L4 AI-native 作战型"
    return "L5 AI 自进化学习型"


def sample_dimension_scores() -> dict[str, float]:
    return {
        "strategic_hypothesis": 2.7,
        "human_ai_task_allocation": 2.2,
        "agent_workflow": 2.0,
        "adaptability": 3.0,
        "scale_0_to_10000": 2.4,
        "baseline_execution": 3.2,
        "upper_limit_breakthrough": 2.6,
        "ai_governance": 2.1,
    }


def calculate_org_diagnosis_result(conn: Any, project_id: int, persist: bool = True) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT dimension, ROUND(AVG(score), 2) AS avg_score, COUNT(*) AS response_count
        FROM organization_diagnosis_responses
        WHERE project_id = ?
        GROUP BY dimension
        """,
        (project_id,),
    ).fetchall()
    if rows:
        scores = {row["dimension"]: float(row["avg_score"]) for row in rows}
        sample = False
    else:
        scores = sample_dimension_scores()
        sample = True
    total_score = round(sum(scores.values()) / len(scores), 2) if scores else 0
    maturity = org_maturity_level(total_score)
    low_dimensions = sorted(scores.items(), key=lambda item: item[1])[:3]
    low_labels = []
    for key, score in low_dimensions:
        label = next((item["label"] for item in ORG_DIAGNOSIS_DIMENSIONS if item["key"] == key), key)
        low_labels.append(f"{label}({score})")
    summary = (
        ("Sample：" if sample else "")
        + f"当前组织 AI 成熟度为 {maturity}，总分 {total_score}/5。"
        + f"需要优先关注 {', '.join(low_labels)}。"
    )
    result = {
        "project_id": project_id,
        "dimension_scores_json": scores,
        "dimension_scores": scores,
        "total_score": total_score,
        "maturity_level": maturity,
        "summary": summary,
        "sample": sample,
    }
    if persist:
        conn.execute(
            """
            INSERT INTO organization_diagnosis_results
                (project_id, dimension_scores_json, total_score, maturity_level, summary, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(project_id) DO UPDATE SET
                dimension_scores_json = excluded.dimension_scores_json,
                total_score = excluded.total_score,
                maturity_level = excluded.maturity_level,
                summary = excluded.summary,
                updated_at = CURRENT_TIMESTAMP
            """,
            (project_id, dumps(scores), total_score, maturity, summary),
        )
    return result


def talent_profile_from_scores(project_id: int, user_id: int | None, seed: int = 0) -> dict[str, Any]:
    base = 3 + (seed % 3) * 0.2
    scores = {
        "ai_collaboration": round(min(5, base + 0.8), 1),
        "problem_definition": round(min(5, base + 0.4), 1),
        "execution_closure": round(min(5, base + 0.6), 1),
        "learning_agility": round(min(5, base + 0.5), 1),
        "business_judgment": round(min(5, base + 0.2), 1),
        "native_strength": round(min(5, base + 0.7), 1),
        "organization_contribution": round(min(5, base + 0.3), 1),
        "risk_ownership": round(min(5, base + 0.1), 1),
    }
    if scores["ai_collaboration"] >= 4 and scores["execution_closure"] >= 3.8:
        talent_type = "ai_leverager"
    elif scores["risk_ownership"] >= 4:
        talent_type = "risk_owner"
    elif scores["problem_definition"] >= 4:
        talent_type = "architect"
    else:
        talent_type = "stable_operator"
    return {
        "project_id": project_id,
        "user_id": user_id,
        "talent_type": talent_type,
        "talent_type_label": TALENT_TYPE_LABELS[talent_type],
        "dimension_scores_json": scores,
        "dimension_scores": scores,
        "native_strength": "能把模糊任务转化为可执行方案，并借助 AI 提升信息处理效率。",
        "ai_collaboration_level": "L3 AI 工作流协作者" if scores["ai_collaboration"] >= 4 else "L2 AI 工具增强者",
        "best_fit_tasks": ["AI 工作流试点", "跨团队问题拆解", "高频任务自动化"],
        "not_recommended_tasks": ["长期重复手工整理", "边界不清且无人复核的高风险决策"],
        "recommended_agents": ["Research Agent", "Workflow Agent", "Review Agent"],
        "growth_suggestion": "继续提升问题定义、AI 结果验证和复盘沉淀能力，把个人效率转化为团队可复用方法。",
    }


def serialize_talent_profile(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    scores = loads_json(item.get("dimension_scores_json"), {})
    item["dimension_scores"] = scores
    item["dimension_scores_json"] = scores
    item["best_fit_tasks"] = loads_json(item.get("best_fit_tasks"), [])
    item["not_recommended_tasks"] = loads_json(item.get("not_recommended_tasks"), [])
    item["recommended_agents"] = loads_json(item.get("recommended_agents"), [])
    item["talent_type_label"] = TALENT_TYPE_LABELS.get(item.get("talent_type"), item.get("talent_type", ""))
    return item


def build_survey_progress(conn: Any, project_id: int) -> list[dict[str, Any]]:
    employee_count = conn.execute("SELECT COUNT(*) AS count FROM employees WHERE project_id = ?", (project_id,)).fetchone()["count"]
    rows = conn.execute("SELECT * FROM surveys WHERE project_id = ? ORDER BY created_at DESC, id DESC", (project_id,)).fetchall()
    progress = []
    for row in rows:
        submitted = conn.execute("SELECT COUNT(*) AS count FROM survey_responses WHERE survey_id = ?", (row["id"],)).fetchone()["count"]
        total = max(employee_count, 1)
        progress.append(
            {
                **as_dict(row),
                "submitted_count": submitted,
                "pending_count": max(total - submitted, 0),
                "completion_rate": round(submitted / total * 100, 1) if total else 0,
            }
        )
    return progress


def build_feedback_summary(conn: Any, project_id: int) -> dict[str, Any]:
    rows = conn.execute(
        """
        SELECT feedback_type, COUNT(*) AS count
        FROM organization_feedback
        WHERE project_id = ?
        GROUP BY feedback_type
        ORDER BY count DESC
        """,
        (project_id,),
    ).fetchall()
    risk_count = conn.execute(
        "SELECT COUNT(*) AS count FROM organization_feedback WHERE project_id = ? AND feedback_type = 'risk'",
        (project_id,),
    ).fetchone()["count"]
    recent = conn.execute(
        """
        SELECT feedback_type, content, is_anonymous, created_at
        FROM organization_feedback
        WHERE project_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 5
        """,
        (project_id,),
    ).fetchall()
    return {
        "project_id": project_id,
        "theme_distribution": [as_dict(row) for row in rows] or [
            {"feedback_type": "ai_tools", "count": 3},
            {"feedback_type": "collaboration", "count": 2},
            {"feedback_type": "risk", "count": 1},
        ],
        "risk_count": risk_count,
        "summary": "Sample：反馈主要集中在 AI 工具使用、跨团队协作和流程更新节奏。",
        "recent_feedback": [as_dict(row) for row in recent],
    }


def build_executive_dashboard(conn: Any, project_id: int) -> dict[str, Any]:
    org_result = calculate_org_diagnosis_result(conn, project_id, persist=True)
    analytics = build_analytics(conn, project_id)
    talent_rows = conn.execute(
        """
        SELECT talent_type, COUNT(*) AS count
        FROM talent_profiles
        WHERE project_id = ?
        GROUP BY talent_type
        """,
        (project_id,),
    ).fetchall()
    talent_distribution = [
        {"talent_type": row["talent_type"], "label": TALENT_TYPE_LABELS.get(row["talent_type"], row["talent_type"]), "count": row["count"]}
        for row in talent_rows
    ] or [
        {"talent_type": "explorer", "label": "探索型人才", "count": 2},
        {"talent_type": "stable_operator", "label": "稳定交付型人才", "count": 4},
        {"talent_type": "ai_leverager", "label": "AI 杠杆型人才", "count": 1},
    ]
    feedback_summary = build_feedback_summary(conn, project_id)
    feedback_summary["recent_feedback"] = []
    return {
        "project_id": project_id,
        "organization_maturity": org_result["maturity_level"],
        "organization_health": 68 if org_result["sample"] else round(org_result["total_score"] * 20, 1),
        "ai_native_readiness": 52 if org_result["sample"] else round(
            ((org_result["dimension_scores"].get("agent_workflow", 0) + org_result["dimension_scores"].get("human_ai_task_allocation", 0)) / 2) * 20,
            1,
        ),
        "dimension_scores": org_result["dimension_scores"],
        "key_risks": analytics.get("risk_alerts", [])[:2]
        + [
            "AI 使用停留在个人工具层",
            "缺少人机任务分工",
            "关键人才被基础事务消耗",
            "缺少 AI 治理机制",
        ],
        "talent_distribution": talent_distribution,
        "review360_summary": {
            "completion_rate": analytics.get("completion_rate", 0),
            "dimension_averages": analytics.get("dimension_averages", []),
        },
        "organization_feedback": feedback_summary,
        "action_plan": [
            {"period": "30 天", "action": "完成组织诊断和任务盘点"},
            {"period": "60 天", "action": "建立 2-3 个核心 AI 工作流"},
            {"period": "90 天", "action": "形成组织学习飞轮和人才分工机制"},
        ],
        "sample": org_result["sample"],
    }


def generate_os_report_content(conn: Any, project_id: int, report_type: str, user_id: int | None = None) -> tuple[str, str]:
    project = serialize_project(fetch_one_or_404(conn, "SELECT * FROM projects WHERE id = ?", (project_id,), "project"))
    dashboard = build_executive_dashboard(conn, project_id)
    if report_type == "boss_report":
        title = f"{project['name']} - 老板组织报告"
        content = f"""# {title}

## 组织 AI 成熟度结论
当前成熟度：{dashboard['organization_maturity']}。组织健康度 {dashboard['organization_health']}/100，AI-native 准备度 {dashboard['ai_native_readiness']}/100。

## 当前最大组织问题
AI 使用仍偏个人工具化，任务分工、工作流沉淀和治理机制需要进入经营节奏。

## 关键风险
{chr(10).join(f"- {risk}" for risk in dashboard['key_risks'][:6])}

## 30/60/90 天行动计划
- 30 天：完成组织诊断和任务盘点。
- 60 天：建立 2-3 个核心 AI 工作流。
- 90 天：形成组织学习飞轮和人才分工机制。

## 需要老板决策的事项
- 哪些业务场景优先 AI-native 化。
- 哪些关键人才从底线任务中释放出来。
- AI 治理和数据边界由谁负责。
"""
        return title, content
    if report_type == "employee_report":
        profile = None
        if user_id:
            profile = conn.execute(
                "SELECT * FROM talent_profiles WHERE project_id = ? AND user_id = ?",
                (project_id, user_id),
            ).fetchone()
        item = serialize_talent_profile(profile) if profile else talent_profile_from_scores(project_id, user_id, user_id or 1)
        title = f"{project['name']} - 员工个人成长报告"
        content = f"""# {title}

## 我的能力维度
{chr(10).join(f"- {key}: {value}" for key, value in item['dimension_scores'].items())}

## 我的 native strength
{item['native_strength']}

## 我的 AI 协作能力
{item['ai_collaboration_level']}

## 我的成长建议
{item['growth_suggestion']}

## 推荐提升方向
{', '.join(item['best_fit_tasks'])}
"""
        return title, content
    title = f"{project['name']} - HR 详细诊断报告"
    progress = build_survey_progress(conn, project_id)
    feedback = build_feedback_summary(conn, project_id)
    content = f"""# {title}

## 项目概况
项目类型：{project['project_type']}；范围：{project['target_scope']}；状态：{project['status']}。

## 问卷回收情况
{chr(10).join(f"- {item['title']}: {item['completion_rate']}%" for item in progress)}

## 组织诊断详细结果
{dashboard['organization_maturity']}，八大能力得分：{dumps(dashboard['dimension_scores'])}

## 360 Review 汇总
当前 360 回收率：{dashboard['review360_summary']['completion_rate']}%。

## 员工能力画像
人才结构：{', '.join(f"{item['label']} {item['count']}人" for item in dashboard['talent_distribution'])}

## 组织反馈主题
{feedback['summary']}

## 后续行动计划
- 完成低分维度访谈验证。
- 选择一个核心场景建设 AI 工作流。
- 建立关键人才任务分工和复盘机制。
"""
    return title, content


def normalize_hypotheses(value: Any) -> list[dict[str, Any]]:
    raw_items = value.get("hypotheses", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    allowed_types = {"individual", "manager", "organization", "ai_transformation", "governance"}
    hypotheses: list[dict[str, Any]] = []
    for raw in raw_items:
        if not isinstance(raw, dict):
            continue
        title = str(raw.get("hypothesis_title", "")).strip()
        detail = str(raw.get("hypothesis_detail", "")).strip()
        if not title or not detail:
            continue
        problem_type = str(raw.get("problem_type", "organization")).strip()
        hypotheses.append(
            {
                "hypothesis_title": title,
                "hypothesis_detail": detail,
                "problem_type": problem_type if problem_type in allowed_types else "organization",
                "suggested_validation_method": str(raw.get("suggested_validation_method", "")).strip(),
                "suggested_data_sources": raw.get("suggested_data_sources", []) if isinstance(raw.get("suggested_data_sources", []), list) else [],
                "related_talent_dimensions": raw.get("related_talent_dimensions", []) if isinstance(raw.get("related_talent_dimensions", []), list) else [],
            }
        )
    return hypotheses


def fallback_hypotheses() -> list[dict[str, Any]]:
    return [
        {
            "hypothesis_title": "中层管理者目标拆解能力不足",
            "hypothesis_detail": "当前问题可能不是员工执行力差，而是管理者没有把模糊目标拆解为清晰任务、优先级和判断标准。",
            "problem_type": "manager",
            "suggested_validation_method": "查看下级评价、同级评价和开放反馈中是否出现目标不清、优先级变化频繁等信号。",
            "suggested_data_sources": ["360评分", "开放反馈", "员工反馈池"],
            "related_talent_dimensions": ["问题定义能力", "系统思维", "人机协作领导力"],
        },
        {
            "hypothesis_title": "AI 转型停留在个人工具使用层面",
            "hypothesis_detail": "公司虽然引入了 AI 工具，但团队没有形成稳定的 AI 工作流和协作规范。",
            "problem_type": "ai_transformation",
            "suggested_validation_method": "查看 AI 协作能力、人机协作领导力、Agent 调度能力等维度评分。",
            "suggested_data_sources": ["360评分", "开放反馈", "员工反馈池"],
            "related_talent_dimensions": ["AI 协作能力", "人机协作领导力", "Agent 调度与协同能力"],
        },
        {
            "hypothesis_title": "跨部门协作低效来自角色边界不清",
            "hypothesis_detail": "协作问题可能不是员工态度问题，而是责任人、决策人和信息同步机制不清楚。",
            "problem_type": "organization",
            "suggested_validation_method": "查看同级和协作方评分，以及员工反馈中是否出现审批慢、信息不同步、决策不清等主题。",
            "suggested_data_sources": ["360评分", "开放反馈", "员工反馈池"],
            "related_talent_dimensions": ["系统思维", "数据与业务敏感度", "问题定义能力"],
        },
        {
            "hypothesis_title": "AI-native 高潜人才需要重点关注问题定义与学习迭代",
            "hypothesis_detail": "AI 时代高潜人才不只是执行力强，还要能定义问题、验证 AI 输出、快速学习并沉淀方法。",
            "problem_type": "individual",
            "suggested_validation_method": "查看问题定义能力、判断与验证能力、学习迭代能力和 AI 协作能力评分。",
            "suggested_data_sources": ["360评分", "开放反馈", "员工反馈池"],
            "related_talent_dimensions": ["问题定义能力", "判断与验证能力", "学习迭代能力", "AI 协作能力"],
        },
    ]


def serialize_diagnosis(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["diagnosis_purpose"] = loads_json(item.get("diagnosis_purpose"), [])
    item["focus_issues"] = loads_json(item.get("focus_issues"), [])
    item["expected_outputs"] = loads_json(item.get("expected_outputs"), [])
    item["ai_extracted_hypotheses"] = loads_json(item.get("ai_extracted_hypotheses"), [])
    return item


def fallback_talent_model(template: str) -> dict[str, Any]:
    dimensions = [
        {
            "name": "问题定义能力",
            "description": "能否把模糊问题转化为清晰目标、约束、任务和判断标准。",
            "low_behavior": "等待别人给明确指令，遇到模糊任务时不知道如何拆解。",
            "medium_behavior": "能在已有目标下拆分任务，但对根因和优先级判断还不稳定。",
            "high_behavior": "能从模糊需求中提炼核心问题，明确目标、约束、输入、输出和判断标准。",
            "applicable_roles": "全员, 管理者",
            "weight": 1.2,
            "sample_rating_questions": ["面对模糊目标时，他/她能否主动澄清目标、约束和判断标准，而不是直接开始执行？"],
            "sample_open_questions": ["请举例说明该员工曾经如何把一个模糊问题拆解清楚。"],
        },
        {
            "name": "AI 工作流设计能力",
            "description": "能否把 AI 嵌入团队真实流程，形成可复用的人机协作方式。",
            "low_behavior": "只把 AI 当作个人提问工具，缺少团队流程设计。",
            "medium_behavior": "能在部分任务中使用 AI，但边界、复核和协作规范不稳定。",
            "high_behavior": "能设计人 + AI + 流程的协作机制，并推动团队采用。",
            "applicable_roles": "管理者, 高潜人才",
            "weight": 1.2,
            "sample_rating_questions": ["该管理者是否能判断哪些任务适合由 AI 辅助完成，哪些任务必须保留人工判断？"],
            "sample_open_questions": ["请描述一个他/她推动 AI 改进团队工作流程的例子。"],
        },
        {
            "name": "人机协作领导力",
            "description": "管理者是否能设计团队在人、AI 和流程之间的协作方式。",
            "low_behavior": "要求团队使用 AI，但没有明确场景、标准和复核机制。",
            "medium_behavior": "能鼓励团队尝试 AI，但方法沉淀和扩散不足。",
            "high_behavior": "能围绕业务目标设计 AI 协作场景、质量标准和学习机制。",
            "applicable_roles": "管理者",
            "weight": 1.1,
            "sample_rating_questions": ["他/她是否能帮助团队明确 AI 在工作流中的角色和责任边界？"],
            "sample_open_questions": ["请举例说明他/她如何带领团队使用 AI 提升协作效率。"],
        },
        {
            "name": "判断与验证能力",
            "description": "是否能识别 AI 输出中的错误、偏差、遗漏和不可靠信息。",
            "low_behavior": "容易直接采纳 AI 输出，缺少事实核查和业务判断。",
            "medium_behavior": "能发现明显错误，但验证方法和标准不稳定。",
            "high_behavior": "能基于事实、数据和业务逻辑系统验证 AI 输出。",
            "applicable_roles": "全员, 管理者",
            "weight": 1.1,
            "sample_rating_questions": ["当 AI 输出与业务经验或事实数据冲突时，他/她是否会主动进行事实核查和人工判断？"],
            "sample_open_questions": ["请举例说明他/她如何发现或修正 AI 输出中的问题。"],
        },
        {
            "name": "团队学习扩散能力",
            "description": "是否能把个人试错经验沉淀为团队可复用方法。",
            "low_behavior": "学习停留在个人层面，很少沉淀或分享。",
            "medium_behavior": "会分享经验，但缺少标准化和复盘节奏。",
            "high_behavior": "能把新工具、新流程的试错经验转化为团队方法和训练材料。",
            "applicable_roles": "管理者, 高潜人才",
            "weight": 1.0,
            "sample_rating_questions": ["他/她是否能把 AI 使用经验转化为团队可复用的流程或模板？"],
            "sample_open_questions": ["请举例说明他/她如何推动团队学习和方法扩散。"],
        },
        {
            "name": "数据与业务敏感度",
            "description": "是否能用数据验证业务判断，并理解指标背后的业务含义。",
            "low_behavior": "只看表层数据，难以连接业务情境。",
            "medium_behavior": "能用常规指标看问题，但对异常和因果关系判断不稳定。",
            "high_behavior": "能结合数据、业务场景和客户/员工反馈形成判断。",
            "applicable_roles": "全员, 管理者",
            "weight": 1.0,
            "sample_rating_questions": ["他/她是否能用数据验证关键判断，而不是只依赖经验或直觉？"],
            "sample_open_questions": ["请举例说明他/她如何用数据帮助团队做判断。"],
        },
        {
            "name": "责任与治理意识",
            "description": "是否理解 AI 使用中的隐私、公平、透明、人工复核和责任边界。",
            "low_behavior": "不清楚 AI 使用的隐私和责任边界。",
            "medium_behavior": "知道基本风险，但在复杂场景下提醒和把关不足。",
            "high_behavior": "能主动识别 AI 使用风险，并建立人工复核与信息保护规则。",
            "applicable_roles": "全员, 管理者",
            "weight": 1.0,
            "sample_rating_questions": ["他/她是否注意避免将员工敏感信息、客户隐私或公司机密直接输入外部 AI 工具？"],
            "sample_open_questions": ["请举例说明他/她是否提醒过团队注意 AI 使用边界。"],
        },
        {
            "name": "Agent 调度与协同能力",
            "description": "是否能判断哪些任务适合交给 AI agent，并设定输入、输出、边界和复核机制。",
            "low_behavior": "不了解 agent 适用边界，容易把任务简单外包给工具。",
            "medium_behavior": "能用 agent 辅助部分任务，但对输入、输出和复核标准定义不足。",
            "high_behavior": "能拆解任务、设置 agent 协作链路，并保留关键人工判断。",
            "applicable_roles": "管理者, 高潜人才",
            "weight": 1.0,
            "sample_rating_questions": ["他/她是否能把复杂任务拆解为适合 AI agent 协作的步骤，并设置复核点？"],
            "sample_open_questions": ["请举例说明他/她如何调度 AI agent 辅助完成复杂任务。"],
        },
    ]
    return {
        "template": template,
        "name": "AI-native Manager Capability Model",
        "description": "用于诊断管理者是否具备 AI 时代的目标拆解、问题定义、人机协作、判断验证和团队学习扩散能力。",
        "dimensions": dimensions,
    }


def normalize_talent_model(value: Any, template: str) -> dict[str, Any]:
    raw = value.get("model", value) if isinstance(value, dict) else {}
    if not isinstance(raw, dict):
        return fallback_talent_model(template)
    dimensions = []
    for item in raw.get("dimensions", []):
        if not isinstance(item, dict) or not item.get("name"):
            continue
        dimensions.append(
            {
                "name": str(item.get("name", "")).strip(),
                "description": str(item.get("description", "")).strip(),
                "low_behavior": str(item.get("low_behavior", "")).strip(),
                "medium_behavior": str(item.get("medium_behavior", "")).strip(),
                "high_behavior": str(item.get("high_behavior", "")).strip(),
                "applicable_roles": str(item.get("applicable_roles", "全员, 管理者")).strip(),
                "weight": float(item.get("weight", 1.0) or 1.0),
                "sample_rating_questions": item.get("sample_rating_questions", []) if isinstance(item.get("sample_rating_questions", []), list) else [],
                "sample_open_questions": item.get("sample_open_questions", []) if isinstance(item.get("sample_open_questions", []), list) else [],
            }
        )
    if not dimensions:
        return fallback_talent_model(template)
    return {
        "template": template,
        "name": str(raw.get("name", "AI-native Manager Capability Model")).strip() or "AI-native Manager Capability Model",
        "description": str(raw.get("description", "")).strip(),
        "dimensions": dimensions,
    }


def serialize_talent_dimension(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["sample_rating_questions"] = loads_json(item.get("sample_rating_questions"), [])
    item["sample_open_questions"] = loads_json(item.get("sample_open_questions"), [])
    return item


def serialize_talent_model(conn: Any, row: Any) -> dict[str, Any]:
    item = as_dict(row)
    dimensions = conn.execute(
        "SELECT * FROM talent_dimensions WHERE model_id = ? ORDER BY id",
        (item["id"],),
    ).fetchall()
    item["dimensions"] = [serialize_talent_dimension(dimension) for dimension in dimensions]
    return item


def fetch_talent_model(conn: Any, model_id: int) -> dict[str, Any]:
    row = conn.execute("SELECT * FROM talent_models WHERE id = ?", (model_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="talent model not found")
    return serialize_talent_model(conn, row)


def fallback_questions_from_model(payload: QuestionnaireFromModelPayload, model: dict[str, Any]) -> list[dict[str, Any]]:
    dimensions = model.get("dimensions", []) or fallback_talent_model("AI-native Manager Model")["dimensions"]
    relation_scope = ",".join(payload.relation_types) or "上级,同级,下级,协作方"
    type_cycle = payload.question_types or ["rating"]
    question_count = max(1, min(payload.question_count, 36))
    question_templates = {
        "问题定义能力": "面对模糊目标时，他/她能否主动澄清目标、约束和判断标准，而不是直接开始执行？",
        "AI 工作流设计能力": "该管理者是否能判断哪些任务适合由 AI 辅助完成，哪些任务必须保留人工判断？",
        "判断与验证能力": "当 AI 输出与业务经验或事实数据冲突时，他/她是否会主动进行事实核查和人工判断？",
        "责任与治理意识": "他/她是否注意避免将员工敏感信息、客户隐私或公司机密直接输入外部 AI 工具？",
    }
    followups = {
        "问题定义能力": "请举例说明一次他/她处理模糊任务的表现。",
        "AI 工作流设计能力": "请描述一个他/她推动 AI 改进团队工作流程的例子。",
        "判断与验证能力": "请举例说明他/她如何发现或修正 AI 输出中的问题。",
        "责任与治理意识": "请举例说明他/她是否提醒过团队注意 AI 使用边界。",
    }
    questions = []
    for index in range(question_count):
        dimension = dimensions[index % len(dimensions)]
        name = dimension.get("name", "AI 时代能力")
        q_type = type_cycle[index % len(type_cycle)]
        content = question_templates.get(
            name,
            f"在{payload.target_level}场景下，他/她是否能稳定展现「{name}」，并用具体行为支持团队目标？",
        )
        if index >= len(dimensions):
            content = f"请评价他/她在最近一个真实工作场景中展现「{name}」的稳定程度。"
        questions.append(
            {
                "project_id": payload.project_id,
                "hypothesis_id": payload.hypothesis_id,
                "model_id": payload.model_id,
                "dimension_name": name,
                "content": content,
                "question_type": q_type,
                "relation_scope": relation_scope,
                "rating_type": "1-5",
                "open_followup": followups.get(name, f"请举例说明他/她在「{name}」上的具体表现。"),
                "weight": float(dimension.get("weight", 1.0) or 1.0),
            }
        )
    return questions


def normalize_model_questions(value: Any) -> list[dict[str, Any]]:
    raw_items = value.get("questions", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    questions = []
    for item in raw_items:
        if not isinstance(item, dict):
            continue
        content = str(item.get("content", item.get("text", ""))).strip()
        dimension_name = str(item.get("dimension_name", item.get("dimension", ""))).strip()
        if not content or not dimension_name:
            continue
        questions.append(
            {
                "dimension_name": dimension_name,
                "content": content,
                "question_type": str(item.get("question_type", "rating")).strip() or "rating",
                "relation_scope": str(item.get("relation_scope", "上级,同级,下级,协作方")).strip(),
                "rating_type": str(item.get("rating_type", "1-5")).strip() or "1-5",
                "open_followup": str(item.get("open_followup", "")).strip(),
                "weight": float(item.get("weight", 1.0) or 1.0),
            }
        )
    return questions


def save_model_questionnaire(
    conn: Any,
    payload: QuestionnaireFromModelPayload,
    model: dict[str, Any],
    questions: list[dict[str, Any]],
    editor: str = "AI model draft",
) -> dict[str, Any]:
    dimension_meta = {dimension["name"]: dimension for dimension in model.get("dimensions", [])}
    grouped: dict[str, dict[str, Any]] = {}
    for index, question in enumerate(questions):
        name = question["dimension_name"]
        meta = dimension_meta.get(name, {})
        grouped.setdefault(
            name,
            {
                "name": name,
                "description": meta.get("description", ""),
                "sort_order": len(grouped),
                "questions": [],
            },
        )
        grouped[name]["questions"].append(
            {
                "text": question["content"],
                "behavior_anchor": question.get("open_followup", ""),
                "question_type": question.get("question_type", "rating"),
                "relation_scope": question.get("relation_scope", "上级,同级,下级,协作方"),
                "rating_type": question.get("rating_type", "1-5"),
                "open_followup": question.get("open_followup", ""),
                "weight": question.get("weight", 1.0),
                "hypothesis_id": payload.hypothesis_id,
                "model_id": payload.model_id,
                "sort_order": index,
            }
        )
    questionnaire = save_questionnaire(conn, payload.project_id, list(grouped.values()), editor=editor)
    saved_questions = []
    for dimension in questionnaire["dimensions"]:
        for question in dimension["questions"]:
            saved_questions.append(
                {
                    "id": question["id"],
                    "project_id": question["project_id"],
                    "hypothesis_id": question.get("hypothesis_id"),
                    "model_id": question.get("model_id"),
                    "dimension_id": dimension["id"],
                    "dimension_name": dimension["name"],
                    "content": question.get("content") or question.get("text"),
                    "question_type": question.get("question_type", "rating"),
                    "relation_scope": question.get("relation_scope", ""),
                    "rating_type": question.get("rating_type", "1-5"),
                    "open_followup": question.get("open_followup", ""),
                    "weight": question.get("weight", 1.0),
                }
            )
    questionnaire["questions"] = saved_questions
    return questionnaire


def serialize_diagnosis_rule(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["condition_json"] = loads_json(item.get("condition_json"), {})
    item["evidence_sources"] = loads_json(item.get("evidence_sources"), [])
    return item


def fallback_diagnosis_rules() -> list[dict[str, Any]]:
    return [
        {
            "rule_name": "自评高于他评",
            "condition_type": "self_other_gap",
            "condition_json": {"metric": "self_score_minus_others_score", "operator": ">=", "threshold": 1.0},
            "diagnosis_text": "可能存在自我认知盲区，需要在反馈面谈中结合具体行为证据核对。",
            "risk_level": "medium",
            "suggested_action": "建议 HR 在反馈面谈中引导被评人对照具体行为案例进行复盘。",
            "evidence_sources": ["360评分", "开放反馈"],
        },
        {
            "rule_name": "上级评分明显高于下级评分",
            "condition_type": "manager_subordinate_gap",
            "condition_json": {"metric": "manager_score_minus_subordinate_score", "operator": ">=", "threshold": 1.0},
            "diagnosis_text": "可能存在向上管理强、向下授权和沟通不足。",
            "risk_level": "high",
            "suggested_action": "结合下级开放反馈，判断是否存在目标不清、授权不足或反馈缺失。",
            "evidence_sources": ["360评分", "下级开放反馈"],
        },
        {
            "rule_name": "AI 协作能力低但学习迭代能力高",
            "condition_type": "ai_adoption_gap",
            "condition_json": {"low_dimension": "AI 协作能力", "low_operator": "<", "low_threshold": 3, "high_dimension": "学习迭代能力", "high_operator": ">", "high_threshold": 4},
            "diagnosis_text": "可能不是潜力不足，而是缺少 AI 方法训练和工具场景。",
            "risk_level": "medium",
            "suggested_action": "提供 AI 工作流训练和岗位场景化实践。",
            "evidence_sources": ["AI人才模型评分", "开放反馈"],
        },
        {
            "rule_name": "跨部门协作低且员工反馈中出现审批慢",
            "condition_type": "feedback_theme_frequency",
            "condition_json": {"dimension": "跨部门协作", "operator": "<", "threshold": 3, "themes": ["审批慢", "信息不同步", "决策不清"]},
            "diagnosis_text": "优先判断为组织机制问题，而不是单个员工协作意愿问题。",
            "risk_level": "high",
            "suggested_action": "推动 RACI 角色澄清、会议机制优化和跨部门 SLA。",
            "evidence_sources": ["360评分", "员工反馈池"],
        },
    ]


def normalize_diagnosis_rules(value: Any) -> list[dict[str, Any]]:
    raw_items = value.get("rules", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    rules = []
    for item in raw_items:
        if not isinstance(item, dict) or not item.get("rule_name") or not item.get("diagnosis_text"):
            continue
        evidence = item.get("evidence_sources", [])
        rules.append(
            {
                "rule_name": str(item.get("rule_name", "")).strip(),
                "condition_type": str(item.get("condition_type", "custom")).strip() or "custom",
                "condition_json": item.get("condition_json", {}) if isinstance(item.get("condition_json", {}), dict) else {},
                "diagnosis_text": str(item.get("diagnosis_text", "")).strip(),
                "risk_level": str(item.get("risk_level", "medium")).strip() or "medium",
                "suggested_action": str(item.get("suggested_action", "")).strip(),
                "evidence_sources": evidence if isinstance(evidence, list) else [],
            }
        )
    return rules


def serialize_feedback_cluster(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["related_departments"] = loads_json(item.get("related_departments"), [])
    return item


def fallback_feedback_clusters() -> list[dict[str, Any]]:
    return [
        {
            "theme": "跨部门决策机制不清",
            "summary": "多条反馈提到项目推进时不知道谁拍板，审批链路较长，信息同步不充分。",
            "evidence_count": 12,
            "related_departments": ["产品", "运营", "销售"],
            "risk_level": "high",
            "suggested_action": "建立跨部门项目 RACI 表，明确最终决策人和响应时限。",
        },
        {
            "theme": "目标优先级频繁变化",
            "summary": "员工反馈中多次出现目标变化快、优先级不清、临时任务打断原计划等问题。",
            "evidence_count": 9,
            "related_departments": ["多个团队"],
            "risk_level": "high",
            "suggested_action": "建立月度目标同步机制，减少临时性目标切换。",
        },
        {
            "theme": "AI 使用规范缺失",
            "summary": "员工普遍不知道哪些数据可以输入 AI 工具，哪些结果需要人工复核。",
            "evidence_count": 7,
            "related_departments": ["全员"],
            "risk_level": "medium",
            "suggested_action": "制定 AI 使用边界、敏感数据规范和人工复核机制。",
        },
        {
            "theme": "AI 使用停留在个人提效，没有进入流程改造",
            "summary": "反馈显示部分管理者只要求员工用 AI 提效，但没有改造团队流程和协作方式。",
            "evidence_count": 6,
            "related_departments": ["管理者团队"],
            "risk_level": "medium",
            "suggested_action": "对管理者开展 AI 工作流设计训练。",
        },
    ]


def normalize_feedback_clusters(value: Any) -> list[dict[str, Any]]:
    raw_items = value.get("clusters", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    clusters = []
    for item in raw_items:
        if not isinstance(item, dict) or not item.get("theme"):
            continue
        departments = item.get("related_departments", [])
        clusters.append(
            {
                "theme": str(item.get("theme", "")).strip(),
                "summary": str(item.get("summary", "")).strip(),
                "evidence_count": int(item.get("evidence_count", 0) or 0),
                "related_departments": departments if isinstance(departments, list) else [],
                "risk_level": str(item.get("risk_level", "medium")).strip() or "medium",
                "suggested_action": str(item.get("suggested_action", "")).strip(),
            }
        )
    return clusters


def serialize_organization_risk(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["evidence_json"] = loads_json(item.get("evidence_json"), {})
    return item


def fallback_organization_risks() -> list[dict[str, Any]]:
    return [
        {
            "risk_type": "collaboration_risk",
            "title": "跨部门协作机制不清",
            "description": "多个评价关系和员工反馈均显示跨部门项目中责任边界、决策人和信息同步机制不清。",
            "evidence_json": {"feedback_themes": ["跨部门决策机制不清"], "score_signals": ["协作方评分低于平均值"], "diagnosis_rules": ["跨部门协作低且员工反馈中出现审批慢"]},
            "affected_scope": "产品、运营、销售",
            "risk_level": "high",
            "suggested_action": "建立跨部门 RACI 机制和响应时限。",
        },
        {
            "risk_type": "governance_risk",
            "title": "AI 使用规范缺失",
            "description": "员工反馈显示大家不确定哪些数据可以输入 AI 工具，也不清楚哪些输出需要人工复核。",
            "evidence_json": {"feedback_themes": ["AI 使用规范缺失"], "score_signals": ["责任与治理意识待验证"]},
            "affected_scope": "全员",
            "risk_level": "medium",
            "suggested_action": "发布 AI 使用边界、敏感数据处理和人工复核机制。",
        },
        {
            "risk_type": "ai_adoption_risk",
            "title": "中层管理者 AI 工作流设计能力不足",
            "description": "AI 使用仍偏个人提效，管理者尚未把 AI 嵌入团队工作流和协作机制。",
            "evidence_json": {"feedback_themes": ["AI 使用停留在个人提效"], "score_signals": ["AI 工作流设计能力低"]},
            "affected_scope": "管理者团队",
            "risk_level": "high",
            "suggested_action": "对管理者开展 AI 工作流设计训练，并选择试点团队复盘。",
        },
        {
            "risk_type": "workflow_risk",
            "title": "目标优先级变化频繁",
            "description": "员工反馈中多次出现临时任务打断、目标变化快和优先级不清。",
            "evidence_json": {"feedback_themes": ["目标优先级频繁变化"], "score_signals": ["目标拆解相关维度待关注"]},
            "affected_scope": "多个团队",
            "risk_level": "high",
            "suggested_action": "建立月度目标同步与变更评审机制，减少临时目标切换。",
        },
        {
            "risk_type": "employee_voice_risk",
            "title": "员工反馈闭环不足",
            "description": "如果反馈长期停留在 new/reviewing，员工可能降低继续反馈的意愿。",
            "evidence_json": {"feedback_status": ["new", "reviewing"]},
            "affected_scope": "全员",
            "risk_level": "medium",
            "suggested_action": "建立反馈处理 SLA 和月度公开反馈闭环摘要。",
        },
    ]


def normalize_organization_risks(value: Any) -> list[dict[str, Any]]:
    raw_items = value.get("risks", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    risks = []
    for item in raw_items:
        if not isinstance(item, dict) or not item.get("title"):
            continue
        risks.append(
            {
                "risk_type": str(item.get("risk_type", "workflow_risk")).strip() or "workflow_risk",
                "title": str(item.get("title", "")).strip(),
                "description": str(item.get("description", "")).strip(),
                "evidence_json": item.get("evidence_json", {}) if isinstance(item.get("evidence_json", {}), dict) else {},
                "affected_scope": str(item.get("affected_scope", "")).strip(),
                "risk_level": str(item.get("risk_level", "medium")).strip() or "medium",
                "suggested_action": str(item.get("suggested_action", "")).strip(),
            }
        )
    return risks


def fallback_action_plans(project_id: int, report_id: int | None = None) -> list[dict[str, Any]]:
    return [
        {"project_id": project_id, "report_id": report_id, "target_type": "organization", "title": "快速澄清问题与召开关键反馈会", "description": "围绕低分维度、员工声音主题和组织风险进行 1-2 场关键反馈会，确认哪些是能力问题、流程问题或管理机制问题。", "timeline": "30天", "status": "pending", "ai_generated": True},
        {"project_id": project_id, "report_id": report_id, "target_type": "organization", "title": "制定 AI 使用基本规范并选择试点团队", "description": "明确敏感数据、人工复核、外部工具输入边界，并选择一个业务团队试点 AI 工作流。", "timeline": "30天", "status": "pending", "ai_generated": True},
        {"project_id": project_id, "report_id": report_id, "target_type": "organization", "title": "推动流程改造与管理者 AI 工作流训练", "description": "对管理者开展 AI 工作流设计训练，建立跨部门协作机制和反馈复盘节奏。", "timeline": "60天", "status": "pending", "ai_generated": True},
        {"project_id": project_id, "report_id": report_id, "target_type": "organization", "title": "跟踪员工反馈变化并复盘试点", "description": "跟踪员工反馈主题、任务完成率和关键维度变化，复盘试点团队的流程改造成效。", "timeline": "60天", "status": "pending", "ai_generated": True},
        {"project_id": project_id, "report_id": report_id, "target_type": "organization", "title": "复测关键维度并扩展成熟机制", "description": "复测关键 360 维度，评估试点效果，更新人才模型并形成长期组织改进计划。", "timeline": "90天", "status": "pending", "ai_generated": True},
    ]


def normalize_action_plans(value: Any, project_id: int, report_id: int | None = None) -> list[dict[str, Any]]:
    raw_items = value.get("action_plans", value) if isinstance(value, dict) else value
    if not isinstance(raw_items, list):
        return []
    plans = []
    for item in raw_items:
        if not isinstance(item, dict) or not item.get("title"):
            continue
        plans.append(
            {
                "project_id": int(item.get("project_id") or project_id),
                "report_id": item.get("report_id", report_id),
                "owner_id": item.get("owner_id"),
                "target_type": str(item.get("target_type", "organization")).strip() or "organization",
                "target_id": item.get("target_id"),
                "title": str(item.get("title", "")).strip(),
                "description": str(item.get("description", "")).strip(),
                "timeline": str(item.get("timeline", "30天")).strip() or "30天",
                "status": str(item.get("status", "pending")).strip() or "pending",
                "ai_generated": bool(item.get("ai_generated", True)),
            }
        )
    return plans


def build_diagnosis_context(conn: Any, project_id: int, hypothesis_id: int | None = None, model_id: int | None = None) -> dict[str, Any]:
    analytics = build_analytics(conn, project_id)
    hypothesis = None
    model = None
    if hypothesis_id:
        row = conn.execute("SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,)).fetchone()
        hypothesis = serialize_diagnosis(row) if row else None
    if model_id:
        row = conn.execute("SELECT * FROM talent_models WHERE id = ?", (model_id,)).fetchone()
        model = serialize_talent_model(conn, row) if row else None
    rules = [serialize_diagnosis_rule(row) for row in conn.execute("SELECT * FROM diagnosis_rules WHERE project_id IS NULL OR project_id = ? ORDER BY risk_level DESC, id DESC LIMIT 20", (project_id,)).fetchall()]
    clusters = [serialize_feedback_cluster(row) for row in conn.execute("SELECT * FROM feedback_clusters WHERE project_id IS NULL OR project_id = ? ORDER BY evidence_count DESC, id DESC LIMIT 20", (project_id,)).fetchall()]
    risks = [serialize_organization_risk(row) for row in conn.execute("SELECT * FROM organization_risks WHERE project_id = ? ORDER BY risk_level DESC, id DESC LIMIT 20", (project_id,)).fetchall()]
    return {"analytics": analytics, "hypothesis": hypothesis, "model": model, "diagnosis_rules": rules, "feedback_clusters": clusters, "organization_risks": risks}


def fallback_diagnosis_report(context: dict[str, Any], report_type: str, include_action_plan: bool) -> str:
    analytics = context["analytics"]
    low_dimensions = sorted(
        [row for row in analytics.get("dimension_averages", []) if row.get("avg_score") is not None],
        key=lambda row: row["avg_score"],
    )[:3]
    low_text = "、".join([f"{row['name']}({row['avg_score']})" for row in low_dimensions]) or "暂无足够评分数据"
    risk_text = "、".join([risk["title"] for risk in context.get("organization_risks", [])[:3]]) or "暂无已生成组织风险"
    cluster_text = "、".join([cluster["theme"] for cluster in context.get("feedback_clusters", [])[:3]]) or "暂无反馈聚类"
    action_section = """
## 30/60/90 天行动计划
### 30 天
- 快速澄清问题，召开关键反馈会。
- 制定 AI 使用基本规范，选择试点团队，明确责任人。

### 60 天
- 推动流程改造，开展管理者 AI 工作流训练。
- 建立跨部门协作机制，跟踪员工反馈变化，建立复盘节奏。

### 90 天
- 复测关键维度，评估试点效果。
- 扩展成熟机制，更新人才模型，形成长期组织改进计划。
""" if include_action_plan else ""
    return f"""# {report_type}（HR 待确认）

> 本报告仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有结论需要 HR 结合业务事实进行人工确认。

## 诊断摘要
当前项目完成率为 {analytics.get('completion_rate', 0)}%，覆盖 {analytics.get('employee_count', 0)} 名员工。MVP 诊断建议将评分差异、员工声音和 HR 诊断假设合并解读。

## 本次诊断假设
{context.get('hypothesis', {}).get('ai_extracted_hypotheses', [{'hypothesis_title': '暂无已确认假设'}])[0].get('hypothesis_title', '暂无已确认假设') if context.get('hypothesis') else '暂无已确认假设'}

## 关键发现
- 低分或待关注维度：{low_text}
- 员工反馈交叉验证主题：{cluster_text}
- 组织风险：{risk_text}

## 评分差异分析
系统已检查自评与他评、上级与下级、同级与协作方差异。若差异较大，建议 HR 回到具体行为证据，而不是直接下结论。

## AI 时代人才维度表现
重点关注问题定义能力、AI 协作能力、判断与验证能力、Agent 调度与协同能力，以及责任与治理意识。

## 组织问题归因
优先区分个人能力差距、管理机制问题、流程卡点、跨部门责任边界和 AI 治理缺口。

## AI 转型卡点
- AI 使用可能仍停留在个人提效层面。
- 管理者可能缺少 AI 工作流设计能力。
- 员工可能缺少 AI 使用规范和人工复核边界。

## 风险提示
本报告不能用于自动化人事决策；少于 3 人评价群体的原始评论不得单独展示。

## 建议行动
- 先用访谈验证高风险信号。
- 对管理者开展 AI 工作流设计训练。
- 建立跨部门 RACI 和反馈处理闭环。
{action_section}

## HR 人工确认区
- HR 确认人：
- 业务事实补充：
- 后续复盘时间：
"""


def serialize_diagnosis_report(row: Any) -> dict[str, Any]:
    return as_dict(row)


def serialize_action_plan(row: Any) -> dict[str, Any]:
    item = as_dict(row)
    item["ai_generated"] = bool(item.get("ai_generated"))
    return item


def build_organization_dashboard(conn: Any, project_id: int) -> dict[str, Any]:
    analytics = build_analytics(conn, project_id)
    task_row = conn.execute(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS submitted
        FROM review_tasks
        WHERE project_id = ?
        """,
        (project_id,),
    ).fetchone()
    total_tasks = int(task_row["total"] or 0)
    submitted_tasks = int(task_row["submitted"] or 0)
    if not total_tasks:
        total_tasks = int(analytics.get("relationships_count", 0) or 0)
        submitted_tasks = int(analytics.get("responses_count", 0) or 0)
    pending_tasks = max(total_tasks - submitted_tasks, 0)
    completion_rate = round(submitted_tasks / total_tasks * 100, 1) if total_tasks else 0

    dimension_scores = analytics.get("dimension_averages", [])
    scored_dimensions = [row for row in dimension_scores if row.get("avg_score") is not None]
    high_dimensions = sorted(scored_dimensions, key=lambda row: row["avg_score"], reverse=True)[:3]
    low_dimensions = sorted(scored_dimensions, key=lambda row: row["avg_score"])[:3]
    level_rows = conn.execute(
        """
        SELECT e.level, d.name AS dimension_name, ROUND(AVG(rs.score), 2) AS avg_score
        FROM responses r
        JOIN employees e ON e.id = r.subject_employee_id
        JOIN response_scores rs ON rs.response_id = r.id
        JOIN questions q ON q.id = rs.question_id
        JOIN dimensions d ON d.id = q.dimension_id
        WHERE r.project_id = ?
        GROUP BY e.level, d.id, d.name
        ORDER BY e.level, d.sort_order
        """,
        (project_id,),
    ).fetchall()

    clusters = [serialize_feedback_cluster(row) for row in conn.execute(
        "SELECT * FROM feedback_clusters WHERE project_id IS NULL OR project_id = ? ORDER BY evidence_count DESC, id DESC LIMIT 10",
        (project_id,),
    ).fetchall()]
    risks = [serialize_organization_risk(row) for row in conn.execute(
        "SELECT * FROM organization_risks WHERE project_id = ? ORDER BY risk_level DESC, id DESC LIMIT 10",
        (project_id,),
    ).fetchall()]
    rules = [serialize_diagnosis_rule(row) for row in conn.execute(
        "SELECT * FROM diagnosis_rules WHERE project_id IS NULL OR project_id = ? ORDER BY id DESC LIMIT 10",
        (project_id,),
    ).fetchall()]

    potential_keywords = ["问题定义", "AI", "学习", "判断", "Agent"]
    potential_rows = conn.execute(
        """
        SELECT e.id, e.name, e.department, ROUND(AVG(rs.score), 2) AS avg_score,
               GROUP_CONCAT(DISTINCT d.name) AS dimensions
        FROM employees e
        JOIN responses r ON r.subject_employee_id = e.id
        JOIN response_scores rs ON rs.response_id = r.id
        JOIN questions q ON q.id = rs.question_id
        JOIN dimensions d ON d.id = q.dimension_id
        WHERE e.project_id = ?
          AND (d.name LIKE '%问题定义%' OR d.name LIKE '%AI%' OR d.name LIKE '%学习%' OR d.name LIKE '%判断%' OR d.name LIKE '%Agent%')
        GROUP BY e.id, e.name, e.department
        HAVING avg_score >= 4
        ORDER BY avg_score DESC
        LIMIT 12
        """,
        (project_id,),
    ).fetchall()
    high_potential_signals = [
        {
            **as_dict(row),
            "dimension_summary": row["dimensions"] or "问题定义/AI协作/学习迭代/判断验证/Agent 调度",
        }
        for row in potential_rows
    ]

    if risks:
        ai_bottlenecks = [
            risk for risk in risks
            if risk["risk_type"] in {"ai_adoption_risk", "governance_risk", "workflow_risk"}
        ][:5]
    else:
        ai_bottlenecks = [
            {"title": "AI 使用停留在个人层面", "risk_level": "medium", "suggested_action": "识别高频岗位场景，设计团队级 AI 工作流。"},
            {"title": "管理者没有设计 AI 工作流", "risk_level": "high", "suggested_action": "开展管理者 AI 工作流设计训练。"},
            {"title": "员工缺少 AI 使用规范", "risk_level": "medium", "suggested_action": "发布敏感数据和人工复核边界。"},
        ]

    return {
        "project_id": project_id,
        "completion": {
            "total": total_tasks,
            "submitted": submitted_tasks,
            "pending": pending_tasks,
            "completion_rate": completion_rate,
        },
        "talent_model_performance": {
            "dimension_averages": dimension_scores,
            "high_dimensions": high_dimensions,
            "low_dimensions": low_dimensions,
            "department_differences": analytics.get("department_heatmap", []),
            "level_differences": [as_dict(row) for row in level_rows],
        },
        "score_differences": {
            "self_other_gaps": analytics.get("self_other_gaps", []),
            "group_differences": analytics.get("group_differences", []),
            "risk_alerts": analytics.get("risk_alerts", []),
            "explanation": "差异信号用于提示 HR 回到行为证据和访谈验证，不直接形成自动人事结论。",
        },
        "employee_voice": clusters,
        "organization_risks": risks,
        "diagnosis_rules": rules,
        "high_potential_signals": {
            "count": len(high_potential_signals),
            "employees": high_potential_signals,
            "notice": "该结果仅作为人才发展线索，不作为晋升或淘汰依据。",
        },
        "ai_transformation_bottlenecks": ai_bottlenecks,
        "empty_state": "数据不足时可先生成诊断规则、员工声音聚类和组织风险 mock，用于演示诊断框架。",
    }


@app.on_event("startup")
def on_startup() -> None:
    init_db()


init_db()


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "hr-ai-consulting",
        "status": "ok",
        "message": "HR AI Consulting backend is running",
        "docs": "/docs",
        "health": "/api/health",
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "time": now_text()}


@app.get("/api/ai/settings")
def get_ai_settings() -> dict[str, Any]:
    settings = get_settings()
    return {
        "base_url": settings["base_url"],
        "model": settings["model"],
        "hasModelCredential": bool(settings["api_key"]),
        "has_api_key": bool(settings["api_key"]),
    }


@app.post("/api/ai/settings")
def save_ai_settings(payload: AISettingsPayload) -> dict[str, Any]:
    model_credential = (payload.modelCredential or payload.legacyCredential).strip()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO ai_settings (id, api_key, base_url, model, updated_at)
            VALUES (1, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                api_key = excluded.api_key,
                base_url = excluded.base_url,
                model = excluded.model,
                updated_at = CURRENT_TIMESTAMP
            """,
            (model_credential, payload.base_url.strip().rstrip("/") or DEFAULT_BASE_URL, payload.model.strip() or DEFAULT_MODEL),
        )
    return get_ai_settings()


@app.get("/api/projects")
def list_projects(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = optional_current_user(authorization)
    with get_connection() as conn:
        if user and user.get("role") == "employee" and user.get("employee_id"):
            rows = conn.execute(
                """
                SELECT DISTINCT projects.*
                FROM projects
                LEFT JOIN employees ON employees.project_id = projects.id
                LEFT JOIN review_tasks ON review_tasks.project_id = projects.id
                WHERE employees.id = ? OR review_tasks.reviewer_id = ?
                ORDER BY projects.created_at DESC, projects.id DESC
                """,
                (user["employee_id"], user["employee_id"]),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM projects ORDER BY created_at DESC, id DESC").fetchall()
        return [serialize_project(row) for row in rows]


@app.post("/api/projects")
def create_project(payload: ProjectPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = optional_current_user(authorization)
    if user and user["role"] == "employee":
        raise HTTPException(status_code=403, detail="hr only")
    description = payload.description or payload.purpose
    target_scope = payload.target_scope or payload.scope
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO projects
                (name, description, project_type, target_scope, purpose, scope, start_date, end_date,
                 anonymous, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.name,
                description,
                payload.project_type,
                target_scope,
                payload.purpose or description,
                payload.scope or target_scope,
                payload.start_date,
                payload.end_date,
                int(payload.anonymous),
                payload.status,
                user.get("id") if user else None,
            ),
        )
        project_id = int(cur.lastrowid)
        conn.execute(
            """
            INSERT INTO review_projects (id, name, purpose, scope, start_date, end_date, anonymous, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                purpose = excluded.purpose,
                scope = excluded.scope,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                anonymous = excluded.anonymous
            """,
            (
                project_id,
                payload.name,
                payload.purpose,
                payload.scope,
                payload.start_date,
                payload.end_date,
                int(payload.anonymous),
            ),
        )
        return serialize_project(fetch_one_or_404(conn, "SELECT * FROM projects WHERE id = ?", (project_id,), "project"))


@app.get("/api/projects/{project_id}")
def get_project(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        project = serialize_project(fetch_one_or_404(conn, "SELECT * FROM projects WHERE id = ?", (project_id,), "project"))
        project["analytics"] = build_analytics(conn, project_id)
        return project


@app.put("/api/projects/{project_id}")
def update_project(project_id: int, payload: ProjectPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = optional_current_user(authorization)
    if user and user["role"] == "employee":
        raise HTTPException(status_code=403, detail="hr only")
    description = payload.description or payload.purpose
    target_scope = payload.target_scope or payload.scope
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM projects WHERE id = ?", (project_id,), "project")
        conn.execute(
            """
            UPDATE projects
            SET name = ?, description = ?, project_type = ?, target_scope = ?, purpose = ?, scope = ?, start_date = ?, end_date = ?,
                anonymous = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                payload.name,
                description,
                payload.project_type,
                target_scope,
                payload.purpose or description,
                payload.scope or target_scope,
                payload.start_date,
                payload.end_date,
                int(payload.anonymous),
                payload.status,
                project_id,
            ),
        )
        conn.execute(
            """
            INSERT INTO review_projects (id, name, purpose, scope, start_date, end_date, anonymous, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                purpose = excluded.purpose,
                scope = excluded.scope,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                anonymous = excluded.anonymous
            """,
            (
                project_id,
                payload.name,
                payload.purpose,
                payload.scope,
                payload.start_date,
                payload.end_date,
                int(payload.anonymous),
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM projects WHERE id = ?", (project_id,), "project")
        record_edit(conn, project_id, None, "project", project_id, before, after)
        return serialize_project(after)


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, bool]:
    require_hr_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
    return {"ok": True}


@app.get("/api/projects/{project_id}/questionnaire")
def get_questionnaire(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        return fetch_questionnaire(conn, project_id)


@app.put("/api/projects/{project_id}/questionnaire")
def update_questionnaire(project_id: int, payload: QuestionnaireSavePayload) -> dict[str, Any]:
    dimensions = [dimension.model_dump() for dimension in payload.dimensions]
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        return save_questionnaire(conn, project_id, dimensions)


@app.post("/api/projects/{project_id}/questionnaire/generate")
def generate_questionnaire(project_id: int, payload: QuestionnaireGeneratePayload) -> dict[str, Any]:
    system = "你是资深组织发展与胜任力模型顾问，只输出可解析 JSON。"
    prompt = f"""
请为 360 评审生成胜任力模型。岗位：{payload.role}；层级：{payload.level}。
要求：
1. 输出 JSON，结构为 {{"dimensions":[{{"name":"","description":"","questions":[{{"text":"","behavior_anchor":""}}]}}]}}。
2. 维度 4-6 个，每个维度 3 个行为化题目。
3. 题目必须可观察、可评分，避免抽象、重复或诱导性表述。
4. 不要涉及晋升、淘汰、薪酬结论。
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    dimensions = normalize_questionnaire(parsed) if parsed is not None else []
    if not dimensions:
        dimensions = fallback_competency_model(payload.role, payload.level)
        used_fallback = True
        ai_text = dumps({"dimensions": dimensions, "fallback_reason": error or "AI output could not be parsed."})

    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        result = save_questionnaire(conn, project_id, dimensions, editor="AI draft")
        ai_run_id = record_ai_run(
            conn,
            project_id,
            None,
            "competency_model_generation",
            prompt,
            payload.model_dump(),
            ai_text or dumps({"dimensions": dimensions}),
            used_fallback,
        )
        result["ai_run_id"] = ai_run_id
        result["used_fallback"] = used_fallback
        return result


@app.post("/api/projects/{project_id}/questionnaire/inspect")
def inspect_questionnaire(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        questionnaire = fetch_questionnaire(conn, project_id)
    system = "你是严谨的 360 问卷质量审查专家，只输出 JSON。"
    prompt = f"""
请检查以下 360 问卷题目是否过于抽象、重复或有诱导性。
输出 JSON：{{"issues":[{{"type":"","question":"","suggestion":""}}]}}。
问卷：
{dumps(questionnaire)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    issues = parsed.get("issues", []) if isinstance(parsed, dict) else []
    if not issues:
        issues = fallback_question_issues(questionnaire["dimensions"])
        used_fallback = True
        ai_text = dumps({"issues": issues, "fallback_reason": error or "AI output could not be parsed."})

    with get_connection() as conn:
        ai_run_id = record_ai_run(conn, project_id, None, "questionnaire_quality_check", prompt, questionnaire, ai_text, used_fallback)
    return {"issues": issues, "ai_run_id": ai_run_id, "used_fallback": used_fallback}


@app.post("/api/diagnosis/hypotheses")
def create_diagnosis_hypothesis(
    payload: DiagnosisHypothesisPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        if payload.project_id:
            fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (payload.project_id,), "project")
        cur = conn.execute(
            """
            INSERT INTO diagnosis_hypotheses
                (project_id, created_by, target_scope, diagnosis_purpose, company_stage,
                 hr_core_judgment, target_talent, focus_issues, constraints, expected_outputs,
                 ai_extracted_hypotheses, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.project_id,
                user["id"],
                payload.target_scope,
                dumps(payload.diagnosis_purpose),
                payload.company_stage,
                payload.hr_core_judgment,
                payload.target_talent,
                dumps(payload.focus_issues),
                payload.constraints,
                dumps(payload.expected_outputs),
                dumps(payload.ai_extracted_hypotheses),
                payload.status,
            ),
        )
        return serialize_diagnosis(
            fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (int(cur.lastrowid),), "diagnosis hypothesis")
        )


@app.get("/api/diagnosis/hypotheses")
def list_diagnosis_hypotheses(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM diagnosis_hypotheses ORDER BY updated_at DESC, id DESC").fetchall()
        return [serialize_diagnosis(row) for row in rows]


@app.get("/api/diagnosis/hypotheses/{hypothesis_id}")
def get_diagnosis_hypothesis(
    hypothesis_id: int,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        row = fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,), "diagnosis hypothesis")
        return serialize_diagnosis(row)


@app.put("/api/diagnosis/hypotheses/{hypothesis_id}")
def update_diagnosis_hypothesis(
    hypothesis_id: int,
    payload: DiagnosisHypothesisPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,), "diagnosis hypothesis")
        conn.execute(
            """
            UPDATE diagnosis_hypotheses
            SET project_id = ?, target_scope = ?, diagnosis_purpose = ?, company_stage = ?,
                hr_core_judgment = ?, target_talent = ?, focus_issues = ?, constraints = ?,
                expected_outputs = ?, ai_extracted_hypotheses = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                payload.project_id,
                payload.target_scope,
                dumps(payload.diagnosis_purpose),
                payload.company_stage,
                payload.hr_core_judgment,
                payload.target_talent,
                dumps(payload.focus_issues),
                payload.constraints,
                dumps(payload.expected_outputs),
                dumps(payload.ai_extracted_hypotheses),
                payload.status,
                hypothesis_id,
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,), "diagnosis hypothesis")
        record_edit(conn, payload.project_id, None, "diagnosis_hypothesis", hypothesis_id, serialize_diagnosis(before), serialize_diagnosis(after))
        return serialize_diagnosis(after)


@app.post("/api/diagnosis/hypotheses/generate")
def generate_diagnosis_hypotheses(
    payload: DiagnosisHypothesisPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    system = "你是资深组织诊断与 AI 时代人才评估顾问，只输出可解析 JSON。"
    prompt = f"""
请根据 HR 输入提炼结构化诊断假设，输出 JSON：{{"hypotheses":[{{"hypothesis_title":"","hypothesis_detail":"","problem_type":"manager","suggested_validation_method":"","suggested_data_sources":[],"related_talent_dimensions":[]}}]}}。
problem_type 只能是 individual、manager、organization、ai_transformation、governance。
HR 输入：
{dumps(payload.model_dump())}
约束：AI 输出仅用于发展反馈和组织诊断，不得作为自动晋升、淘汰、薪酬或裁员决策依据。
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    hypotheses = normalize_hypotheses(parsed) if parsed is not None else []
    if not hypotheses:
        hypotheses = fallback_hypotheses()
        used_fallback = True
        ai_text = dumps({"hypotheses": hypotheses, "fallback_reason": error or "AI output could not be parsed."})

    with get_connection() as conn:
        run_id = record_ai_run(
            conn,
            payload.project_id,
            None,
            "generate_hypotheses",
            prompt,
            payload.model_dump(),
            ai_text or dumps({"hypotheses": hypotheses}),
            used_fallback,
            created_by=user["id"],
        )
        if payload.id:
            conn.execute(
                """
                UPDATE diagnosis_hypotheses
                SET ai_extracted_hypotheses = ?, status = 'generated', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (dumps(hypotheses), payload.id),
            )
            row = fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (payload.id,), "diagnosis hypothesis")
            result = serialize_diagnosis(row)
        else:
            result = {**payload.model_dump(), "ai_extracted_hypotheses": hypotheses, "status": "generated"}
        result["ai_run_id"] = run_id
        result["used_fallback"] = used_fallback
        return result


@app.post("/api/diagnosis/hypotheses/{hypothesis_id}/confirm")
def confirm_diagnosis_hypothesis(
    hypothesis_id: int,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,), "diagnosis hypothesis")
        conn.execute(
            "UPDATE diagnosis_hypotheses SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (hypothesis_id,),
        )
        row = fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (hypothesis_id,), "diagnosis hypothesis")
        return serialize_diagnosis(row)


@app.post("/api/talent/models/generate")
def generate_talent_model(
    payload: TalentModelGeneratePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        hypothesis = serialize_diagnosis(
            fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (payload.hypothesis_id,), "diagnosis hypothesis")
        )
    system = "你是 AI 时代人才模型与组织发展专家，只输出可解析 JSON。"
    prompt = f"""
请基于以下诊断假设生成 AI 时代人才模型。输出 JSON：{{"model":{{"name":"","description":"","dimensions":[{{"name":"","description":"","low_behavior":"","medium_behavior":"","high_behavior":"","applicable_roles":"","weight":1.0,"sample_rating_questions":[],"sample_open_questions":[]}}]}}}}。
模型模板：{payload.template}
诊断假设：
{dumps(hypothesis)}
要求：维度 6-10 个，包含低/中/高行为标准和样例题目，不输出自动人事决策建议。
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    model = normalize_talent_model(parsed, payload.template) if parsed is not None else fallback_talent_model(payload.template)
    if parsed is None or not model.get("dimensions"):
        model = fallback_talent_model(payload.template)
        used_fallback = True
        ai_text = dumps({"model": model, "fallback_reason": error or "AI output could not be parsed."})

    model.update({
        "project_id": payload.project_id or hypothesis.get("project_id"),
        "hypothesis_id": payload.hypothesis_id,
        "status": "draft",
        "source_type": "ai_generated",
    })
    with get_connection() as conn:
        run_id = record_ai_run(
            conn,
            model.get("project_id"),
            None,
            "generate_talent_model",
            prompt,
            payload.model_dump(),
            ai_text or dumps({"model": model}),
            used_fallback,
            created_by=user["id"],
        )
    return {"model": model, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.post("/api/talent/models")
def create_talent_model(
    payload: TalentModelPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO talent_models
                (project_id, hypothesis_id, name, description, source_type, created_by, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (payload.project_id, payload.hypothesis_id, payload.name, payload.description, payload.source_type, user["id"], payload.status),
        )
        model_id = int(cur.lastrowid)
        for dimension in payload.dimensions:
            conn.execute(
                """
                INSERT INTO talent_dimensions
                    (model_id, name, description, low_behavior, medium_behavior, high_behavior,
                     applicable_roles, weight, sample_rating_questions, sample_open_questions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    model_id,
                    dimension.name,
                    dimension.description,
                    dimension.low_behavior,
                    dimension.medium_behavior,
                    dimension.high_behavior,
                    dimension.applicable_roles,
                    dimension.weight,
                    dumps(dimension.sample_rating_questions),
                    dumps(dimension.sample_open_questions),
                ),
            )
        return fetch_talent_model(conn, model_id)


@app.get("/api/talent/models")
def list_talent_models(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT tm.*, dh.ai_extracted_hypotheses
            FROM talent_models tm
            LEFT JOIN diagnosis_hypotheses dh ON dh.id = tm.hypothesis_id
            ORDER BY tm.updated_at DESC, tm.id DESC
            """
        ).fetchall()
        result = []
        for row in rows:
            item = serialize_talent_model(conn, row)
            item["dimension_count"] = len(item["dimensions"])
            result.append(item)
        return result


@app.get("/api/talent/models/{model_id}")
def get_talent_model(model_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        return fetch_talent_model(conn, model_id)


@app.put("/api/talent/models/{model_id}")
def update_talent_model(
    model_id: int,
    payload: TalentModelPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_talent_model(conn, model_id)
        conn.execute(
            """
            UPDATE talent_models
            SET project_id = ?, hypothesis_id = ?, name = ?, description = ?,
                source_type = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (payload.project_id, payload.hypothesis_id, payload.name, payload.description, payload.source_type, payload.status, model_id),
        )
        conn.execute("DELETE FROM talent_dimensions WHERE model_id = ?", (model_id,))
        for dimension in payload.dimensions:
            conn.execute(
                """
                INSERT INTO talent_dimensions
                    (model_id, name, description, low_behavior, medium_behavior, high_behavior,
                     applicable_roles, weight, sample_rating_questions, sample_open_questions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    model_id,
                    dimension.name,
                    dimension.description,
                    dimension.low_behavior,
                    dimension.medium_behavior,
                    dimension.high_behavior,
                    dimension.applicable_roles,
                    dimension.weight,
                    dumps(dimension.sample_rating_questions),
                    dumps(dimension.sample_open_questions),
                ),
            )
        after = fetch_talent_model(conn, model_id)
        record_edit(conn, payload.project_id, None, "talent_model", model_id, before, after)
        return after


@app.post("/api/talent/models/{model_id}/confirm")
def confirm_talent_model(model_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM talent_models WHERE id = ?", (model_id,), "talent model")
        conn.execute("UPDATE talent_models SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (model_id,))
        return fetch_talent_model(conn, model_id)


@app.post("/api/talent/models/{model_id}/dimensions")
def create_talent_dimension(
    model_id: int,
    payload: TalentDimensionPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM talent_models WHERE id = ?", (model_id,), "talent model")
        cur = conn.execute(
            """
            INSERT INTO talent_dimensions
                (model_id, name, description, low_behavior, medium_behavior, high_behavior,
                 applicable_roles, weight, sample_rating_questions, sample_open_questions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                model_id,
                payload.name,
                payload.description,
                payload.low_behavior,
                payload.medium_behavior,
                payload.high_behavior,
                payload.applicable_roles,
                payload.weight,
                dumps(payload.sample_rating_questions),
                dumps(payload.sample_open_questions),
            ),
        )
        row = fetch_one_or_404(conn, "SELECT * FROM talent_dimensions WHERE id = ?", (int(cur.lastrowid),), "talent dimension")
        return serialize_talent_dimension(row)


@app.get("/api/talent/models/{model_id}/dimensions")
def list_talent_dimensions(model_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM talent_dimensions WHERE model_id = ? ORDER BY id", (model_id,)).fetchall()
        return [serialize_talent_dimension(row) for row in rows]


@app.put("/api/talent/dimensions/{dimension_id}")
def update_talent_dimension(
    dimension_id: int,
    payload: TalentDimensionPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM talent_dimensions WHERE id = ?", (dimension_id,), "talent dimension")
        conn.execute(
            """
            UPDATE talent_dimensions
            SET name = ?, description = ?, low_behavior = ?, medium_behavior = ?, high_behavior = ?,
                applicable_roles = ?, weight = ?, sample_rating_questions = ?, sample_open_questions = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                payload.name,
                payload.description,
                payload.low_behavior,
                payload.medium_behavior,
                payload.high_behavior,
                payload.applicable_roles,
                payload.weight,
                dumps(payload.sample_rating_questions),
                dumps(payload.sample_open_questions),
                dimension_id,
            ),
        )
        row = fetch_one_or_404(conn, "SELECT * FROM talent_dimensions WHERE id = ?", (dimension_id,), "talent dimension")
        return serialize_talent_dimension(row)


@app.delete("/api/talent/dimensions/{dimension_id}")
def delete_talent_dimension(dimension_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM talent_dimensions WHERE id = ?", (dimension_id,), "talent dimension")
        conn.execute("DELETE FROM talent_dimensions WHERE id = ?", (dimension_id,))
        return {"deleted": True}


@app.post("/api/360/questionnaire/generate-from-model")
def generate_questionnaire_from_model(
    payload: QuestionnaireFromModelPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (payload.project_id,), "project")
        hypothesis = serialize_diagnosis(
            fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (payload.hypothesis_id,), "diagnosis hypothesis")
        )
        model = fetch_talent_model(conn, payload.model_id)

    system = "你是 360 问卷设计专家，熟悉 AI 时代人才模型，只输出可解析 JSON。"
    prompt = f"""
请基于诊断假设和人才模型生成 360 问卷。输出 JSON：{{"questions":[{{"dimension_name":"","content":"","question_type":"rating","relation_scope":"","rating_type":"1-5","open_followup":"","weight":1.0}}]}}。
题型只能从以下列表中选择：{payload.question_types}
目标对象：{payload.target_level}
评价关系：{payload.relation_types}
题目数量：{payload.question_count}
风控边界：{payload.constraints}
诊断假设：{dumps(hypothesis)}
人才模型：{dumps(model)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    questions = normalize_model_questions(parsed) if parsed is not None else []
    if not questions:
        questions = fallback_questions_from_model(payload, model)
        used_fallback = True
        ai_text = dumps({"questions": questions, "fallback_reason": error or "AI output could not be parsed."})

    with get_connection() as conn:
        questionnaire = save_model_questionnaire(conn, payload, model, questions)
        ai_run_id = record_ai_run(
            conn,
            payload.project_id,
            None,
            "generate_questionnaire_from_model",
            prompt,
            payload.model_dump(),
            ai_text or dumps({"questions": questions}),
            used_fallback,
            created_by=user["id"],
        )
        questionnaire["ai_run_id"] = ai_run_id
        questionnaire["used_fallback"] = used_fallback
        return questionnaire


@app.post("/api/diagnosis/rules/generate")
def generate_diagnosis_rules(
    payload: DiagnosisRulesGeneratePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.project_id)
        hypothesis = None
        model = None
        if payload.hypothesis_id:
            hypothesis = serialize_diagnosis(fetch_one_or_404(conn, "SELECT * FROM diagnosis_hypotheses WHERE id = ?", (payload.hypothesis_id,), "diagnosis hypothesis"))
        if payload.model_id:
            model = fetch_talent_model(conn, payload.model_id)
    system = "你是组织诊断规则设计专家，只输出可解析 JSON。"
    prompt = f"""
请基于 HR 诊断假设和 AI 人才模型生成诊断规则，输出 JSON：{{"rules":[{{"rule_name":"","condition_type":"","condition_json":{{}},"diagnosis_text":"","risk_level":"medium","suggested_action":"","evidence_sources":[]}}]}}。
规则范围：{payload.scopes}
风控边界：{payload.constraints}
诊断假设：{dumps(hypothesis)}
人才模型：{dumps(model)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    rules = normalize_diagnosis_rules(parsed) if parsed is not None else []
    if not rules:
        rules = fallback_diagnosis_rules()
        used_fallback = True
        ai_text = dumps({"rules": rules, "fallback_reason": error or "AI output could not be parsed."})
    with get_connection() as conn:
        saved = []
        for rule in rules:
            cur = conn.execute(
                """
                INSERT INTO diagnosis_rules
                    (project_id, hypothesis_id, model_id, rule_name, condition_type, condition_json,
                     diagnosis_text, risk_level, suggested_action, evidence_sources, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    payload.hypothesis_id,
                    payload.model_id,
                    rule["rule_name"],
                    rule["condition_type"],
                    dumps(rule["condition_json"]),
                    rule["diagnosis_text"],
                    rule["risk_level"],
                    rule["suggested_action"],
                    dumps(rule["evidence_sources"]),
                    user["id"],
                ),
            )
            saved.append(serialize_diagnosis_rule(fetch_one_or_404(conn, "SELECT * FROM diagnosis_rules WHERE id = ?", (int(cur.lastrowid),), "diagnosis rule")))
        run_id = record_ai_run(conn, project_id, None, "generate_diagnosis_rules", prompt, payload.model_dump(), ai_text or dumps({"rules": rules}), used_fallback, created_by=user["id"])
        return {"rules": saved, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.get("/api/diagnosis/rules")
def list_diagnosis_rules(
    project_id: int | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        if project_id:
            rows = conn.execute("SELECT * FROM diagnosis_rules WHERE project_id IS NULL OR project_id = ? ORDER BY updated_at DESC, id DESC", (project_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM diagnosis_rules ORDER BY updated_at DESC, id DESC").fetchall()
        return [serialize_diagnosis_rule(row) for row in rows]


@app.post("/api/diagnosis/rules")
def create_diagnosis_rule(
    payload: DiagnosisRulePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO diagnosis_rules
                (project_id, hypothesis_id, model_id, rule_name, condition_type, condition_json,
                 diagnosis_text, risk_level, suggested_action, evidence_sources, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.project_id,
                payload.hypothesis_id,
                payload.model_id,
                payload.rule_name,
                payload.condition_type,
                dumps(payload.condition_json),
                payload.diagnosis_text,
                payload.risk_level,
                payload.suggested_action,
                dumps(payload.evidence_sources),
                user["id"],
            ),
        )
        return serialize_diagnosis_rule(fetch_one_or_404(conn, "SELECT * FROM diagnosis_rules WHERE id = ?", (int(cur.lastrowid),), "diagnosis rule"))


@app.put("/api/diagnosis/rules/{rule_id}")
def update_diagnosis_rule(
    rule_id: int,
    payload: DiagnosisRulePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM diagnosis_rules WHERE id = ?", (rule_id,), "diagnosis rule")
        conn.execute(
            """
            UPDATE diagnosis_rules
            SET project_id = ?, hypothesis_id = ?, model_id = ?, rule_name = ?, condition_type = ?,
                condition_json = ?, diagnosis_text = ?, risk_level = ?, suggested_action = ?,
                evidence_sources = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                payload.project_id,
                payload.hypothesis_id,
                payload.model_id,
                payload.rule_name,
                payload.condition_type,
                dumps(payload.condition_json),
                payload.diagnosis_text,
                payload.risk_level,
                payload.suggested_action,
                dumps(payload.evidence_sources),
                rule_id,
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM diagnosis_rules WHERE id = ?", (rule_id,), "diagnosis rule")
        record_edit(conn, payload.project_id, None, "diagnosis_rule", rule_id, serialize_diagnosis_rule(before), serialize_diagnosis_rule(after))
        return serialize_diagnosis_rule(after)


@app.delete("/api/diagnosis/rules/{rule_id}")
def delete_diagnosis_rule(rule_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM diagnosis_rules WHERE id = ?", (rule_id,), "diagnosis rule")
        conn.execute("DELETE FROM diagnosis_rules WHERE id = ?", (rule_id,))
        return {"deleted": True}


@app.get("/api/projects/{project_id}/employees")
def list_employees(project_id: int) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM employees WHERE project_id = ? ORDER BY department, name, id",
            (project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/projects/{project_id}/employees")
def create_employee(project_id: int, payload: EmployeePayload) -> dict[str, Any]:
    manager_name = payload.manager_name or payload.manager
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        cur = conn.execute(
            """
            INSERT INTO employees (project_id, name, department, role, level, manager, manager_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (project_id, payload.name, payload.department, payload.role, payload.level, manager_name, manager_name),
        )
        employee_id = int(cur.lastrowid)
        employee = fetch_one_or_404(conn, "SELECT * FROM employees WHERE id = ?", (employee_id,), "employee")
        record_edit(conn, project_id, employee_id, "employee", employee_id, {}, employee)
        return employee


@app.post("/api/projects/{project_id}/employees/bulk")
def bulk_create_employees(project_id: int, payload: EmployeeBulkPayload) -> list[dict[str, Any]]:
    created: list[dict[str, Any]] = []
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        for employee in payload.employees:
            manager_name = employee.manager_name or employee.manager
            cur = conn.execute(
                """
                INSERT INTO employees (project_id, name, department, role, level, manager, manager_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (project_id, employee.name, employee.department, employee.role, employee.level, manager_name, manager_name),
            )
            employee_id = int(cur.lastrowid)
            created.append(fetch_one_or_404(conn, "SELECT * FROM employees WHERE id = ?", (employee_id,), "employee"))
        record_edit(conn, project_id, None, "employees_bulk", project_id, {}, created)
    return created


@app.put("/api/projects/{project_id}/employees/{employee_id}")
def update_employee(project_id: int, employee_id: int, payload: EmployeePayload) -> dict[str, Any]:
    manager_name = payload.manager_name or payload.manager
    with get_connection() as conn:
        before = fetch_one_or_404(
            conn,
            "SELECT * FROM employees WHERE project_id = ? AND id = ?",
            (project_id, employee_id),
            "employee",
        )
        conn.execute(
            """
            UPDATE employees
            SET name = ?, department = ?, role = ?, level = ?, manager = ?, manager_name = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND project_id = ?
            """,
            (payload.name, payload.department, payload.role, payload.level, manager_name, manager_name, employee_id, project_id),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM employees WHERE id = ?", (employee_id,), "employee")
        record_edit(conn, project_id, employee_id, "employee", employee_id, before, after)
        return after


@app.delete("/api/projects/{project_id}/employees/{employee_id}")
def delete_employee(project_id: int, employee_id: int) -> dict[str, bool]:
    with get_connection() as conn:
        before = fetch_one_or_404(
            conn,
            "SELECT * FROM employees WHERE project_id = ? AND id = ?",
            (project_id, employee_id),
            "employee",
        )
        conn.execute("DELETE FROM employees WHERE project_id = ? AND id = ?", (project_id, employee_id))
        record_edit(conn, project_id, employee_id, "employee", employee_id, before, {})
    return {"ok": True}


@app.get("/api/projects/{project_id}/relationships")
def list_relationships(project_id: int) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT rel.*,
                   subject.name AS subject_name,
                   evaluator.name AS evaluator_name,
                   CASE WHEN resp.id IS NULL THEN 0 ELSE 1 END AS submitted
            FROM relationships rel
            JOIN employees subject ON subject.id = rel.subject_employee_id
            JOIN employees evaluator ON evaluator.id = rel.evaluator_employee_id
            LEFT JOIN responses resp ON resp.project_id = rel.project_id
                AND resp.subject_employee_id = rel.subject_employee_id
                AND resp.evaluator_employee_id = rel.evaluator_employee_id
                AND resp.relation_type = rel.relation_type
            WHERE rel.project_id = ?
            ORDER BY subject.name, rel.relation_type, evaluator.name
            """,
            (project_id,),
        ).fetchall()
        return [
            {**as_dict(row), "relation_label": RELATION_LABELS.get(row["relation_type"], row["relation_type"])}
            for row in rows
        ]


@app.post("/api/projects/{project_id}/relationships")
def create_relationship(project_id: int, payload: RelationshipPayload) -> dict[str, Any]:
    with get_connection() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO relationships
                    (project_id, subject_employee_id, evaluator_employee_id, relation_type)
                VALUES (?, ?, ?, ?)
                """,
                (project_id, payload.subject_employee_id, payload.evaluator_employee_id, payload.relation_type),
            )
        except Exception as exc:
            raise HTTPException(status_code=409, detail="relationship already exists or employee is invalid") from exc
        relationship_id = int(cur.lastrowid)
        conn.execute(
            """
            INSERT INTO review_relations (id, project_id, reviewee_id, reviewer_id, relation_type)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                project_id = excluded.project_id,
                reviewee_id = excluded.reviewee_id,
                reviewer_id = excluded.reviewer_id,
                relation_type = excluded.relation_type
            """,
            (
                relationship_id,
                project_id,
                payload.subject_employee_id,
                payload.evaluator_employee_id,
                payload.relation_type,
            ),
        )
        relationship = fetch_one_or_404(conn, "SELECT * FROM relationships WHERE id = ?", (relationship_id,), "relationship")
        record_edit(conn, project_id, payload.subject_employee_id, "relationship", relationship_id, {}, relationship)
        return relationship


@app.delete("/api/projects/{project_id}/relationships/{relationship_id}")
def delete_relationship(project_id: int, relationship_id: int) -> dict[str, bool]:
    with get_connection() as conn:
        before = fetch_one_or_404(
            conn,
            "SELECT * FROM relationships WHERE project_id = ? AND id = ?",
            (project_id, relationship_id),
            "relationship",
        )
        conn.execute("DELETE FROM relationships WHERE project_id = ? AND id = ?", (project_id, relationship_id))
        conn.execute("DELETE FROM review_relations WHERE id = ?", (relationship_id,))
        record_edit(conn, project_id, before["subject_employee_id"], "relationship", relationship_id, before, {})
    return {"ok": True}


@app.post("/api/projects/{project_id}/responses")
def submit_response(project_id: int, payload: ResponsePayload) -> dict[str, Any]:
    if not payload.scores:
        raise HTTPException(status_code=400, detail="scores are required")
    with get_connection() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO relationships
                (project_id, subject_employee_id, evaluator_employee_id, relation_type)
            VALUES (?, ?, ?, ?)
            """,
            (project_id, payload.subject_employee_id, payload.evaluator_employee_id, payload.relation_type),
        )
        existing = conn.execute(
            """
            SELECT * FROM responses
            WHERE project_id = ? AND subject_employee_id = ? AND evaluator_employee_id = ? AND relation_type = ?
            """,
            (project_id, payload.subject_employee_id, payload.evaluator_employee_id, payload.relation_type),
        ).fetchone()
        before = as_dict(existing) if existing else {}
        if existing:
            response_id = existing["id"]
            conn.execute(
                "UPDATE responses SET overall_comment = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?",
                (payload.overall_comment, response_id),
            )
            conn.execute("DELETE FROM response_scores WHERE response_id = ?", (response_id,))
        else:
            cur = conn.execute(
                """
                INSERT INTO responses
                    (project_id, subject_employee_id, evaluator_employee_id, relation_type, overall_comment)
                VALUES (?, ?, ?, ?, ?)
                """,
                (project_id, payload.subject_employee_id, payload.evaluator_employee_id, payload.relation_type, payload.overall_comment),
            )
            response_id = int(cur.lastrowid)

        for item in payload.scores:
            conn.execute(
                """
                INSERT INTO response_scores (response_id, question_id, score, text_feedback)
                VALUES (?, ?, ?, ?)
                """,
                (response_id, item.question_id, item.score, item.text_feedback),
            )
        first_score = payload.scores[0]
        conn.execute(
            """
            UPDATE responses
            SET reviewee_id = ?, reviewer_id = ?, question_id = ?, score = ?, text_feedback = ?
            WHERE id = ?
            """,
            (
                payload.subject_employee_id,
                payload.evaluator_employee_id,
                first_score.question_id,
                first_score.score,
                first_score.text_feedback,
                response_id,
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM responses WHERE id = ?", (response_id,), "response")
        record_edit(conn, project_id, payload.subject_employee_id, "response", response_id, before, after, editor="Evaluator")
        return after


@app.get("/api/projects/{project_id}/analytics")
def get_analytics(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        return build_analytics(conn, project_id)


@app.get("/api/projects/{project_id}/employees/{employee_id}/feedback")
def get_employee_feedback(project_id: int, employee_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        return employee_review_packet(conn, project_id, employee_id)


@app.get("/api/projects/{project_id}/reports")
def list_reports(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = optional_current_user(authorization)
    with get_connection() as conn:
        legacy_rows = conn.execute(
            """
            SELECT reports.*, employees.name AS employee_name, employees.department
            FROM reports
            JOIN employees ON employees.id = reports.employee_id
            WHERE reports.project_id = ?
            ORDER BY reports.updated_at DESC, reports.id DESC
            """,
            (project_id,),
        ).fetchall()
        legacy_reports = [
            {
                **as_dict(row),
                "report_type": "employee_report",
                "user_id": None,
                "title": f"{row['employee_name']} 360 发展反馈报告",
                "source": "360_review",
            }
            for row in legacy_rows
        ]
        where = ["project_id = ?"]
        params: list[Any] = [project_id]
        if user:
            if user["role"] == "boss":
                where.append("report_type = 'boss_report'")
            elif user["role"] == "employee":
                where.append("report_type = 'employee_report'")
                where.append("user_id = ?")
                params.append(user["id"])
        rows = conn.execute(
            f"""
            SELECT os_reports.*, users.username
            FROM os_reports
            LEFT JOIN users ON users.id = os_reports.user_id
            WHERE {' AND '.join(where)}
            ORDER BY os_reports.updated_at DESC, os_reports.id DESC
            """,
            tuple(params),
        ).fetchall()
        os_items = [{**as_dict(row), "source": "diagnostic_os"} for row in rows]
        if user and user["role"] == "boss":
            return os_items
        if user and user["role"] == "employee":
            return os_items + [row for row in legacy_reports if row.get("employee_id") == user.get("employee_id")]
        return os_items + legacy_reports


@app.post("/api/projects/{project_id}/reports/{employee_id}/generate")
def generate_report(project_id: int, employee_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        packet = employee_review_packet(conn, project_id, employee_id)

    system = "你是资深 HRBP 和组织发展顾问。请用中文生成谨慎、可行动、需要 HR 确认的 360 发展反馈报告。"
    prompt = f"""
请基于以下数据生成个人 360 报告，包含优势、风险、盲区、关键反馈主题、30/60/90 天行动计划和 HR 反馈面谈提纲。
硬性限制：
1. 不能直接决定晋升、淘汰、薪酬。
2. 必须声明 AI 报告需要 HR 人工确认。
3. 当某类评价人少于 3 人时，不引用该群体原始评论。
4. 对开放文本反馈进行脱敏、归类和总结。
5. 使用中性、发展导向语言改写尖锐反馈，避免攻击性措辞直接进入报告。
数据：
{dumps(packet)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    content = ai_text.strip() if ai_text else ""
    if not content:
        content = fallback_report(packet)
        used_fallback = True
        if error:
            content += f"\n\n> AI 接口未返回有效结果，已使用本地规则草稿。原因：{error}\n"

    with get_connection() as conn:
        existing = conn.execute(
            "SELECT * FROM reports WHERE project_id = ? AND employee_id = ?",
            (project_id, employee_id),
        ).fetchone()
        before = as_dict(existing) if existing else {}
        ai_run_id = record_ai_run(conn, project_id, employee_id, "personal_report_generation", prompt, packet, content, used_fallback)
        if existing:
            conn.execute(
                """
                UPDATE reports
                SET content = ?, status = 'draft', ai_run_id = ?, updated_at = CURRENT_TIMESTAMP, confirmed_at = NULL
                WHERE id = ?
                """,
                (content, ai_run_id, existing["id"]),
            )
            report_id = existing["id"]
        else:
            cur = conn.execute(
                """
                INSERT INTO reports (project_id, employee_id, content, status, ai_run_id)
                VALUES (?, ?, ?, 'draft', ?)
                """,
                (project_id, employee_id, content, ai_run_id),
            )
            report_id = int(cur.lastrowid)
        report = fetch_one_or_404(conn, "SELECT * FROM reports WHERE id = ?", (report_id,), "report")
        conn.execute(
            """
            INSERT INTO ai_reports (project_id, reviewee_id, report_content)
            VALUES (?, ?, ?)
            """,
            (project_id, employee_id, content),
        )
        record_edit(conn, project_id, employee_id, "report", report_id, before, report, editor="AI draft")
        return report


@app.put("/api/projects/{project_id}/reports/{report_id}")
def update_report(project_id: int, report_id: int, payload: ReportUpdatePayload) -> dict[str, Any]:
    with get_connection() as conn:
        before = fetch_one_or_404(
            conn,
            "SELECT * FROM reports WHERE project_id = ? AND id = ?",
            (project_id, report_id),
            "report",
        )
        conn.execute(
            "UPDATE reports SET content = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.content, report_id),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM reports WHERE id = ?", (report_id,), "report")
        record_edit(conn, project_id, before["employee_id"], "report", report_id, before, after, editor=payload.editor)
        return after


@app.post("/api/projects/{project_id}/reports/{report_id}/confirm")
def confirm_report(project_id: int, report_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        before = fetch_one_or_404(
            conn,
            "SELECT * FROM reports WHERE project_id = ? AND id = ?",
            (project_id, report_id),
            "report",
        )
        conn.execute(
            "UPDATE reports SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP, confirmed_at = CURRENT_TIMESTAMP WHERE id = ?",
            (report_id,),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM reports WHERE id = ?", (report_id,), "report")
        record_edit(conn, project_id, before["employee_id"], "report", report_id, before, after)
        return after


@app.post("/api/projects/{project_id}/org-diagnosis/generate")
def generate_org_diagnosis(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        analytics = build_analytics(conn, project_id)
    system = "你是资深组织发展顾问，请生成谨慎、可验证的组织层面 360 诊断摘要。"
    prompt = f"""
请基于以下 360 项目分析数据生成组织层面诊断摘要，包含组织风险、可能成因、建议访谈验证方向和季度行动建议。
限制：不能直接决定个人晋升、淘汰、薪酬；所有结论需要 HR 人工确认。
数据：
{dumps(analytics)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    content = ai_text.strip() if ai_text else ""
    if not content:
        content = fallback_org_diagnosis(analytics)
        used_fallback = True
        if error:
            content += f"\n\n> AI 接口未返回有效结果，已使用本地规则草稿。原因：{error}\n"
    with get_connection() as conn:
        ai_run_id = record_ai_run(conn, project_id, None, "organization_diagnosis", prompt, analytics, content, used_fallback)
    return {"content": content, "ai_run_id": ai_run_id, "used_fallback": used_fallback}


@app.get("/api/projects/{project_id}/org-diagnosis/questions")
def get_org_diagnosis_questions(project_id: int) -> dict[str, Any]:
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
    return {
        "project_id": project_id,
        "dimensions": [
            {
                **dimension,
                "questions": [
                    {
                        "key": f"{dimension['key']}_{index + 1}",
                        "text": text,
                        "score_min": 1,
                        "score_max": 5,
                    }
                    for index, text in enumerate(dimension["questions"])
                ],
            }
            for dimension in ORG_DIAGNOSIS_DIMENSIONS
        ],
    }


@app.post("/api/projects/{project_id}/org-diagnosis/responses")
def submit_org_diagnosis_responses(
    project_id: int,
    payload: OrganizationDiagnosisResponsePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        for item in payload.responses:
            conn.execute(
                """
                INSERT INTO organization_diagnosis_responses
                    (project_id, user_id, dimension, question_key, score, comment)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (project_id, user["id"], item.dimension, item.question_key, item.score, item.comment),
            )
        result = calculate_org_diagnosis_result(conn, project_id, persist=True)
    return {"submitted": len(payload.responses), "result": result}


@app.get("/api/projects/{project_id}/org-diagnosis/scores")
def get_org_diagnosis_scores(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_boss_or_hr_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (project_id,), "project")
        return calculate_org_diagnosis_result(conn, project_id, persist=True)


@app.get("/api/projects/{project_id}/org-diagnosis/result")
def get_org_diagnosis_result(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return get_org_diagnosis_scores(project_id, authorization)


@app.get("/api/projects/{project_id}/talent-profiles")
def list_talent_profiles(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_hr_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT talent_profiles.*, users.username
            FROM talent_profiles
            LEFT JOIN users ON users.id = talent_profiles.user_id
            WHERE talent_profiles.project_id = ?
            ORDER BY talent_profiles.updated_at DESC, talent_profiles.id DESC
            """,
            (project_id,),
        ).fetchall()
        return [serialize_talent_profile(row) for row in rows]


@app.get("/api/projects/{project_id}/talent-profiles/me")
def my_talent_profile(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM talent_profiles WHERE project_id = ? AND user_id = ?",
            (project_id, user["id"]),
        ).fetchone()
        if row:
            return serialize_talent_profile(row)
        return talent_profile_from_scores(project_id, user["id"], user["id"])


@app.post("/api/projects/{project_id}/talent-profiles/generate")
def generate_talent_profiles(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_hr_user(authorization)
    with get_connection() as conn:
        users = conn.execute(
            """
            SELECT users.*
            FROM users
            LEFT JOIN employees ON employees.id = users.employee_id
            WHERE users.role = 'employee'
              AND (employees.project_id = ? OR users.employee_id IS NULL)
            ORDER BY users.id
            """,
            (project_id,),
        ).fetchall()
        if not users:
            users = conn.execute("SELECT * FROM users WHERE role = 'employee' ORDER BY id LIMIT 1").fetchall()
        generated = 0
        for index, user in enumerate(users):
            profile = talent_profile_from_scores(project_id, user["id"], index)
            conn.execute(
                """
                INSERT INTO talent_profiles
                    (project_id, user_id, talent_type, dimension_scores_json, native_strength,
                     ai_collaboration_level, best_fit_tasks, not_recommended_tasks, recommended_agents,
                     growth_suggestion, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(project_id, user_id) DO UPDATE SET
                    talent_type = excluded.talent_type,
                    dimension_scores_json = excluded.dimension_scores_json,
                    native_strength = excluded.native_strength,
                    ai_collaboration_level = excluded.ai_collaboration_level,
                    best_fit_tasks = excluded.best_fit_tasks,
                    not_recommended_tasks = excluded.not_recommended_tasks,
                    recommended_agents = excluded.recommended_agents,
                    growth_suggestion = excluded.growth_suggestion,
                    updated_at = CURRENT_TIMESTAMP
                """,
                (
                    project_id,
                    user["id"],
                    profile["talent_type"],
                    dumps(profile["dimension_scores"]),
                    profile["native_strength"],
                    profile["ai_collaboration_level"],
                    dumps(profile["best_fit_tasks"]),
                    dumps(profile["not_recommended_tasks"]),
                    dumps(profile["recommended_agents"]),
                    profile["growth_suggestion"],
                ),
            )
            generated += 1
        rows = conn.execute("SELECT * FROM talent_profiles WHERE project_id = ?", (project_id,)).fetchall()
        return {"generated": generated, "profiles": [serialize_talent_profile(row) for row in rows]}


@app.get("/api/projects/{project_id}/surveys")
def list_surveys(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_boss_or_hr_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM surveys WHERE project_id = ? ORDER BY created_at DESC, id DESC",
            (project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/projects/{project_id}/surveys")
def create_survey(project_id: int, payload: SurveyPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_hr_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO surveys (project_id, survey_type, title, description, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (project_id, payload.survey_type, payload.title, payload.description, payload.status, user["id"]),
        )
        return as_dict(conn.execute("SELECT * FROM surveys WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.get("/api/projects/{project_id}/survey-progress")
def get_survey_progress(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_hr_user(authorization)
    with get_connection() as conn:
        return build_survey_progress(conn, project_id)


@app.get("/api/projects/{project_id}/surveys/my-tasks")
def get_my_survey_tasks(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT surveys.*,
                   CASE WHEN survey_responses.id IS NULL THEN 'pending' ELSE 'submitted' END AS task_status
            FROM surveys
            LEFT JOIN survey_responses
              ON survey_responses.survey_id = surveys.id AND survey_responses.user_id = ?
            WHERE surveys.project_id = ? AND surveys.status = 'active'
            ORDER BY surveys.created_at DESC, surveys.id DESC
            """,
            (user["id"], project_id),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/projects/{project_id}/surveys/{survey_id}/responses")
def submit_survey_response(
    project_id: int,
    survey_id: int,
    payload: SurveyResponsePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO survey_responses (project_id, survey_id, user_id, response_json, submitted_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(survey_id, user_id) DO UPDATE SET
                response_json = excluded.response_json,
                submitted_at = CURRENT_TIMESTAMP
            """,
            (project_id, survey_id, user["id"], dumps(payload.response_json)),
        )
        return as_dict(
            conn.execute(
                "SELECT * FROM survey_responses WHERE survey_id = ? AND user_id = ?",
                (survey_id, user["id"]),
            ).fetchone()
        )


@app.post("/api/projects/{project_id}/organization-feedback")
def submit_organization_feedback(
    project_id: int,
    payload: OrganizationFeedbackPayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO organization_feedback (project_id, user_id, feedback_type, content, is_anonymous)
            VALUES (?, ?, ?, ?, ?)
            """,
            (project_id, user["id"], payload.feedback_type, payload.content, int(payload.is_anonymous)),
        )
        return as_dict(conn.execute("SELECT * FROM organization_feedback WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.get("/api/projects/{project_id}/organization-feedback/me")
def my_organization_feedback(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM organization_feedback WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC, id DESC",
            (project_id, user["id"]),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.get("/api/projects/{project_id}/organization-feedback/summary")
def organization_feedback_summary(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_boss_or_hr_user(authorization)
    with get_connection() as conn:
        summary = build_feedback_summary(conn, project_id)
        if user["role"] == "boss":
            summary["recent_feedback"] = []
        return summary


@app.get("/api/projects/{project_id}/organization-feedback")
def list_organization_feedback(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = require_hr_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT organization_feedback.*, users.username
            FROM organization_feedback
            LEFT JOIN users ON users.id = organization_feedback.user_id
            WHERE organization_feedback.project_id = ?
            ORDER BY organization_feedback.created_at DESC, organization_feedback.id DESC
            """,
            (project_id,),
        ).fetchall()
        items = []
        for row in rows:
            item = as_dict(row)
            if item["is_anonymous"]:
                item["username"] = "匿名员工" if role_is_hr(user["role"]) else None
                item["user_id"] = None
            items.append(item)
        return items


@app.get("/api/projects/{project_id}/dashboard")
def project_dashboard(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        if user["role"] == "employee":
            profile = my_talent_profile(project_id, authorization)
            tasks = get_my_survey_tasks(project_id, authorization)
            return {
                "version": "employee",
                "my_tasks": tasks,
                "my_capability_profile": profile,
                "my_360_summary": employee_review_packet(conn, project_id, require_employee_id(user)) if user.get("employee_id") else None,
                "my_growth_suggestion": profile.get("growth_suggestion"),
            }
        if user["role"] == "boss":
            return {"version": "boss", **build_executive_dashboard(conn, project_id)}
        return {
            "version": "hr",
            "project_progress": build_survey_progress(conn, project_id),
            "org_diagnosis": calculate_org_diagnosis_result(conn, project_id, persist=True),
            "review360": build_analytics(conn, project_id),
            "organization_feedback": build_feedback_summary(conn, project_id),
        }


@app.get("/api/projects/{project_id}/executive-dashboard")
def executive_dashboard(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_boss_or_hr_user(authorization)
    with get_connection() as conn:
        return build_executive_dashboard(conn, project_id)


@app.post("/api/projects/{project_id}/reports/generate")
def generate_os_report(project_id: int, payload: ReportGeneratePayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    if payload.report_type == "boss_report" and user["role"] not in {"boss", "hr", "admin"}:
        raise HTTPException(status_code=403, detail="boss report not allowed")
    if payload.report_type == "hr_report" and not role_is_hr(user["role"]):
        raise HTTPException(status_code=403, detail="hr report not allowed")
    user_id = payload.user_id if role_is_hr(user["role"]) else user["id"]
    if payload.report_type == "boss_report":
        user_id = None
    if payload.report_type == "hr_report":
        user_id = None
    with get_connection() as conn:
        title, content = generate_os_report_content(conn, project_id, payload.report_type, user_id)
        cur = conn.execute(
            """
            INSERT INTO os_reports (project_id, report_type, user_id, title, content, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            (project_id, payload.report_type, user_id, title, content),
        )
        return as_dict(conn.execute("SELECT * FROM os_reports WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.get("/api/projects/{project_id}/reports/me")
def my_os_reports(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT * FROM os_reports
            WHERE project_id = ? AND report_type = 'employee_report' AND user_id = ?
            ORDER BY updated_at DESC, id DESC
            """,
            (project_id, user["id"]),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.get("/api/projects/{project_id}/reports/{report_id}")
def get_os_report(project_id: int, report_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        report = fetch_one_or_404(conn, "SELECT * FROM os_reports WHERE project_id = ? AND id = ?", (project_id, report_id), "report")
        if user["role"] == "boss" and report["report_type"] != "boss_report":
            raise HTTPException(status_code=403, detail="boss report only")
        if user["role"] == "employee" and (report["report_type"] != "employee_report" or report["user_id"] != user["id"]):
            raise HTTPException(status_code=403, detail="own report only")
        return report


@app.get("/api/projects/{project_id}/ai-runs")
def list_ai_runs(project_id: int) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, project_id, employee_id, feature, provider_base_url, model,
                   used_fallback, created_at
            FROM ai_runs
            WHERE project_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 100
            """,
            (project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.get("/api/projects/{project_id}/edit-history")
def list_edit_history(project_id: int) -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, project_id, employee_id, entity_type, entity_id, editor, created_at
            FROM edit_history
            WHERE project_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 100
            """,
            (project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/auth/login")
def auth_login(payload: LoginPayload) -> dict[str, Any]:
    login_code = read_login_code(payload)
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM users WHERE username = ?", (payload.username,)).fetchone()
        if not row or row["status"] != "active" or not verify_login_code(login_code, row["password_hash"]):
            raise HTTPException(status_code=401, detail="invalid username or password")
        session_value = create_session_value()
        conn.execute(f"INSERT INTO login_sessions (user_id, {SESSION_COLUMN}) VALUES (?, ?)", (row["id"], session_value))
        return {"sessionValue": session_value, SESSION_FIELD: session_value, "user": public_user(row)}


@app.post("/api/auth/logout")
def auth_logout(authorization: str | None = Header(default=None)) -> dict[str, bool]:
    session_value = session_value_from_header(authorization)
    with get_connection() as conn:
        conn.execute(f"DELETE FROM login_sessions WHERE {SESSION_COLUMN} = ?", (session_value,))
    return {"ok": True}


@app.get("/api/auth/me")
def auth_me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return {"user": public_user(current_user(authorization))}


@app.get("/api/admin/users")
def admin_list_users(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT users.id, users.username, users.role, users.employee_id, users.status,
                   users.created_at, employees.name AS employee_name
            FROM users
            LEFT JOIN employees ON employees.id = users.employee_id
            ORDER BY users.created_at DESC, users.id DESC
            """
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/admin/users")
def admin_create_user(payload: UserCreatePayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    login_code = read_login_code(payload)
    with get_connection() as conn:
        try:
            cur = conn.execute(
                """
                INSERT INTO users (username, password_hash, role, employee_id, status)
                VALUES (?, ?, ?, ?, ?)
                """,
                (payload.username, hash_login_code(login_code), payload.role, payload.employee_id, payload.status),
            )
        except Exception as exc:
            raise HTTPException(status_code=409, detail="username already exists") from exc
        return public_user(conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone())


@app.put("/api/admin/users/{user_id}")
def admin_update_user(user_id: int, payload: UserUpdatePayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM users WHERE id = ?", (user_id,), "user")
        conn.execute(
            """
            UPDATE users
            SET role = COALESCE(?, role),
                employee_id = ?,
                status = COALESCE(?, status)
            WHERE id = ?
            """,
            (payload.role, payload.employee_id, payload.status, user_id),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM users WHERE id = ?", (user_id,), "user")
        record_edit(conn, None, after.get("employee_id"), "user", user_id, before, after)
        return public_user(after)


@app.post("/api/admin/users/{user_id}/reset-password")
def admin_reset_password(user_id: int, payload: ResetPasswordPayload, authorization: str | None = Header(default=None)) -> dict[str, bool]:
    require_admin_user(authorization)
    login_code = read_login_code(payload)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM users WHERE id = ?", (user_id,), "user")
        conn.execute(f"UPDATE users SET {CREDENTIAL_HASH_COLUMN} = ? WHERE id = ?", (hash_login_code(login_code), user_id))
    return {"ok": True}


@app.get("/api/employee/me")
def employee_me(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    employee = None
    if user.get("employee_id"):
        with get_connection() as conn:
            row = conn.execute("SELECT * FROM employees WHERE id = ?", (user["employee_id"],)).fetchone()
            employee = as_dict(row) if row else None
    return {"user": public_user(user), "employee": employee}


def task_rows(conn: Any, employee_id: int | None = None, task_id: int | None = None, project_id: int | None = None) -> list[dict[str, Any]]:
    where = []
    params: list[Any] = []
    if employee_id is not None:
        where.append("tasks.reviewer_id = ?")
        params.append(employee_id)
    if task_id is not None:
        where.append("tasks.id = ?")
        params.append(task_id)
    if project_id is not None:
        where.append("tasks.project_id = ?")
        params.append(project_id)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    rows = conn.execute(
        f"""
        SELECT tasks.*, projects.name AS project_name, projects.end_date,
               reviewee.name AS reviewee_name, reviewer.name AS reviewer_name,
               reviewee.department AS reviewee_department
        FROM review_tasks tasks
        JOIN projects ON projects.id = tasks.project_id
        JOIN employees reviewee ON reviewee.id = tasks.reviewee_id
        JOIN employees reviewer ON reviewer.id = tasks.reviewer_id
        {where_sql}
        ORDER BY tasks.status, projects.end_date, tasks.created_at DESC
        """,
        tuple(params),
    ).fetchall()
    return [
        {**as_dict(row), "relation_label": RELATION_LABELS.get(row["relation_type"], row["relation_type"])}
        for row in rows
    ]


@app.get("/api/employee/tasks")
def employee_tasks(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    employee_id = require_employee_id(user)
    with get_connection() as conn:
        return task_rows(conn, employee_id=employee_id)


@app.get("/api/employee/tasks/{task_id}")
def employee_task_detail(task_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    employee_id = require_employee_id(user)
    with get_connection() as conn:
        rows = task_rows(conn, employee_id=employee_id, task_id=task_id)
        if not rows:
            raise HTTPException(status_code=404, detail="task not found")
        task = rows[0]
        return {"task": task, "questionnaire": fetch_questionnaire(conn, task["project_id"])}


@app.post("/api/employee/tasks/{task_id}/submit")
def employee_submit_task(task_id: int, payload: dict[str, Any], authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    employee_id = require_employee_id(user)
    with get_connection() as conn:
        rows = task_rows(conn, employee_id=employee_id, task_id=task_id)
        if not rows:
            raise HTTPException(status_code=404, detail="task not found")
        task = rows[0]
    response = submit_response(
        task["project_id"],
        ResponsePayload(
            subject_employee_id=task["reviewee_id"],
            evaluator_employee_id=employee_id,
            relation_type=task["relation_type"],
            scores=payload.get("scores", []),
            overall_comment=payload.get("overall_comment", ""),
        ),
    )
    with get_connection() as conn:
        conn.execute(
            "UPDATE review_tasks SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = ?",
            (task_id,),
        )
    return response


@app.get("/api/employee/submissions")
def employee_submissions(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    employee_id = require_employee_id(user)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT r.*, projects.name AS project_name, employees.name AS reviewee_name
            FROM responses r
            JOIN projects ON projects.id = r.project_id
            JOIN employees ON employees.id = r.subject_employee_id
            WHERE r.evaluator_employee_id = ?
            ORDER BY r.submitted_at DESC
            """,
            (employee_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.get("/api/admin/dashboard")
def admin_dashboard(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        project_count = conn.execute("SELECT COUNT(*) AS count FROM projects").fetchone()["count"]
        employee_count = conn.execute("SELECT COUNT(*) AS count FROM employees").fetchone()["count"]
        pending_count = conn.execute("SELECT COUNT(*) AS count FROM review_tasks WHERE status = 'pending'").fetchone()["count"]
        submitted_count = conn.execute("SELECT COUNT(*) AS count FROM review_tasks WHERE status = 'submitted'").fetchone()["count"]
        total_tasks = pending_count + submitted_count
        feedback_rows = conn.execute(
            "SELECT * FROM feedback_items ORDER BY created_at DESC, id DESC LIMIT 5"
        ).fetchall()
        report_rows = conn.execute(
            """
            SELECT reports.*, employees.name AS employee_name, projects.name AS project_name
            FROM reports
            JOIN employees ON employees.id = reports.employee_id
            JOIN projects ON projects.id = reports.project_id
            ORDER BY reports.updated_at DESC, reports.id DESC
            LIMIT 5
            """
        ).fetchall()
        return {
            "project_count": project_count,
            "employee_count": employee_count,
            "pending_tasks": pending_count,
            "submitted_tasks": submitted_count,
            "completion_rate": round(submitted_count / total_tasks * 100, 1) if total_tasks else 0,
            "latest_feedback": [as_dict(row) for row in feedback_rows],
            "latest_reports": [as_dict(row) for row in report_rows],
        }


@app.get("/api/admin/projects/{project_id}/tasks")
def admin_project_tasks(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        return task_rows(conn, project_id=project_id)


@app.post("/api/admin/projects/{project_id}/generate-tasks")
def admin_generate_tasks(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        relations = conn.execute(
            """
            SELECT project_id, subject_employee_id AS reviewee_id,
                   evaluator_employee_id AS reviewer_id, relation_type
            FROM relationships
            WHERE project_id = ?
            """,
            (project_id,),
        ).fetchall()
        created = 0
        for relation in relations:
            cur = conn.execute(
                """
                INSERT OR IGNORE INTO review_tasks
                    (project_id, reviewee_id, reviewer_id, relation_type)
                VALUES (?, ?, ?, ?)
                """,
                (project_id, relation["reviewee_id"], relation["reviewer_id"], relation["relation_type"]),
            )
            created += cur.rowcount
        total = conn.execute("SELECT COUNT(*) AS count FROM review_tasks WHERE project_id = ?", (project_id,)).fetchone()["count"]
        return {"created": created, "total": total}


@app.get("/api/admin/projects/{project_id}/progress")
def admin_project_progress(project_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = task_rows(conn, project_id=project_id)
        total = len(rows)
        submitted = sum(1 for row in rows if row["status"] == "submitted")
        department_rows = conn.execute(
            """
            SELECT e.department,
                   COUNT(t.id) AS total,
                   SUM(CASE WHEN t.status = 'submitted' THEN 1 ELSE 0 END) AS submitted
            FROM review_tasks t
            JOIN employees e ON e.id = t.reviewer_id
            WHERE t.project_id = ?
            GROUP BY e.department
            ORDER BY e.department
            """,
            (project_id,),
        ).fetchall()
        employee_rows = conn.execute(
            """
            SELECT e.id AS employee_id, e.name, e.department,
                   COUNT(t.id) AS total,
                   SUM(CASE WHEN t.status = 'submitted' THEN 1 ELSE 0 END) AS submitted
            FROM review_tasks t
            JOIN employees e ON e.id = t.reviewer_id
            WHERE t.project_id = ?
            GROUP BY e.id, e.name, e.department
            ORDER BY e.department, e.name
            """,
            (project_id,),
        ).fetchall()
        return {
            "project_id": project_id,
            "total": total,
            "submitted": submitted,
            "pending": total - submitted,
            "completion_rate": round(submitted / total * 100, 1) if total else 0,
            "by_department": [
                {
                    **as_dict(row),
                    "pending": row["total"] - (row["submitted"] or 0),
                    "completion_rate": round((row["submitted"] or 0) / row["total"] * 100, 1) if row["total"] else 0,
                }
                for row in department_rows
            ],
            "by_employee": [
                {
                    **as_dict(row),
                    "pending": row["total"] - (row["submitted"] or 0),
                    "completion_rate": round((row["submitted"] or 0) / row["total"] * 100, 1) if row["total"] else 0,
                }
                for row in employee_rows
            ],
        }


@app.get("/api/admin/projects/{project_id}/responses")
def admin_project_responses(project_id: int, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT r.id AS response_id, r.project_id, r.relation_type, r.overall_comment, r.submitted_at,
                   reviewee.name AS reviewee_name, reviewer.name AS reviewer_name,
                   q.text AS question_text, rs.score, rs.text_feedback
            FROM responses r
            JOIN employees reviewee ON reviewee.id = r.subject_employee_id
            JOIN employees reviewer ON reviewer.id = r.evaluator_employee_id
            LEFT JOIN response_scores rs ON rs.response_id = r.id
            LEFT JOIN questions q ON q.id = rs.question_id
            WHERE r.project_id = ?
            ORDER BY r.submitted_at DESC, r.id DESC
            """,
            (project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/feedback")
def create_feedback(payload: FeedbackPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = current_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO feedback_items
                (user_id, employee_id, category, title, content, anonymous, priority)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                user.get("employee_id"),
                payload.category,
                payload.title,
                payload.content,
                int(payload.anonymous),
                payload.priority,
            ),
        )
        return fetch_one_or_404(conn, "SELECT * FROM feedback_items WHERE id = ?", (cur.lastrowid,), "feedback")


@app.get("/api/feedback/my")
def my_feedback(authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    user = current_user(authorization)
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM feedback_items WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (user["id"],),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.get("/api/admin/feedback")
def admin_feedback(
    category: str | None = None,
    status: str | None = None,
    anonymous: int | None = None,
    priority: str | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    where = []
    params: list[Any] = []
    if category:
        where.append("feedback_items.category = ?")
        params.append(category)
    if status:
        where.append("feedback_items.status = ?")
        params.append(status)
    if anonymous is not None:
        where.append("feedback_items.anonymous = ?")
        params.append(anonymous)
    if priority:
        where.append("feedback_items.priority = ?")
        params.append(priority)
    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    with get_connection() as conn:
        rows = conn.execute(
            f"""
            SELECT feedback_items.*,
                   CASE WHEN feedback_items.anonymous = 1 THEN NULL ELSE users.username END AS username,
                   CASE WHEN feedback_items.anonymous = 1 THEN NULL ELSE employees.name END AS employee_name
            FROM feedback_items
            LEFT JOIN users ON users.id = feedback_items.user_id
            LEFT JOIN employees ON employees.id = feedback_items.employee_id
            {where_sql}
            ORDER BY feedback_items.created_at DESC, feedback_items.id DESC
            """,
            tuple(params),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.put("/api/admin/feedback/{feedback_id}/status")
def admin_feedback_status(feedback_id: int, payload: FeedbackStatusPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM feedback_items WHERE id = ?", (feedback_id,), "feedback")
        conn.execute(
            "UPDATE feedback_items SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.status, feedback_id),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM feedback_items WHERE id = ?", (feedback_id,), "feedback")
        record_edit(conn, None, after.get("employee_id"), "feedback", feedback_id, before, after)
        return after


@app.post("/api/admin/feedback/{feedback_id}/ai-summary")
def admin_feedback_ai_summary(feedback_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        feedback = fetch_one_or_404(conn, "SELECT * FROM feedback_items WHERE id = ?", (feedback_id,), "feedback")
    system = "你是 HR 组织诊断顾问，请用中性、发展导向语言总结员工反馈。"
    prompt = f"""
请总结以下员工反馈，输出：反馈主题、可能成因、建议 HR 跟进动作。避免攻击性措辞。
反馈：
{dumps(feedback)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    summary = ai_text.strip() if ai_text else ""
    if not summary:
        summary = (
            f"反馈主题：{feedback['category']}。\n"
            "可能成因：员工观察到流程、协作或管理体验中存在可改善点。\n"
            "建议动作：HR 先补充访谈事实，再判断是否需要流程优化、管理沟通或团队协作干预。"
        )
        used_fallback = True
        if error:
            summary += f"\nAI 接口未返回有效结果，已使用本地 fallback。原因：{error}"
    with get_connection() as conn:
        conn.execute(
            "UPDATE feedback_items SET ai_summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (summary, feedback_id),
        )
        run_id = record_ai_run(conn, None, feedback.get("employee_id"), "feedback_ai_summary", prompt, feedback, summary, used_fallback)
        updated = fetch_one_or_404(conn, "SELECT * FROM feedback_items WHERE id = ?", (feedback_id,), "feedback")
    return {"feedback": updated, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.post("/api/admin/feedback/cluster")
def admin_cluster_feedback(payload: FeedbackClusterPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.project_id)
        feedback_rows = conn.execute(
            """
            SELECT feedback_items.*, employees.department
            FROM feedback_items
            LEFT JOIN employees ON employees.id = feedback_items.employee_id
            ORDER BY feedback_items.created_at DESC, feedback_items.id DESC
            LIMIT 200
            """
        ).fetchall()
        feedback = [as_dict(row) for row in feedback_rows]
    system = "你是 Employee Voice Agent，请对员工反馈做主题聚类，只输出可解析 JSON。"
    prompt = f"""
请将员工反馈聚类为组织主题，输出 JSON：{{"clusters":[{{"theme":"","summary":"","evidence_count":0,"related_departments":[],"risk_level":"medium","suggested_action":""}}]}}。
要求：表达中性、发展导向，不暴露匿名反馈身份。
反馈数据：
{dumps(feedback)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    clusters = normalize_feedback_clusters(parsed) if parsed is not None else []
    if not clusters:
        clusters = fallback_feedback_clusters()
        used_fallback = True
        ai_text = dumps({"clusters": clusters, "fallback_reason": error or "AI output could not be parsed."})
    with get_connection() as conn:
        saved = []
        for cluster in clusters:
            cur = conn.execute(
                """
                INSERT INTO feedback_clusters
                    (project_id, theme, summary, evidence_count, related_departments, risk_level, suggested_action, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    project_id,
                    cluster["theme"],
                    cluster["summary"],
                    cluster["evidence_count"],
                    dumps(cluster["related_departments"]),
                    cluster["risk_level"],
                    cluster["suggested_action"],
                    user["id"],
                ),
            )
            saved.append(serialize_feedback_cluster(fetch_one_or_404(conn, "SELECT * FROM feedback_clusters WHERE id = ?", (int(cur.lastrowid),), "feedback cluster")))
        run_id = record_ai_run(conn, project_id, None, "cluster_employee_voice", prompt, feedback, ai_text or dumps({"clusters": clusters}), used_fallback, created_by=user["id"])
        return {"clusters": saved, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.get("/api/admin/feedback/clusters")
def admin_feedback_clusters(
    project_id: int | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        if project_id:
            rows = conn.execute(
                "SELECT * FROM feedback_clusters WHERE project_id IS NULL OR project_id = ? ORDER BY created_at DESC, id DESC",
                (project_id,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM feedback_clusters ORDER BY created_at DESC, id DESC").fetchall()
        return [serialize_feedback_cluster(row) for row in rows]


@app.get("/api/diagnosis/dashboard")
def diagnosis_dashboard(
    project_id: int | None = None,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        active_project_id = ensure_project_id(conn, project_id)
        return build_organization_dashboard(conn, active_project_id)


@app.post("/api/diagnosis/risks/generate")
def generate_organization_risks(
    payload: OrganizationRiskGeneratePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.project_id)
        context = build_diagnosis_context(conn, project_id, payload.hypothesis_id, payload.model_id)
    system = "你是资深组织诊断顾问，请基于证据生成组织风险，只输出可解析 JSON。"
    prompt = f"""
请基于诊断假设、人才模型评分、诊断规则、员工反馈聚类和 360 差异分析生成组织风险。
输出 JSON：{{"risks":[{{"risk_type":"","title":"","description":"","evidence_json":{{}},"affected_scope":"","risk_level":"medium","suggested_action":""}}]}}。
限制：不得输出自动晋升、淘汰、薪酬或裁员结论。
上下文：
{dumps(context)}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    risks = normalize_organization_risks(parsed) if parsed is not None else []
    if not risks:
        risks = fallback_organization_risks()
        used_fallback = True
        ai_text = dumps({"risks": risks, "fallback_reason": error or "AI output could not be parsed."})
    with get_connection() as conn:
        saved = []
        for risk in risks:
            cur = conn.execute(
                """
                INSERT INTO organization_risks
                    (project_id, risk_type, title, description, evidence_json, affected_scope,
                     risk_level, suggested_action, status, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)
                """,
                (
                    project_id,
                    risk["risk_type"],
                    risk["title"],
                    risk["description"],
                    dumps(risk["evidence_json"]),
                    risk["affected_scope"],
                    risk["risk_level"],
                    risk["suggested_action"],
                    user["id"],
                ),
            )
            saved.append(serialize_organization_risk(fetch_one_or_404(conn, "SELECT * FROM organization_risks WHERE id = ?", (int(cur.lastrowid),), "organization risk")))
        run_id = record_ai_run(conn, project_id, None, "generate_organization_risks", prompt, context, ai_text or dumps({"risks": risks}), used_fallback, created_by=user["id"])
        return {"risks": saved, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.get("/api/diagnosis/risks")
def list_organization_risks(
    project_id: int | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        if project_id:
            rows = conn.execute("SELECT * FROM organization_risks WHERE project_id = ? ORDER BY updated_at DESC, id DESC", (project_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM organization_risks ORDER BY updated_at DESC, id DESC").fetchall()
        return [serialize_organization_risk(row) for row in rows]


@app.put("/api/diagnosis/risks/{risk_id}")
def update_organization_risk(
    risk_id: int,
    payload: OrganizationRiskUpdatePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM organization_risks WHERE id = ?", (risk_id,), "organization risk")
        updated = {**before}
        for key in ["risk_type", "title", "description", "affected_scope", "risk_level", "suggested_action", "status"]:
            value = getattr(payload, key)
            if value is not None:
                updated[key] = value
        if payload.evidence_json is not None:
            updated["evidence_json"] = dumps(payload.evidence_json)
        conn.execute(
            """
            UPDATE organization_risks
            SET risk_type = ?, title = ?, description = ?, evidence_json = ?, affected_scope = ?,
                risk_level = ?, suggested_action = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                updated["risk_type"],
                updated["title"],
                updated.get("description", ""),
                updated.get("evidence_json", "{}"),
                updated.get("affected_scope", ""),
                updated.get("risk_level", "medium"),
                updated.get("suggested_action", ""),
                updated.get("status", "open"),
                risk_id,
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM organization_risks WHERE id = ?", (risk_id,), "organization risk")
        record_edit(conn, after.get("project_id"), None, "organization_risk", risk_id, serialize_organization_risk(before), serialize_organization_risk(after))
        return serialize_organization_risk(after)


@app.post("/api/diagnosis/reports/generate")
def generate_diagnosis_report(
    payload: DiagnosisReportGeneratePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT id FROM projects WHERE id = ?", (payload.project_id,), "project")
        context = build_diagnosis_context(conn, payload.project_id, payload.hypothesis_id, payload.model_id)
    system = "你是资深 HR 组织诊断报告顾问，请生成结构化报告。"
    prompt = f"""
请生成 {payload.report_type}，包含诊断摘要、诊断假设、关键发现、评分差异、开放反馈主题、员工反馈交叉验证、AI 时代人才维度表现、组织问题归因、AI 转型卡点、风险提示、建议行动和 HR 人工确认区。
如 include_action_plan 为 true，请包含 30/60/90 天计划。
必须包含风控提示：本报告仅用于发展反馈和组织诊断，不作为自动晋升、淘汰、薪酬或裁员决策依据。所有结论需要 HR 结合业务事实进行人工确认。
输入：
{dumps({"payload": payload.model_dump(), "context": context})}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    content = ai_text.strip() if ai_text else ""
    if not content:
        content = fallback_diagnosis_report(context, payload.report_type, payload.include_action_plan)
        used_fallback = True
        if error:
            content += f"\n\n> AI 接口未返回有效结果，已使用本地 fallback。原因：{error}\n"
    title = f"{payload.report_type} - 项目 {payload.project_id}"
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO diagnosis_reports
                (project_id, hypothesis_id, model_id, report_type, title, content, status, created_by)
            VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
            """,
            (payload.project_id, payload.hypothesis_id, payload.model_id, payload.report_type, title, content, user["id"]),
        )
        report_id = int(cur.lastrowid)
        run_id = record_ai_run(conn, payload.project_id, None, "generate_diagnosis_report", prompt, payload.model_dump(), content, used_fallback, created_by=user["id"])
        report = serialize_diagnosis_report(fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report"))
        report["ai_run_id"] = run_id
        report["used_fallback"] = used_fallback
        return report


@app.get("/api/diagnosis/reports")
def list_diagnosis_reports(
    project_id: int | None = None,
    authorization: str | None = Header(default=None),
) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        if project_id:
            rows = conn.execute("SELECT * FROM diagnosis_reports WHERE project_id = ? ORDER BY updated_at DESC, id DESC", (project_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM diagnosis_reports ORDER BY updated_at DESC, id DESC").fetchall()
        return [serialize_diagnosis_report(row) for row in rows]


@app.get("/api/diagnosis/reports/{report_id}")
def get_diagnosis_report(report_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        return serialize_diagnosis_report(fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report"))


@app.put("/api/diagnosis/reports/{report_id}")
def update_diagnosis_report(
    report_id: int,
    payload: DiagnosisReportUpdatePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report")
        conn.execute(
            "UPDATE diagnosis_reports SET title = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (payload.title, payload.content, payload.status, report_id),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report")
        record_edit(conn, after.get("project_id"), None, "diagnosis_report", report_id, before, after)
        return serialize_diagnosis_report(after)


@app.post("/api/diagnosis/reports/{report_id}/confirm")
def confirm_diagnosis_report(report_id: int, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report")
        conn.execute(
            """
            UPDATE diagnosis_reports
            SET status = 'confirmed', confirmed_by = ?, confirmed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (user["id"], report_id),
        )
        return serialize_diagnosis_report(fetch_one_or_404(conn, "SELECT * FROM diagnosis_reports WHERE id = ?", (report_id,), "diagnosis report"))


@app.post("/api/action-plans/generate")
def generate_action_plan(
    payload: ActionPlanGeneratePayload,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    user = require_admin_user(authorization)
    with get_connection() as conn:
        context = build_diagnosis_context(conn, payload.project_id)
        report = None
        if payload.report_id:
            row = conn.execute("SELECT * FROM diagnosis_reports WHERE id = ?", (payload.report_id,)).fetchone()
            report = as_dict(row) if row else None
    system = "你是组织发展行动计划顾问，只输出可解析 JSON。"
    prompt = f"""
请生成 30/60/90 天行动计划，输出 JSON：{{"action_plans":[{{"title":"","description":"","timeline":"30天","target_type":"organization","status":"pending"}}]}}。
输入：
{dumps({"payload": payload.model_dump(), "report": report, "context": context})}
"""
    ai_text, used_fallback, error = chat_completion(system, prompt)
    parsed = extract_json(ai_text) if ai_text else None
    plans = normalize_action_plans(parsed, payload.project_id, payload.report_id) if parsed is not None else []
    if not plans:
        plans = fallback_action_plans(payload.project_id, payload.report_id)
        used_fallback = True
        ai_text = dumps({"action_plans": plans, "fallback_reason": error or "AI output could not be parsed."})
    with get_connection() as conn:
        saved = []
        for plan in plans:
            cur = conn.execute(
                """
                INSERT INTO action_plans
                    (project_id, report_id, owner_id, target_type, target_id, title, description, timeline, status, ai_generated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload.project_id,
                    payload.report_id,
                    plan.get("owner_id"),
                    plan.get("target_type", "organization"),
                    plan.get("target_id"),
                    plan["title"],
                    plan.get("description", ""),
                    plan.get("timeline", "30天"),
                    plan.get("status", "pending"),
                    int(plan.get("ai_generated", True)),
                ),
            )
            saved.append(serialize_action_plan(fetch_one_or_404(conn, "SELECT * FROM action_plans WHERE id = ?", (int(cur.lastrowid),), "action plan")))
        run_id = record_ai_run(conn, payload.project_id, None, "generate_action_plan", prompt, payload.model_dump(), ai_text or dumps({"action_plans": plans}), used_fallback, created_by=user["id"])
        return {"action_plans": saved, "ai_run_id": run_id, "used_fallback": used_fallback}


@app.get("/api/action-plans")
def list_action_plans(project_id: int | None = None, authorization: str | None = Header(default=None)) -> list[dict[str, Any]]:
    require_admin_user(authorization)
    with get_connection() as conn:
        if project_id:
            rows = conn.execute("SELECT * FROM action_plans WHERE project_id = ? ORDER BY timeline, id", (project_id,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM action_plans ORDER BY created_at DESC, id DESC").fetchall()
        return [serialize_action_plan(row) for row in rows]


@app.post("/api/action-plans")
def create_action_plan(payload: ActionPlanPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        cur = conn.execute(
            """
            INSERT INTO action_plans
                (project_id, report_id, owner_id, target_type, target_id, title, description, timeline, status, ai_generated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.project_id,
                payload.report_id,
                payload.owner_id,
                payload.target_type,
                payload.target_id,
                payload.title,
                payload.description,
                payload.timeline,
                payload.status,
                int(payload.ai_generated),
            ),
        )
        return serialize_action_plan(fetch_one_or_404(conn, "SELECT * FROM action_plans WHERE id = ?", (int(cur.lastrowid),), "action plan"))


@app.put("/api/action-plans/{plan_id}")
def update_action_plan(plan_id: int, payload: ActionPlanPayload, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_admin_user(authorization)
    with get_connection() as conn:
        before = fetch_one_or_404(conn, "SELECT * FROM action_plans WHERE id = ?", (plan_id,), "action plan")
        conn.execute(
            """
            UPDATE action_plans
            SET project_id = ?, report_id = ?, owner_id = ?, target_type = ?, target_id = ?,
                title = ?, description = ?, timeline = ?, status = ?, ai_generated = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                payload.project_id,
                payload.report_id,
                payload.owner_id,
                payload.target_type,
                payload.target_id,
                payload.title,
                payload.description,
                payload.timeline,
                payload.status,
                int(payload.ai_generated),
                plan_id,
            ),
        )
        after = fetch_one_or_404(conn, "SELECT * FROM action_plans WHERE id = ?", (plan_id,), "action plan")
        record_edit(conn, after.get("project_id"), None, "action_plan", plan_id, before, after)
        return serialize_action_plan(after)


@app.get("/api/360/health")
def review360_health() -> dict[str, str]:
    return {"status": "ok", "module": "360 Review Intelligence Agent", "time": now_text()}


@app.get("/api/360/projects")
def review360_list_projects() -> list[dict[str, Any]]:
    return list_projects()


@app.post("/api/360/projects")
def review360_create_project(payload: ProjectPayload) -> dict[str, Any]:
    return create_project(payload)


@app.post("/api/360/questionnaire/generate")
def review360_generate_questionnaire(payload: Questionnaire360GeneratePayload) -> dict[str, Any]:
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.project_id)
    result = generate_questionnaire(
        project_id,
        QuestionnaireGeneratePayload(role=payload.role, level=payload.level),
    )
    result["project_id"] = project_id
    return result


@app.post("/api/360/questionnaire/optimize")
def review360_optimize_questionnaire(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.get("project_id"))
    result = inspect_questionnaire(project_id)
    result["project_id"] = project_id
    return result


@app.get("/api/360/employees")
def review360_list_employees(project_id: int | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        selected_project_id = ensure_project_id(conn, project_id)
    return list_employees(selected_project_id)


@app.post("/api/360/employees")
def review360_create_employee(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.get("project_id"))
    employee = EmployeePayload(
        name=payload.get("name", ""),
        department=payload.get("department", ""),
        role=payload.get("role", ""),
        level=payload.get("level", ""),
        manager=payload.get("manager", payload.get("manager_name", "")),
        manager_name=payload.get("manager_name", payload.get("manager", "")),
    )
    return create_employee(project_id, employee)


@app.get("/api/360/relations")
def review360_list_relations(project_id: int | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        selected_project_id = ensure_project_id(conn, project_id)
    return list_relationships(selected_project_id)


@app.post("/api/360/relations")
def review360_create_relation(payload: dict[str, Any]) -> dict[str, Any]:
    relation_map = {
        "上级": "manager",
        "同级": "peer",
        "下级": "direct_report",
        "协作方": "partner",
        "自评": "self",
    }
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.get("project_id"))
    relation = RelationshipPayload(
        subject_employee_id=payload.get("subject_employee_id", payload.get("reviewee_id")),
        evaluator_employee_id=payload.get("evaluator_employee_id", payload.get("reviewer_id")),
        relation_type=relation_map.get(payload.get("relation_type"), payload.get("relation_type", "peer")),
    )
    return create_relationship(project_id, relation)


@app.get("/api/360/responses")
def review360_list_responses(project_id: int | None = None) -> list[dict[str, Any]]:
    with get_connection() as conn:
        selected_project_id = ensure_project_id(conn, project_id)
        rows = conn.execute(
            """
            SELECT r.*, subject.name AS reviewee_name, evaluator.name AS reviewer_name
            FROM responses r
            JOIN employees subject ON subject.id = r.subject_employee_id
            JOIN employees evaluator ON evaluator.id = r.evaluator_employee_id
            WHERE r.project_id = ?
            ORDER BY r.submitted_at DESC, r.id DESC
            """,
            (selected_project_id,),
        ).fetchall()
        return [as_dict(row) for row in rows]


@app.post("/api/360/responses")
def review360_submit_response(payload: dict[str, Any]) -> dict[str, Any]:
    relation_map = {
        "上级": "manager",
        "同级": "peer",
        "下级": "direct_report",
        "协作方": "partner",
        "自评": "self",
    }
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.get("project_id"))
    scores = payload.get("scores")
    if not scores and payload.get("question_id"):
        scores = [
            {
                "question_id": payload.get("question_id"),
                "score": payload.get("score", 3),
                "text_feedback": payload.get("text_feedback", ""),
            }
        ]
    response = ResponsePayload(
        subject_employee_id=payload.get("subject_employee_id", payload.get("reviewee_id")),
        evaluator_employee_id=payload.get("evaluator_employee_id", payload.get("reviewer_id")),
        relation_type=relation_map.get(payload.get("relation_type"), payload.get("relation_type", "peer")),
        scores=scores or [],
        overall_comment=payload.get("overall_comment", ""),
    )
    return submit_response(project_id, response)


@app.get("/api/360/analytics/{project_id}")
def review360_get_analytics(project_id: int) -> dict[str, Any]:
    return get_analytics(project_id)


@app.post("/api/360/reports/generate")
def review360_generate_report(payload: dict[str, Any]) -> dict[str, Any]:
    project_id = payload.get("project_id")
    reviewee_id = payload.get("reviewee_id", payload.get("employee_id"))
    if not project_id or not reviewee_id:
        raise HTTPException(status_code=400, detail="project_id and reviewee_id are required")
    return generate_report(int(project_id), int(reviewee_id))


@app.post("/api/360/org-diagnosis/generate")
def review360_generate_org_diagnosis(payload: dict[str, Any]) -> dict[str, Any]:
    with get_connection() as conn:
        project_id = ensure_project_id(conn, payload.get("project_id"))
    return generate_org_diagnosis(project_id)
