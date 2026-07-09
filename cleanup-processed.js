const API_VERSION = '2022-11-28';

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-secret'
    }
  });
}

export function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,x-admin-secret'
    }
  });
}

export function requireEnv(env, keys) {
  const missing = keys.filter(k => !env?.[k]);
  if (missing.length) throw new Error('缺少环境变量：' + missing.join(', '));
}

function ghBase(env) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  return `https://api.github.com/repos/${owner}/${repo}/contents`;
}

function branch(env) { return env.GITHUB_BRANCH || 'main'; }

function encodeBase64(text) {
  return Buffer.from(String(text), 'utf8').toString('base64');
}
function decodeBase64(text) {
  return Buffer.from(String(text || '').replace(/\n/g, ''), 'base64').toString('utf8');
}

async function ghFetch(env, path, init = {}) {
  requireEnv(env, ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);
  const method = init.method || 'GET';
  const url = `${ghBase(env)}/${path.replace(/^\/+/, '')}${method === 'GET' ? `?ref=${encodeURIComponent(branch(env))}` : ''}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'accept': 'application/vnd.github+json',
      'authorization': `Bearer ${env.GITHUB_TOKEN}`,
      'x-github-api-version': API_VERSION,
      'user-agent': 'timdrake-edit-bot',
      ...(init.headers || {})
    }
  });
  if (res.status === 404) return { ok: false, status: 404 };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `GitHub API ${res.status}`);
  return { ok: true, status: res.status, data };
}

export async function listDir(env, path) {
  const res = await ghFetch(env, path, { method: 'GET' });
  if (!res.ok) return [];
  return Array.isArray(res.data) ? res.data : [];
}

export async function getFile(env, path) {
  const res = await ghFetch(env, path, { method: 'GET' });
  if (!res.ok) return null;
  const text = decodeBase64(res.data.content || '');
  return { text, sha: res.data.sha, path: res.data.path };
}

export async function getJSON(env, path, fallback = null) {
  const file = await getFile(env, path);
  if (!file) return { value: fallback, sha: null };
  try { return { value: JSON.parse(file.text), sha: file.sha }; }
  catch (e) { return { value: fallback, sha: file.sha }; }
}

export async function putFile(env, path, content, message, sha) {
  const body = { message, content: encodeBase64(content), branch: branch(env) };
  if (sha) body.sha = sha;
  const res = await ghFetch(env, path, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.data;
}

export async function putJSON(env, path, value, message, sha) {
  return putFile(env, path, JSON.stringify(value, null, 2) + '\n', message, sha);
}

export async function deleteFile(env, path, sha, message) {
  if (!sha) return null;
  const res = await ghFetch(env, path, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, sha, branch: branch(env) })
  });
  return res.data;
}

export function checkAdmin(request, env) {
  const got = request.headers.get('x-admin-secret') || '';
  return got && env.ADMIN_SECRET && got === env.ADMIN_SECRET;
}

export function publicLogFromRecord(record) {
  const ch = record.change || {};
  const contributor = record.contributor || {};
  return {
    id: record.id,
    submissionId: record.submissionId,
    createdAt: new Date().toISOString(),
    submittedAt: record.createdAt || '',
    contributor: {
      name: contributor.anonymous ? '匿名贡献者' : (contributor.name || '未署名贡献者'),
      avatar: contributor.anonymous ? '' : (contributor.avatar || ''),
      anonymous: !!contributor.anonymous,
      show: !contributor.anonymous && !!contributor.show
    },
    change: ch
  };
}

export function isOlderThan(record, days) {
  const base = record.reviewedAt || record.createdAt || record.submittedAt;
  if (!base) return false;
  const t = new Date(base).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t > days * 24 * 60 * 60 * 1000;
}
