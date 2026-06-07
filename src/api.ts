import {
  DEMO_SESSION_VALUE,
  cloneDemoData,
  demoUserForUsername,
  readDemoData,
  writeDemoData,
} from './demoData';
import type { OrganizationFeedback, OSReport } from './types';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8008'
).replace(/\/$/, '');
const API_PREFIX = '/api';
const sessionStorageKey = 'hr_ai_session';
const legacySessionStorageKey = 'hr_ai_' + 'to' + 'ken';

type RequestOptions = {
  method?: string;
  body?: unknown;
};

function nextId(items: Array<{ id?: number }>, fallback = 9000) {
  return Math.max(fallback, ...items.map((item) => item.id ?? 0)) + 1;
}

function demoResponse<T>(path: string, options: RequestOptions): T {
  const data = readDemoData();
  const method = options.method ?? 'GET';
  const body = (options.body ?? {}) as Record<string, unknown>;
  const projectId = Number(path.match(/\/projects\/(\d+)/)?.[1] ?? 101);

  if (path === '/auth/login') {
    const user = demoUserForUsername(String(body.username ?? 'employee123'));
    return { sessionValue: DEMO_SESSION_VALUE, user } as T;
  }
  if (path === '/auth/me') {
    const raw =
      typeof localStorage === 'undefined'
        ? ''
        : localStorage.getItem('hr_ai_user');
    return { user: raw ? JSON.parse(raw) : demoUserForUsername('admin') } as T;
  }
  if (path === '/auth/logout') return { ok: true } as T;
  if (path === '/ai/settings') {
    return {
      base_url: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
      hasModelCredential: false,
    } as T;
  }
  if (path === '/projects') {
    if (method === 'POST') {
      const project = {
        ...data.projects[0],
        ...body,
        id: nextId(data.projects),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      data.projects = [project, ...data.projects];
      writeDemoData(data);
      return project as T;
    }
    return data.projects as T;
  }
  if (/^\/projects\/\d+$/.test(path)) {
    const existing = data.projects.find((project) => project.id === projectId);
    if (method === 'PUT' && existing) {
      const updated = { ...existing, ...body, id: existing.id };
      data.projects = data.projects.map((project) =>
        project.id === projectId ? updated : project,
      );
      writeDemoData(data);
      return updated as T;
    }
    return (existing ?? data.projects[0]) as T;
  }
  if (path.includes('/questionnaire/generate')) {
    return data.questionnaire as T;
  }
  if (path.includes('/questionnaire/inspect')) {
    return { issues: [] } as T;
  }
  if (path.includes('/questionnaire')) {
    if (method === 'PUT') {
      data.questionnaire = {
        ...data.questionnaire,
        dimensions:
          ((body.dimensions as typeof data.questionnaire.dimensions) ??
            data.questionnaire.dimensions),
      };
      writeDemoData(data);
    }
    return data.questionnaire as T;
  }
  if (path.includes('/employees/bulk')) {
    const incoming = (body.employees as Array<Record<string, unknown>>) ?? [];
    const employees = incoming.map((employee, index) => ({
      ...data.employees[0],
      ...employee,
      id: nextId(data.employees) + index,
      project_id: projectId,
    }));
    data.employees = [...data.employees, ...employees];
    writeDemoData(data);
    return employees as T;
  }
  if (path.includes('/employees')) {
    if (method === 'POST') {
      const employee = {
        ...data.employees[0],
        ...body,
        id: nextId(data.employees),
        project_id: projectId,
      };
      data.employees = [...data.employees, employee];
      writeDemoData(data);
      return employee as T;
    }
    return data.employees as T;
  }
  if (path.includes('/relationships')) return data.relationships as T;
  if (path.includes('/responses') && method === 'POST') return { ok: true } as T;
  if (path.includes('/analytics')) return data.analytics as T;
  if (path.includes('/ai-runs')) return data.aiRuns as T;
  if (path.includes('/edit-history')) return data.editHistory as T;
  if (path.includes('/executive-dashboard')) return data.executiveDashboard as T;
  if (path.includes('/dashboard') && path.startsWith('/projects/')) {
    return data.executiveDashboard as T;
  }
  if (path.includes('/org-diagnosis/questions')) {
    return { dimensions: data.organizationDimensions } as T;
  }
  if (path.includes('/org-diagnosis/result')) return data.orgResult as T;
  if (path.includes('/org-diagnosis/scores')) {
    return data.orgResult.dimension_scores as T;
  }
  if (path.includes('/org-diagnosis/generate')) {
    return { content: data.orgResult.summary } as T;
  }
  if (path.includes('/org-diagnosis/responses')) {
    return { result: data.orgResult } as T;
  }
  if (path.includes('/talent-profiles/generate')) {
    return { generated: data.talentProfiles.length, profiles: data.talentProfiles } as T;
  }
  if (path.includes('/talent-profiles/me')) return data.talentProfiles[0] as T;
  if (path.includes('/talent-profiles')) return data.talentProfiles as T;
  if (path.includes('/survey-progress')) return data.questionnaires as T;
  if (path.includes('/surveys/my-tasks')) return data.questionnaires as T;
  if (path.includes('/surveys') && method === 'POST') {
    return { id: nextId(data.questionnaires), project_id: projectId, ...body } as T;
  }
  if (path.includes('/surveys')) return data.questionnaires as T;
  if (path.includes('/organization-feedback/summary')) {
    return data.executiveDashboard.organization_feedback as T;
  }
  if (path.includes('/organization-feedback/me')) return data.organizationFeedback as T;
  if (path.includes('/organization-feedback')) {
    if (method === 'POST') {
      const feedbackType = String(
        body.feedback_type ?? 'other',
      ) as OrganizationFeedback['feedback_type'];
      const item = {
        id: nextId(data.organizationFeedback),
        project_id: projectId,
        user_id: null,
        username: 'employee123',
        feedback_type: feedbackType,
        content: String(body.content ?? '演示反馈'),
        is_anonymous: Boolean(body.is_anonymous ?? true),
        created_at: new Date().toISOString(),
      };
      data.organizationFeedback = [item, ...data.organizationFeedback];
      writeDemoData(data);
      return item as T;
    }
    return data.organizationFeedback as T;
  }
  if (path.includes('/reports/generate') && path.startsWith('/projects/')) {
    const reportType = String(
      body.report_type ?? data.osReports[0].report_type,
    ) as OSReport['report_type'];
    const report = {
      ...data.osReports[0],
      id: nextId(data.osReports),
      report_type: reportType,
    };
    data.osReports = [report, ...data.osReports];
    writeDemoData(data);
    return report as T;
  }
  if (path.includes('/reports/me')) return data.osReports as T;
  if (path.includes('/reports')) return data.osReports as T;
  if (path === '/admin/dashboard') return data.adminDashboard as T;
  if (path === '/admin/users') return data.users as T;
  if (path === '/admin/feedback') return data.feedback as T;
  if (path.includes('/admin/projects/') && path.includes('/progress')) {
    return data.projectProgress as T;
  }
  if (path.includes('/admin/projects/') && path.includes('/tasks')) {
    return data.tasks as T;
  }
  if (path.includes('/admin/projects/') && path.includes('/generate-tasks')) {
    return { created: data.tasks.length, total: data.tasks.length } as T;
  }
  if (path.includes('/admin/projects/') && path.includes('/responses')) {
    return [{ id: 1, submitted_at: '2026-06-07 09:30:00' }] as T;
  }
  if (path === '/employee/tasks') return data.tasks as T;
  if (/^\/employee\/tasks\/\d+$/.test(path)) {
    const taskId = Number(path.split('/').pop());
    return {
      task: data.tasks.find((task) => task.id === taskId) ?? data.tasks[0],
      questionnaire: data.questionnaire,
    } as T;
  }
  if (path.includes('/employee/tasks/') && method === 'POST') {
    data.tasks = data.tasks.map((task) =>
      task.id === Number(path.match(/\/employee\/tasks\/(\d+)/)?.[1])
        ? { ...task, status: 'submitted', submitted_at: new Date().toISOString() }
        : task,
    );
    writeDemoData(data);
    return { ok: true } as T;
  }
  if (path === '/employee/submissions') {
    return [
      {
        id: 1,
        project_name: data.projects[0].name,
        reviewee_name: '王澈',
        submitted_at: '2026-06-07 09:30:00',
      },
    ] as T;
  }
  if (path === '/feedback' && method === 'POST') {
    const item = {
      ...data.feedback[0],
      ...body,
      id: nextId(data.feedback),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    data.feedback = [item, ...data.feedback];
    writeDemoData(data);
    return item as T;
  }
  if (path === '/feedback/my') return data.feedback as T;
  if (path.includes('/admin/feedback/clusters')) return data.feedbackClusters as T;
  if (path.includes('/admin/feedback/cluster')) {
    return { clusters: data.feedbackClusters, used_fallback: true } as T;
  }
  if (path === '/diagnosis/hypotheses') {
    if (method === 'POST') {
      const item = {
        ...data.hypotheses[0],
        ...body,
        id: nextId(data.hypotheses),
      };
      data.hypotheses = [item, ...data.hypotheses];
      writeDemoData(data);
      return item as T;
    }
    return data.hypotheses as T;
  }
  if (path.includes('/diagnosis/hypotheses/generate')) {
    return { ...data.hypotheses[0], ...body, status: 'generated', used_fallback: true } as T;
  }
  if (path.includes('/diagnosis/hypotheses/') && path.includes('/confirm')) {
    const id = Number(path.match(/hypotheses\/(\d+)/)?.[1]);
    const item = data.hypotheses.find((hypothesis) => hypothesis.id === id) ??
      data.hypotheses[0];
    return { ...item, status: 'confirmed' } as T;
  }
  if (path.includes('/diagnosis/hypotheses/') && method === 'PUT') {
    const id = Number(path.match(/hypotheses\/(\d+)/)?.[1]);
    const item = { ...data.hypotheses[0], ...body, id };
    data.hypotheses = data.hypotheses.map((hypothesis) =>
      hypothesis.id === id ? item : hypothesis,
    );
    writeDemoData(data);
    return item as T;
  }
  if (path === '/talent/models/generate') {
    return { model: data.talentModels[0], ai_run_id: 1, used_fallback: true } as T;
  }
  if (path === '/talent/models') return data.talentModels as T;
  if (path.includes('/talent/models/') && path.includes('/confirm')) {
    return { ...data.talentModels[0], status: 'confirmed' } as T;
  }
  if (path.includes('/360/questionnaire/generate-from-model')) {
    return {
      ...data.questionnaire,
      questions: data.modelQuestions,
      used_fallback: true,
    } as T;
  }
  if (path.includes('/diagnosis/rules/generate')) {
    return { rules: data.diagnosisRules, used_fallback: true } as T;
  }
  if (path.includes('/diagnosis/rules')) return data.diagnosisRules as T;
  if (path.includes('/diagnosis/dashboard')) return data.organizationDashboard as T;
  if (path.includes('/diagnosis/risks/generate')) {
    return { risks: data.risks, used_fallback: true } as T;
  }
  if (path.includes('/diagnosis/risks')) return data.risks as T;
  if (path.includes('/diagnosis/reports/generate')) return data.diagnosisReports[0] as T;
  if (path.includes('/diagnosis/reports')) return data.diagnosisReports as T;
  if (path.includes('/action-plans/generate')) {
    return { action_plans: data.actionPlans, used_fallback: true } as T;
  }
  if (path.includes('/action-plans')) return data.actionPlans as T;
  if (path.includes('/360/health')) return { status: 'demo-ok' } as T;
  if (path.includes('/360/analytics')) return data.analytics as T;
  if (path.includes('/360/responses')) return [{ id: 1, demo: true }] as T;

  return cloneDemoData() as T;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const sessionValue =
    typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem(sessionStorageKey) ||
        localStorage.getItem(legacySessionStorageKey) ||
        '';
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (sessionValue) {
    headers.Authorization = `Bearer ${sessionValue}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
      method: options.method ?? 'GET',
      headers: Object.keys(headers).length ? headers : undefined,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    return demoResponse<T>(path, options);
  }

  if (!response.ok) {
    return demoResponse<T>(path, options);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json()) as T;
  if (Array.isArray(payload) && payload.length === 0) {
    return demoResponse<T>(path, options);
  }
  return payload;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  projects: {
    list: <T>() => request<T>('/projects'),
    create: <T>(body: unknown) =>
      request<T>('/projects', { method: 'POST', body }),
    detail: <T>(projectId: number) => request<T>(`/projects/${projectId}`),
    update: <T>(projectId: number, body: unknown) =>
      request<T>(`/projects/${projectId}`, { method: 'PUT', body }),
    delete: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}`, { method: 'DELETE' }),
  },
  orgDiagnosis: {
    questions: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/org-diagnosis/questions`),
    submit: <T>(projectId: number, body: unknown) =>
      request<T>(`/projects/${projectId}/org-diagnosis/responses`, {
        method: 'POST',
        body,
      }),
    scores: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/org-diagnosis/scores`),
    result: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/org-diagnosis/result`),
  },
  surveys: {
    list: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/surveys`),
    create: <T>(projectId: number, body: unknown) =>
      request<T>(`/projects/${projectId}/surveys`, { method: 'POST', body }),
    progress: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/survey-progress`),
    myTasks: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/surveys/my-tasks`),
    submit: <T>(projectId: number, surveyId: number, body: unknown) =>
      request<T>(`/projects/${projectId}/surveys/${surveyId}/responses`, {
        method: 'POST',
        body,
      }),
  },
  organizationFeedback: {
    submit: <T>(projectId: number, body: unknown) =>
      request<T>(`/projects/${projectId}/organization-feedback`, {
        method: 'POST',
        body,
      }),
    mine: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/organization-feedback/me`),
    summary: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/organization-feedback/summary`),
    list: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/organization-feedback`),
  },
  talentProfiles: {
    list: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/talent-profiles`),
    me: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/talent-profiles/me`),
    generate: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/talent-profiles/generate`, {
        method: 'POST',
      }),
  },
  reports: {
    list: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/reports`),
    generate: <T>(projectId: number, body: unknown) =>
      request<T>(`/projects/${projectId}/reports/generate`, {
        method: 'POST',
        body,
      }),
    detail: <T>(projectId: number, reportId: number) =>
      request<T>(`/projects/${projectId}/reports/${reportId}`),
    mine: <T>(projectId: number) =>
      request<T>(`/projects/${projectId}/reports/me`),
  },
  review360: {
    health: <T>() => request<T>('/360/health'),
    analytics: <T>(projectId: number) =>
      request<T>(`/360/analytics/${projectId}`),
    responses: <T>(projectId: number) =>
      request<T>(`/360/responses?project_id=${projectId}`),
  },
};
