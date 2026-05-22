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

  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method: options.method ?? 'GET',
    headers: Object.keys(headers).length ? headers : undefined,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the HTTP status text when the backend returns no JSON body.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
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
