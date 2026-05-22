# hr-ai-consulting

`hr-ai-consulting` 是一个 HR 组织咨询网站，当前已融合 **360 Review Intelligence Agent**。该 Agent 是网站内的一个功能模块，不是独立项目，用于帮助 HR 设计、执行、分析全员 360 评审，并生成需要 HR 确认的发展反馈报告。

Phase 2 已加入本地账号系统、管理员控制台、员工工作台和员工反馈池。系统支持员工登录填写自己的评审任务，管理员查看全员进度、回答数据、AI 分析结果和员工反馈处理状态。

Phase 3.1-3.3 已加入 Agentic HR 主线：HR 先输入组织诊断假设，AI 提炼结构化假设；再基于假设生成 AI 时代人才模型；最后基于诊断假设和人才模型生成更贴合真实组织问题的 360 问卷。

Phase 3.4-3.7 已继续升级为完整组织诊断闭环：AI 诊断规则生成、Employee Voice Agent 员工声音智能体、组织诊断看板、组织诊断报告和 30/60/90 天行动计划。前端已加入全局 sticky 顶部导航，方便在组织咨询首页、HR 诊断假设、AI 人才模型、360评审 Agent、管理员控制台、员工反馈、组织诊断看板和报告生成之间切换。

## 360 Agent 定位

360 Review Intelligence Agent 面向 HR、HRBP 和组织发展顾问，覆盖：

- 360 评审项目创建
- AI 生成胜任力维度和行为化题目
- 员工管理与评价关系配置
- 1-5 分评分和逐题开放文本反馈
- 完成率、维度均分、自评/他评差距、群体差异、部门热力图分析
- 开放反馈高频主题和风险提示
- 个人 360 报告与组织诊断摘要

首页或左侧导航中的 **「360评审 Agent」** 是进入该模块的入口。

管理员登录后还可以进入：

- **HR诊断假设**：输入 HR 对组织、团队、人才问题的判断，AI 提炼可验证诊断假设。
- **AI人才模型**：基于已确认诊断假设生成 AI 时代人才能力模型，支持编辑维度、低/中/高行为标准、样例题目和权重。
- **360评审 Agent / 问卷设计**：新增「AI 时代诊断问卷生成」，可基于诊断假设和人才模型生成问卷。
- **诊断规则**：基于诊断假设和人才模型生成评分差异、反馈主题和 AI 转型信号的解释规则。
- **Employee Voice Agent**：升级员工反馈池，支持反馈筛选、AI 总结和员工声音主题聚类。
- **组织诊断看板**：组合项目完成率、AI 人才维度表现、360 差异、员工反馈主题、组织风险、高潜人才信号和 AI 转型卡点。
- **报告生成**：生成组织诊断报告、AI 转型成熟度报告和 30/60/90 天行动计划，默认草稿，需要 HR 确认。

## 账号与角色

默认演示管理员会在数据库初始化时自动创建，账号与口令请以本地初始化配置为准。生产环境必须通过环境变量覆盖演示口令，并在上线前完成管理员凭据轮换。

角色权限：

- `admin`：项目、问卷、员工、评价关系、任务进度、回答数据、分析看板、AI 报告、员工反馈池。
- `employee`：我的评审任务、问卷填写、我的提交记录、员工意见反馈。

## Phase 3.1-3.3 使用流程

管理员登录后建议按以下顺序使用：

1. 进入 **HR诊断假设**，填写诊断对象、诊断目的、公司阶段、HR 核心判断、想识别的人才、重点关注问题、风控边界和期望输出。
2. 点击 **AI 提炼诊断假设**。没有 `OPENAI_API_KEY` 时会返回 fallback mock 假设，至少包含中层目标拆解、AI 转型、跨部门协作和 AI-native 高潜人才四类假设。
3. HR 编辑 AI 假设后点击 **确认诊断假设**。
4. 进入 **AI人才模型**，选择已确认诊断假设和模型模板，点击 **AI 生成人才模型**。没有 AI Key 时会返回 mock `AI-native Manager Capability Model`。
5. HR 编辑模型名称、说明、维度、低/中/高行为标准、样例题目和权重，保存并确认模型。
6. 回到 **360评审 Agent / 问卷设计**，在「AI 时代诊断问卷生成」区域选择诊断假设和人才模型，生成评分题、行为观察题、开放反馈题、管理者专项题或 AI 治理题。

这些内容仍然只用于发展反馈、能力诊断和组织改进，不作为自动化晋升、淘汰、薪酬或裁员决策依据。

## Phase 3.4-3.7 使用流程

1. 进入 **诊断规则**，选择项目、已确认诊断假设和人才模型，点击 **AI 生成诊断规则**。无 AI Key 时返回 fallback mock 规则。
2. 进入 **员工反馈**，管理员可筛选反馈、逐条 AI 总结，也可点击 **AI 反馈主题聚类** 生成 Employee Voice 主题。
3. 进入 **组织诊断看板**，查看项目完成率、模型维度、360 差异、员工反馈主题、组织风险、高潜人才线索和 AI 转型卡点。
4. 点击 **生成组织风险**，系统基于诊断假设、人才模型、诊断规则、员工反馈聚类和 360 差异生成风险解释。
5. 进入 **报告生成**，生成组织诊断报告、AI 转型成熟度报告或 30/60/90 天行动计划。
6. HR 编辑报告草稿后点击 **HR 确认报告**。报告中的 AI 结论仍需结合业务事实人工确认。

后端根路径也提供运行状态：

```text
GET /
```

## 项目结构

```text
hr-ai-consulting/
  backend/
    main.py             # FastAPI app 入口
    app/
      ai.py             # OpenAI-compatible 调用与 JSON 解析
      database.py       # SQLite 路径、建表与轻量迁移
      main.py           # 认证、360 API、员工任务、反馈、分析、报告与审计接口
      security.py       # 密码 hash 与 token 生成
    requirements.txt
    hr360.sqlite3       # 本地运行后自动生成
  src/
    App.tsx             # HR 网站与 360 Agent 工作台
    api.ts              # 前端统一 /api client
    main.tsx
    styles.css
    types.ts
  package.json
  vite.config.ts
```

## 本地运行

前端 API 地址统一由 `VITE_API_BASE_URL` 配置。本地开发可以复制环境变量示例：

```bash
cp hr-ai-consulting/.env.example hr-ai-consulting/.env.local
```

默认本地后端地址：

```text
VITE_API_BASE_URL=http://127.0.0.1:8008
```

安装后端依赖：

```bash
python -m pip install -r hr-ai-consulting/backend/requirements.txt
```

启动后端：

```bash
pnpm --dir hr-ai-consulting dev:backend
```

启动前端：

```bash
pnpm --dir hr-ai-consulting dev -- --host 0.0.0.0
```

前端访问地址：

```text
http://localhost:5174/
```

API 文档地址：

```text
http://localhost:8008/docs
```

## API

基础健康检查：

```text
GET /
GET /api/health
GET /api/360/health
```

认证 API：

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

360 Agent API：

```text
POST /api/360/projects
GET  /api/360/projects
POST /api/360/questionnaire/generate
POST /api/360/questionnaire/generate-from-model
POST /api/360/questionnaire/optimize
POST /api/360/employees
GET  /api/360/employees
POST /api/360/relations
GET  /api/360/relations
POST /api/360/responses
GET  /api/360/responses
GET  /api/360/analytics/{project_id}
POST /api/360/reports/generate
POST /api/360/org-diagnosis/generate
```

诊断假设 API：

```text
POST /api/diagnosis/hypotheses
GET  /api/diagnosis/hypotheses
GET  /api/diagnosis/hypotheses/{id}
PUT  /api/diagnosis/hypotheses/{id}
POST /api/diagnosis/hypotheses/generate
POST /api/diagnosis/hypotheses/{id}/confirm
```

AI 时代人才模型 API：

```text
POST   /api/talent/models/generate
POST   /api/talent/models
GET    /api/talent/models
GET    /api/talent/models/{id}
PUT    /api/talent/models/{id}
POST   /api/talent/models/{id}/confirm
POST   /api/talent/models/{id}/dimensions
GET    /api/talent/models/{id}/dimensions
PUT    /api/talent/dimensions/{dimension_id}
DELETE /api/talent/dimensions/{dimension_id}
```

诊断规则、组织风险、诊断报告与行动计划 API：

```text
POST /api/diagnosis/rules/generate
GET  /api/diagnosis/rules
POST /api/diagnosis/rules
PUT  /api/diagnosis/rules/{rule_id}
DELETE /api/diagnosis/rules/{rule_id}

GET  /api/diagnosis/dashboard
POST /api/diagnosis/risks/generate
GET  /api/diagnosis/risks
PUT  /api/diagnosis/risks/{risk_id}

POST /api/diagnosis/reports/generate
GET  /api/diagnosis/reports
GET  /api/diagnosis/reports/{id}
PUT  /api/diagnosis/reports/{id}
POST /api/diagnosis/reports/{id}/confirm

POST /api/action-plans/generate
GET  /api/action-plans
POST /api/action-plans
PUT  /api/action-plans/{id}
```

管理员 API：

```text
GET  /api/admin/users
POST /api/admin/users
PUT  /api/admin/users/{user_id}
POST /api/admin/users/{user_id}/reset-password
GET  /api/admin/dashboard
GET  /api/admin/projects/{project_id}/progress
GET  /api/admin/projects/{project_id}/responses
GET  /api/admin/projects/{project_id}/tasks
POST /api/admin/projects/{project_id}/generate-tasks
GET  /api/admin/feedback
PUT  /api/admin/feedback/{feedback_id}/status
POST /api/admin/feedback/{feedback_id}/ai-summary
POST /api/admin/feedback/cluster
GET  /api/admin/feedback/clusters
```

员工 API：

```text
GET  /api/employee/me
GET  /api/employee/tasks
GET  /api/employee/tasks/{task_id}
POST /api/employee/tasks/{task_id}/submit
GET  /api/employee/submissions
POST /api/feedback
GET  /api/feedback/my
```

前端统一通过 [src/api.ts](src/api.ts) 请求后端。配置方式：

```text
VITE_API_BASE_URL=http://127.0.0.1:8008
```

前端会自动请求 `${VITE_API_BASE_URL}/api/...`。线上部署时必须把 `VITE_API_BASE_URL` 设置为后端正式地址，不要使用 `127.0.0.1` 或 `localhost` 作为线上后端地址。

## SQLite

数据库默认位置：

```text
hr-ai-consulting/backend/hr360.sqlite3
```

主要数据表包括：

- `review_projects`
- `users`
- `login_sessions`
- `review_tasks`
- `feedback_items`
- `feedback_clusters`
- `diagnosis_hypotheses`
- `diagnosis_rules`
- `talent_models`
- `talent_dimensions`
- `organization_risks`
- `diagnosis_reports`
- `action_plans`
- `employees`
- `competencies`
- `questions`
- `review_relations`
- `responses`
- `ai_reports`
- `ai_runs`
- `edit_history`

系统同时保留了前端工作台使用的项目、维度、关系、报告等兼容表，以便现有页面继续稳定运行。

当前 MVP 使用 SQLite。本地开发没有问题；线上 Render 如果使用免费实例或临时文件系统，重新部署或重启后，SQLite 数据可能不稳定或丢失。正式使用建议迁移到 PostgreSQL，例如 Render PostgreSQL、Supabase 或 Neon。本次部署配置不强制迁移数据库。

后端支持两种 SQLite 路径配置：

```text
HR360_DB_PATH=/absolute/path/to/hr360.sqlite3
DATABASE_URL=sqlite:///./hr_ai.db
```

如果两个都不设置，默认使用 `hr-ai-consulting/backend/hr360.sqlite3`。

## AI 配置

AI 接口兼容 OpenAI Chat Completions，通过环境变量读取：

```bash
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

也可以在页面「项目创建」里的 AI 配置表单保存：

```text
api_key
base_url
model
```

如果没有配置 `OPENAI_API_KEY`，系统不会报错，会自动使用 fallback mock 结果，确保以下功能完整跑通：

- 生成 360 问卷
- 提炼 HR 诊断假设
- 生成 AI 时代人才模型
- 基于诊断假设和人才模型生成问卷
- 生成 AI 诊断规则
- 聚类 Employee Voice 员工反馈主题
- 生成组织风险
- 生成组织诊断报告
- 生成 30/60/90 天行动计划
- 检查和优化问卷题目
- 总结开放文本反馈
- 分析评分差距
- 生成个人 360 报告
- 生成组织诊断摘要

所有 AI 生成记录都会写入 `ai_runs`。

## 360 评审风控原则

- AI 报告只用于发展反馈和组织诊断，不得直接决定晋升、淘汰、薪酬。
- 所有 AI 报告默认是草稿，需要 HR 人工确认。
- 当某类评价人少于 3 人时，不展示该群体原始评论。
- 开放文本反馈应被脱敏、归类，并用中性发展语言表达，避免攻击性语言直接进入报告。
- 系统保留 AI 生成记录和人工修改记录。
- 360 评审的目标不是打分排名，而是识别能力盲区、协作问题和组织管理问题。

## 构建

```bash
pnpm --dir hr-ai-consulting build
```

## Netlify 前端部署

前端部署平台：Netlify。

因为项目在仓库子目录 `hr-ai-consulting` 中，Netlify UI 中这样填写：

```text
Base directory:
hr-ai-consulting

Build command:
pnpm build

Publish directory:
dist
```

Environment variables：

```text
VITE_API_BASE_URL=https://后端正式地址
```

本地开发使用：

```text
VITE_API_BASE_URL=http://127.0.0.1:8008
```

线上必须把 `VITE_API_BASE_URL` 设置成 Render 后端正式地址，不要使用 `127.0.0.1` 作为线上后端地址。

## Render 后端部署

后端部署平台：Render。

当前后端实际入口是 [backend/main.py](backend/main.py)，其中导出了 `app`：

```python
from app.main import app
```

Render UI 中推荐这样填写：

```text
Root Directory:
hr-ai-consulting/backend

Build Command:
pip install -r requirements.txt

Start Command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Environment variables：

```text
ALLOWED_ORIGINS=https://前端正式地址
DATABASE_URL=sqlite:///./hr_ai.db
```

`ALLOWED_ORIGINS` 支持英文逗号分隔多个前端地址：

```text
ALLOWED_ORIGINS=https://xxx.netlify.app,http://127.0.0.1:5173,http://127.0.0.1:5175
```

如果 `ALLOWED_ORIGINS` 为空，后端默认允许本地开发地址：

```text
http://127.0.0.1:5173
http://127.0.0.1:5175
http://localhost:5173
http://localhost:5175
```

项目本地 Vite 默认端口当前是 `5174`，后端也兼容 `http://127.0.0.1:5174` 和 `http://localhost:5174`，方便继续使用现有本地命令。

## GitHub 提交流程

当前开发分支：

```text
ai-org-diagnostic-mvp
```

本地检查：

```bash
pnpm --dir hr-ai-consulting build
```

提交：

```bash
git add hr-ai-consulting
git commit -m "chore: configure deployment environment"
git push origin ai-org-diagnostic-mvp
```

在 GitHub 创建 Pull Request：

```text
ai-org-diagnostic-mvp → main
```

合并后，Netlify 和 Render 都从 `main` 分支自动部署。
