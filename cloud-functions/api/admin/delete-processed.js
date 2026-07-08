import { json, handleOptions, getJSON, deleteFile, checkAdmin } from '../../_lib.js';

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost({ request, env }) {
  try {
    if (!checkAdmin(request, env)) return json({ ok:false, error:'Unauthorized' }, 401);
    const { id } = await request.json();
    if (!id) return json({ ok:false, error:'缺少 id' }, 400);
    const path = `data/submissions/accepted/${id}.json`;
    const file = await getJSON(env, path, null);
    if (!file.value || !file.sha) return json({ ok:false, error:'找不到这条已处理申请' }, 404);
    await deleteFile(env, path, file.sha, `chore: delete processed submission ${id}`);
    return json({ ok:true, id });
  } catch (e) { return json({ ok:false, error:e.message }, 500); }
}
