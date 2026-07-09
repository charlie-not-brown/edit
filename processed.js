import { json, handleOptions, getJSON, putJSON, checkAdmin } from '../../_lib.js';
export async function onRequestOptions() { return handleOptions(); }
export async function onRequestPost({ request, env }) {
  try {
    if (!checkAdmin(request, env)) return json({ ok:false, error:'Unauthorized' }, 401);
    const { id } = await request.json();
    if (!id) return json({ ok:false, error:'缺少 id' }, 400);
    const file = await getJSON(env, 'data/recent-changes.json', []);
    const logs = Array.isArray(file.value) ? file.value : [];
    const next = logs.filter(x => x.id !== id);
    await putJSON(env, 'data/recent-changes.json', next, `chore: delete recent change ${id}`, file.sha);
    return json({ ok:true });
  } catch (e) { return json({ ok:false, error:e.message }, 500); }
}
