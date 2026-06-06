import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const baseUrl = (process.env.API_BASE_URL || 'http://127.0.0.1:8008').replace(
  /\/$/,
  '',
);
const username = process.env.VERIFY_USERNAME || 'admin';
const password = process.env.VERIFY_PASSWORD || 'admin123';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function request(route, options = {}) {
  const response = await fetch(`${baseUrl}/api${route}`, options);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${options.method || 'GET'} ${route} failed: ${
        payload?.detail || response.statusText
      }`,
    );
  }
  return payload;
}

async function verifySourceDoesNotCollapseHypotheses() {
  const appSource = await readFile(path.join(repoRoot, 'src', 'App.tsx'), 'utf8');
  const backendSource = await readFile(
    path.join(repoRoot, 'backend', 'app', 'main.py'),
    'utf8',
  );
  const databaseSource = await readFile(
    path.join(repoRoot, 'backend', 'app', 'database.py'),
    'utf8',
  );
  const forbiddenPatterns = [
    ['frontend confirmedHypotheses[0]', /confirmedHypotheses\s*\[\s*0\s*\]/],
    ['frontend single-item slice', /\.slice\(\s*0\s*,\s*1\s*\)/],
    [
      'talent generation singular payload',
      /\/talent\/models\/generate[\s\S]{0,900}hypothesis_id\s*:/,
    ],
    [
      'backend talent singular fallback',
      /payload\.hypothesis_ids\s+or\s+\(\[payload\.hypothesis_id\]/,
    ],
    [
      'legacy 360 generation singular payload',
      /\/360\/questionnaire\/generate-from-model[\s\S]{0,500}hypothesis_id\s*:/,
    ],
    [
      'legacy 360 backend singular contract',
      /class QuestionnaireFromModelPayload[\s\S]{0,200}hypothesis_id:\s*int/,
    ],
  ];
  const failures = forbiddenPatterns
    .filter(([, pattern]) =>
      pattern.test(`${appSource}\n${backendSource}\n${databaseSource}`),
    )
    .map(([label]) => label);
  if (!appSource.includes('/diagnostic-inputs')) {
    failures.push('diagnostic input list is not separated from hypothesis list');
  }
  if (
    !databaseSource.includes('CREATE TABLE IF NOT EXISTS diagnostic_inputs') ||
    !databaseSource.includes('CREATE TABLE IF NOT EXISTS diagnosis_hypotheses')
  ) {
    failures.push('diagnostic inputs and hypotheses do not have separate tables');
  }
  if (failures.length) {
    throw new Error(
      `Static multi-hypothesis audit failed: ${failures.join(', ')}`,
    );
  }
}

await verifySourceDoesNotCollapseHypotheses();
console.log('Static multi-hypothesis audit: passed');

if (process.env.STATIC_ONLY === '1') {
  process.exit(0);
}

const login = await request('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password }),
});
const headers = { Authorization: `Bearer ${login.sessionValue}` };
const projects = await request('/projects', { headers });
const requestedProjectId = Number(process.env.PROJECT_ID || 0);
const selectedProjects = requestedProjectId
  ? projects.filter((item) => item.id === requestedProjectId)
  : projects;

if (!selectedProjects.length) {
  throw new Error('No project is available for workflow verification.');
}

for (const project of selectedProjects) {
  const [allHypotheses, confirmedHypotheses, surveys] = await Promise.all([
    request(`/projects/${project.id}/diagnosis-hypotheses`, { headers }),
    request(
      `/projects/${project.id}/diagnosis-hypotheses?status=confirmed`,
      { headers },
    ),
    request(`/projects/${project.id}/surveys`, { headers }),
  ]);

  console.log(`Project: ${project.name} (${project.id})`);
  console.log(`all_hypotheses_count=${allHypotheses.length}`);
  console.log(`confirmed_count=${confirmedHypotheses.length}`);
  for (const hypothesis of allHypotheses) {
    console.log(
      `- id=${hypothesis.id} status=${hypothesis.status} title=${
        hypothesis.title || 'Untitled hypothesis'
      }`,
    );
  }
  console.log(`surveys_count=${surveys.length}`);

  const hypothesisIds = allHypotheses.map((item) => item.id);
  if (new Set(hypothesisIds).size !== hypothesisIds.length) {
    throw new Error(
      `Project ${project.id} hypotheses do not have unique independent IDs.`,
    );
  }
  if (allHypotheses.some((item) => item.project_id !== project.id)) {
    throw new Error(`Project ${project.id} contains cross-project hypotheses.`);
  }
  if (
    confirmedHypotheses.some(
      (item) => item.project_id !== project.id || item.status !== 'confirmed',
    )
  ) {
    throw new Error(
      `Project ${project.id} confirmed endpoint returned invalid data.`,
    );
  }
  if (confirmedHypotheses.length > allHypotheses.length) {
    throw new Error(
      `Project ${project.id} confirmed count exceeds all hypothesis count.`,
    );
  }

  if (!surveys[0]) continue;
  const detail = await request(
    `/projects/${project.id}/surveys/${surveys[0].id}`,
    { headers },
  );
  console.log(`First survey questions: ${detail.questions.length}`);
  if (
    detail.questions.some(
      (question) =>
        question.project_id !== project.id ||
        question.survey_id !== detail.id,
    )
  ) {
    throw new Error('Survey questions contain invalid project or survey links.');
  }
}
