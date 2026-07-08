import { json, handleOptions, listDir, getJSON, checkAdmin } from '../../_lib.js';
export async function onRequestOptions() { return handleOptions(); }
export async function onRequestGet({ request, env }) {
  try {
    if (!checkAdmin(request, env)) return json({ ok:false, error:'Unauthorized' }, 401);
    const files = await listDir(env, 'data/submissions/pending');
    const items = [];
    for (const f of files.filter(x => x.name.endsWith('.json'))) {
      const { value } = await getJSON(env, f.path, null);
      if (value) items.push(value);
    }
    items.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    return json({ ok:true, items });
  } catch (e) { return json({ ok:false, error:e.message }, 500); }
}
