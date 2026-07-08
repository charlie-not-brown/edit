import { json, handleOptions, listDir, getJSON, deleteFile, checkAdmin, isOlderThan } from '../../_lib.js';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost({ request, env }) {
  try {
    if (!checkAdmin(request, env)) return json({ ok:false, error:'Unauthorized' }, 401);
    const body = await request.json().catch(() => ({}));
    const days = Math.max(1, Number(body.days || env.PROCESSED_RETENTION_DAYS || 30));
    const files = await listDir(env, 'data/submissions/accepted');
    const deleted = [];
    for (const f of files.filter(x => x.name.endsWith('.json'))) {
      const file = await getJSON(env, f.path, null);
      if (file.value && file.sha && isOlderThan(file.value, days)) {
        await deleteFile(env, f.path, file.sha, `chore: cleanup processed submission ${file.value.id || f.name}`);
        deleted.push(file.value.id || f.name);
      }
    }
    return json({ ok:true, days, deleted, count: deleted.length });
  } catch (e) { return json({ ok:false, error:e.message }, 500); }
}
