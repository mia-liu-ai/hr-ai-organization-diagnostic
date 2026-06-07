const baseUrl = (process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8008').replace(
  /\/$/,
  '',
);
const api = `${baseUrl}/api`;

async function readJson(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    headers: options.headers,
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: response.ok, status: response.status, data };
}

function countOf(value) {
  if (Array.isArray(value)) return value.length;
  if (value?.dimensions && Array.isArray(value.dimensions)) {
    return value.dimensions.length;
  }
  return value ? 1 : 0;
}

async function main() {
  console.log(`Demo smoke target: ${api}`);
  let authHeaders = {};

  const login = await readJson('/auth/login', {
    method: 'POST',
    body: { username: 'admin', loginCode: 'demo' },
    headers: { 'Content-Type': 'application/json' },
  }).catch((error) => ({ ok: false, status: 'network', data: error.message }));

  if (login.ok) {
    const token = login.data?.sessionValue || login.data?.token;
    if (token) authHeaders = { Authorization: `Bearer ${token}` };
    console.log('login: OK');
  } else {
    console.log(`login: unavailable (${login.status}); frontend will use demoData fallback`);
  }

  const checks = [
    ['projects', '/projects'],
    ['diagnosis hypotheses', '/diagnosis/hypotheses'],
    ['questionnaire', '/projects/101/questionnaire'],
  ];

  for (const [label, path] of checks) {
    const result = await readJson(path, { headers: authHeaders }).catch((error) => ({
      ok: false,
      status: 'network',
      data: error.message,
    }));
    if (!result.ok) {
      console.log(`${label}: unavailable (${result.status}); frontend will use demoData fallback`);
      continue;
    }
    const count = countOf(result.data);
    if (count === 0) {
      console.log(`${label}: empty; frontend will use demoData fallback`);
    } else {
      console.log(`${label}: OK (${count})`);
    }
  }
}

main().catch((error) => {
  console.error('demo-smoke failed:', error);
  process.exitCode = 1;
});
