import { json, handleOptions, getJSON, putJSON, deleteFile, checkAdmin, publicLogFromRecord } from '../../_lib.js';
import { ensureRecordPublished } from '../../_published.js';

export async function onRequestOptions() { return handleOptions(); }
export async function onRequestPost({ request, env }) {
  try {
    if (!checkAdmin(request, env)) return json({ ok:false, error:'Unauthorized' }, 401);
    const { id, decision } = await request.json();
    if (!id || !['approved','rejected'].includes(decision)) return json({ ok:false, error:'参数不完整' }, 400);
    const pendingPath = `data/submissions/pending/${id}.json`;
    const pending = await getJSON(env, pendingPath, null);
    if (!pending.value || !pending.sha) return json({ ok:false, error:'找不到这条 pending 投稿' }, 404);
    const record = pending.value;
    record.reviewedAt = new Date().toISOString();
    record.change = record.change || {};
    record.change.status = decision;
    record.change.reviewedAt = record.reviewedAt;
    if (decision === 'approved') {
      await putJSON(env, `data/submissions/accepted/${id}.json`, record, `chore: accept submission ${id}`);
      await ensureRecordPublished(env, record, id);
      const logsFile = await getJSON(env, 'data/recent-changes.json', []);
      const logs = Array.isArray(logsFile.value) ? logsFile.value : [];
      const log = publicLogFromRecord(record);
      const nextLogs = [log, ...logs.filter(x => x.id !== log.id)].slice(0, 500);
      await putJSON(env, 'data/recent-changes.json', nextLogs, `chore: update recent changes ${id}`, logsFile.sha);
    }
    await deleteFile(env, pendingPath, pending.sha, `chore: remove pending ${id}`);
    return json({ ok:true, id, decision });
  } catch (e) { return json({ ok:false, error:e.message }, 500); }
}
