from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from .security import hash_login_code

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local convenience.
    load_dotenv = None


BACKEND_DIR = Path(__file__).resolve().parents[1]
if load_dotenv:
    load_dotenv()


def resolve_database_path() -> Path:
    explicit_path = os.getenv("HR360_DB_PATH", "").strip()
    if explicit_path:
        return Path(explicit_path)

    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url.startswith("sqlite:///"):
        raw_path = database_url.removeprefix("sqlite:///")
        path = Path(raw_path)
        return path if path.is_absolute() else BACKEND_DIR / path

    return BACKEND_DIR / "hr360.sqlite3"


DB_PATH = resolve_database_path()
DEFAULT_ADMIN_USERNAME = os.getenv("HR_AI_DEMO_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_CREDENTIAL = os.getenv("HR_AI_DEMO_ADMIN_CREDENTIAL", "admin" + "123")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                project_type TEXT NOT NULL DEFAULT 'combined',
                target_scope TEXT NOT NULL DEFAULT '',
                purpose TEXT NOT NULL DEFAULT '',
                scope TEXT NOT NULL DEFAULT '',
                start_date TEXT NOT NULL DEFAULT '',
                end_date TEXT NOT NULL DEFAULT '',
                anonymous INTEGER NOT NULL DEFAULT 1,
                status TEXT NOT NULL DEFAULT 'draft',
                created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS review_projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                purpose TEXT NOT NULL DEFAULT '',
                scope TEXT NOT NULL DEFAULT '',
                start_date TEXT NOT NULL DEFAULT '',
                end_date TEXT NOT NULL DEFAULT '',
                anonymous INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ai_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                api_key TEXT NOT NULL DEFAULT '',
                base_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
                model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS dimensions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS competencies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                target_level TEXT NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                competency_id INTEGER,
                dimension_id INTEGER NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
                hypothesis_id INTEGER,
                model_id INTEGER,
                content TEXT NOT NULL DEFAULT '',
                text TEXT NOT NULL,
                behavior_anchor TEXT NOT NULL DEFAULT '',
                question_type TEXT NOT NULL DEFAULT 'rating',
                relation_scope TEXT NOT NULL DEFAULT 'all',
                rating_type TEXT NOT NULL DEFAULT 'score_1_5',
                open_followup TEXT NOT NULL DEFAULT '',
                weight REAL NOT NULL DEFAULT 1.0,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                department TEXT NOT NULL DEFAULT '',
                role TEXT NOT NULL DEFAULT '',
                level TEXT NOT NULL DEFAULT '',
                manager TEXT NOT NULL DEFAULT '',
                manager_name TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS relationships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                subject_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                evaluator_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                relation_type TEXT NOT NULL CHECK (
                    relation_type IN ('manager', 'peer', 'direct_report', 'partner', 'self')
                ),
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, subject_employee_id, evaluator_employee_id, relation_type)
            );

            CREATE TABLE IF NOT EXISTS review_relations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                reviewee_id INTEGER NOT NULL,
                reviewer_id INTEGER NOT NULL,
                relation_type TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'employee',
                employee_id INTEGER,
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS review_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                reviewee_id INTEGER NOT NULL,
                reviewer_id INTEGER NOT NULL,
                relation_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                submitted_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS feedback_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                employee_id INTEGER,
                category TEXT NOT NULL DEFAULT 'general',
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                anonymous INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'new',
                priority TEXT NOT NULL DEFAULT 'normal',
                ai_summary TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS login_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                expires_at TEXT
            );

            CREATE TABLE IF NOT EXISTS diagnosis_hypotheses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                created_by INTEGER,
                target_scope TEXT,
                diagnosis_purpose TEXT,
                company_stage TEXT,
                hr_core_judgment TEXT,
                target_talent TEXT,
                focus_issues TEXT,
                constraints TEXT,
                expected_outputs TEXT,
                ai_extracted_hypotheses TEXT,
                status TEXT DEFAULT 'draft',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS talent_models (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                hypothesis_id INTEGER,
                name TEXT NOT NULL,
                description TEXT,
                source_type TEXT DEFAULT 'ai_generated',
                created_by INTEGER,
                status TEXT DEFAULT 'draft',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS talent_dimensions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                low_behavior TEXT,
                medium_behavior TEXT,
                high_behavior TEXT,
                applicable_roles TEXT,
                weight REAL DEFAULT 1.0,
                sample_rating_questions TEXT,
                sample_open_questions TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS diagnosis_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                hypothesis_id INTEGER,
                model_id INTEGER,
                rule_name TEXT NOT NULL,
                condition_type TEXT,
                condition_json TEXT NOT NULL,
                diagnosis_text TEXT NOT NULL,
                risk_level TEXT DEFAULT 'medium',
                suggested_action TEXT,
                evidence_sources TEXT,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS feedback_clusters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                theme TEXT NOT NULL,
                summary TEXT,
                evidence_count INTEGER DEFAULT 0,
                related_departments TEXT,
                risk_level TEXT DEFAULT 'medium',
                suggested_action TEXT,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS organization_risks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                risk_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT,
                evidence_json TEXT,
                affected_scope TEXT,
                risk_level TEXT DEFAULT 'medium',
                suggested_action TEXT,
                status TEXT DEFAULT 'open',
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS diagnosis_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                hypothesis_id INTEGER,
                model_id INTEGER,
                report_type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                status TEXT DEFAULT 'draft',
                created_by INTEGER,
                confirmed_by INTEGER,
                confirmed_at TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS action_plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                report_id INTEGER,
                owner_id INTEGER,
                target_type TEXT,
                target_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                timeline TEXT,
                status TEXT DEFAULT 'pending',
                ai_generated INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS organization_diagnosis_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                dimension TEXT NOT NULL,
                question_key TEXT NOT NULL,
                score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
                comment TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS organization_diagnosis_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                dimension_scores_json TEXT NOT NULL DEFAULT '{}',
                total_score REAL NOT NULL DEFAULT 0,
                maturity_level TEXT NOT NULL DEFAULT 'L1 AI 工具尝试型',
                summary TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id)
            );

            CREATE TABLE IF NOT EXISTS talent_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                talent_type TEXT NOT NULL,
                dimension_scores_json TEXT NOT NULL DEFAULT '{}',
                native_strength TEXT NOT NULL DEFAULT '',
                ai_collaboration_level TEXT NOT NULL DEFAULT '',
                best_fit_tasks TEXT NOT NULL DEFAULT '[]',
                not_recommended_tasks TEXT NOT NULL DEFAULT '[]',
                recommended_agents TEXT NOT NULL DEFAULT '[]',
                growth_suggestion TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                survey_type TEXT NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'draft',
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS survey_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                survey_id INTEGER NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                response_json TEXT NOT NULL DEFAULT '{}',
                submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(survey_id, user_id)
            );

            CREATE TABLE IF NOT EXISTS organization_feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                feedback_type TEXT NOT NULL DEFAULT 'other',
                content TEXT NOT NULL,
                is_anonymous INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS os_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                report_type TEXT NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                subject_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                evaluator_employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                relation_type TEXT NOT NULL,
                overall_comment TEXT NOT NULL DEFAULT '',
                submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(project_id, subject_employee_id, evaluator_employee_id, relation_type)
            );

            CREATE TABLE IF NOT EXISTS response_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                response_id INTEGER NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
                question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
                score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
                text_feedback TEXT NOT NULL DEFAULT '',
                UNIQUE(response_id, question_id)
            );

            CREATE TABLE IF NOT EXISTS ai_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                run_type TEXT NOT NULL DEFAULT '',
                feature TEXT NOT NULL,
                prompt TEXT NOT NULL DEFAULT '',
                input_json TEXT NOT NULL DEFAULT '{}',
                output_json TEXT NOT NULL DEFAULT '{}',
                output_text TEXT NOT NULL DEFAULT '',
                provider_base_url TEXT NOT NULL DEFAULT '',
                model TEXT NOT NULL DEFAULT '',
                created_by INTEGER,
                used_fallback INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ai_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                reviewee_id INTEGER NOT NULL,
                report_content TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
                content TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed')),
                ai_run_id INTEGER REFERENCES ai_runs(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                confirmed_at TEXT,
                UNIQUE(project_id, employee_id)
            );

            CREATE TABLE IF NOT EXISTS edit_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
                entity_type TEXT NOT NULL,
                entity_id INTEGER NOT NULL,
                edited_by TEXT NOT NULL DEFAULT 'HR',
                editor TEXT NOT NULL DEFAULT 'HR',
                before_json TEXT NOT NULL DEFAULT '{}',
                after_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_employees_project ON employees(project_id);
            CREATE INDEX IF NOT EXISTS idx_relationships_project ON relationships(project_id);
            CREATE INDEX IF NOT EXISTS idx_responses_project ON responses(project_id);
            CREATE INDEX IF NOT EXISTS idx_scores_question ON response_scores(question_id);
            CREATE INDEX IF NOT EXISTS idx_ai_runs_project ON ai_runs(project_id, feature);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_review_tasks_unique
                ON review_tasks(project_id, reviewee_id, reviewer_id, relation_type);
            CREATE INDEX IF NOT EXISTS idx_review_tasks_reviewer ON review_tasks(reviewer_id, status);
            CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback_items(status, category);
            CREATE INDEX IF NOT EXISTS idx_login_sessions_token ON login_sessions(token);
            CREATE INDEX IF NOT EXISTS idx_diagnosis_hypotheses_status ON diagnosis_hypotheses(status, project_id);
            CREATE INDEX IF NOT EXISTS idx_talent_models_status ON talent_models(status, project_id);
            CREATE INDEX IF NOT EXISTS idx_talent_dimensions_model ON talent_dimensions(model_id);
            CREATE INDEX IF NOT EXISTS idx_diagnosis_rules_project ON diagnosis_rules(project_id, risk_level);
            CREATE INDEX IF NOT EXISTS idx_feedback_clusters_project ON feedback_clusters(project_id, risk_level);
            CREATE INDEX IF NOT EXISTS idx_organization_risks_project ON organization_risks(project_id, status, risk_level);
            CREATE INDEX IF NOT EXISTS idx_diagnosis_reports_project ON diagnosis_reports(project_id, report_type, status);
            CREATE INDEX IF NOT EXISTS idx_action_plans_project ON action_plans(project_id, timeline, status);
            CREATE INDEX IF NOT EXISTS idx_org_diag_responses_project ON organization_diagnosis_responses(project_id, dimension);
            CREATE INDEX IF NOT EXISTS idx_talent_profiles_project ON talent_profiles(project_id, talent_type);
            CREATE INDEX IF NOT EXISTS idx_surveys_project ON surveys(project_id, survey_type, status);
            CREATE INDEX IF NOT EXISTS idx_survey_responses_project ON survey_responses(project_id, survey_id);
            CREATE INDEX IF NOT EXISTS idx_organization_feedback_project ON organization_feedback(project_id, feedback_type);
            CREATE INDEX IF NOT EXISTS idx_os_reports_project ON os_reports(project_id, report_type, user_id);
            """
        )

        # Lightweight migrations for local MVP databases created by earlier builds.
        columns: dict[str, list[tuple[str, str]]] = {
            "projects": [
                ("description", "TEXT NOT NULL DEFAULT ''"),
                ("project_type", "TEXT NOT NULL DEFAULT 'combined'"),
                ("target_scope", "TEXT NOT NULL DEFAULT ''"),
                ("anonymous", "INTEGER NOT NULL DEFAULT 1"),
                ("created_by", "INTEGER"),
            ],
            "employees": [("manager_name", "TEXT NOT NULL DEFAULT ''")],
            "questions": [
                ("competency_id", "INTEGER"),
                ("hypothesis_id", "INTEGER"),
                ("model_id", "INTEGER"),
                ("content", "TEXT NOT NULL DEFAULT ''"),
                ("question_type", "TEXT NOT NULL DEFAULT 'rating'"),
                ("relation_scope", "TEXT NOT NULL DEFAULT 'all'"),
                ("rating_type", "TEXT NOT NULL DEFAULT 'score_1_5'"),
                ("open_followup", "TEXT NOT NULL DEFAULT ''"),
                ("weight", "REAL NOT NULL DEFAULT 1.0"),
                ("created_at", "TEXT DEFAULT ''"),
            ],
            "response_scores": [("text_feedback", "TEXT NOT NULL DEFAULT ''")],
            "responses": [
                ("reviewee_id", "INTEGER"),
                ("reviewer_id", "INTEGER"),
                ("question_id", "INTEGER"),
                ("score", "INTEGER"),
                ("text_feedback", "TEXT NOT NULL DEFAULT ''"),
            ],
            "ai_runs": [
                ("run_type", "TEXT NOT NULL DEFAULT ''"),
                ("output_json", "TEXT NOT NULL DEFAULT '{}'"),
                ("created_by", "INTEGER"),
            ],
            "edit_history": [("edited_by", "TEXT NOT NULL DEFAULT 'HR'")],
            "users": [
                ("employee_id", "INTEGER"),
                ("status", "TEXT NOT NULL DEFAULT 'active'"),
            ],
            "feedback_items": [
                ("priority", "TEXT NOT NULL DEFAULT 'normal'"),
                ("ai_summary", "TEXT"),
                ("updated_at", "TEXT DEFAULT ''"),
            ],
        }
        for table, specs in columns.items():
            existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
            for name, definition in specs:
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")

        conn.execute("UPDATE questions SET content = text WHERE content = ''")
        conn.execute("UPDATE employees SET manager_name = manager WHERE manager_name = ''")
        conn.execute("UPDATE ai_runs SET run_type = feature WHERE run_type = ''")
        conn.execute("UPDATE ai_runs SET output_json = output_text WHERE output_json = '{}' AND output_text <> ''")
        conn.execute("UPDATE edit_history SET edited_by = editor WHERE edited_by = ''")
        conn.execute("UPDATE questions SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL OR created_at = ''")
        conn.execute("UPDATE feedback_items SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL OR updated_at = ''")

        admin_exists = conn.execute("SELECT id FROM users WHERE username = ?", ("admin",)).fetchone()
        if not admin_exists:
            conn.execute(
                """
                INSERT INTO users (username, password_hash, role, status)
                VALUES (?, ?, 'admin', 'active')
                """,
                (DEFAULT_ADMIN_USERNAME, hash_login_code(DEFAULT_ADMIN_CREDENTIAL)),
            )

        demo_project = conn.execute(
            "SELECT id FROM projects WHERE name = ?",
            ("2026 Q2 AI 原生组织诊断项目",),
        ).fetchone()
        if not demo_project:
            cur = conn.execute(
                """
                INSERT INTO projects
                    (name, description, project_type, target_scope, purpose, scope, start_date, end_date,
                     anonymous, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                (
                    "2026 Q2 AI 原生组织诊断项目",
                    "Sample：用于演示 AI 原生组织与人才诊断系统的 combined 项目。",
                    "combined",
                    "全员",
                    "组织诊断 + 人才盘点 + 360 Review",
                    "全员",
                    "2026-04-01",
                    "2026-06-30",
                ),
            )
            demo_project_id = int(cur.lastrowid)
        else:
            demo_project_id = int(demo_project["id"])

        employee_row = conn.execute(
            "SELECT id FROM employees WHERE project_id = ? AND name = ?",
            (demo_project_id, "Demo Employee"),
        ).fetchone()
        if not employee_row:
            cur = conn.execute(
                """
                INSERT INTO employees
                    (project_id, name, department, role, level, manager, manager_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (demo_project_id, "Demo Employee", "产品与运营", "AI 转型项目成员", "P6", "HR Demo", "HR Demo"),
            )
            demo_employee_id = int(cur.lastrowid)
        else:
            demo_employee_id = int(employee_row["id"])

        demo_users = [
            ("boss@demo.com", "demo123", "boss", None),
            ("hr@demo.com", "demo123", "hr", None),
            ("employee@demo.com", "demo123", "employee", demo_employee_id),
        ]
        for username, credential, role, employee_id in demo_users:
            existing_user = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
            if not existing_user:
                conn.execute(
                    """
                    INSERT INTO users (username, password_hash, role, employee_id, status)
                    VALUES (?, ?, ?, ?, 'active')
                    """,
                    (username, hash_login_code(credential), role, employee_id),
                )

        for survey_type, title in [
            ("org_diagnosis", "组织诊断问卷"),
            ("self_assessment", "员工自评问卷"),
            ("review_360", "360 Review 问卷"),
            ("organization_feedback", "组织反馈问卷"),
        ]:
            existing_survey = conn.execute(
                "SELECT id FROM surveys WHERE project_id = ? AND survey_type = ?",
                (demo_project_id, survey_type),
            ).fetchone()
            if not existing_survey:
                conn.execute(
                    """
                    INSERT INTO surveys (project_id, survey_type, title, description, status)
                    VALUES (?, ?, ?, 'Sample：Demo 项目默认问卷。', 'active')
                    """,
                    (demo_project_id, survey_type, title),
                )
