import { listDir, getJSON, putJSON } from './_lib.js';

export function normalizePublished(pub) {
  return {
    adds: Array.isArray(pub?.adds) ? pub.adds : [],
    edits: pub?.edits && typeof pub.edits === 'object' ? pub.edits : {},
    deletes: Array.isArray(pub?.deletes) ? pub.deletes : []
  };
}

function clone(value) { return JSON.parse(JSON.stringify(value || {})); }
function recordTime(record) {
  return new Date(record?.reviewedAt || record?.createdAt || record?.submittedAt || 0).getTime() || 0;
}

export function applyRecordToPublished(pub, record) {
  const next = normalizePublished(pub);
  const ch = record?.change || {};
  if (ch.status && ch.status !== 'approved') return next;

  if (ch.kind === 'new') {
    const item = clone(ch.newData);
    item.id = String(item.id || '').startsWith('add-') || !item.id ? record.id : item.id;
    item.section = item.section || ch.section || 'New Earth';
    next.deletes = next.deletes.filter(id => id !== item.id);
    delete next.edits[item.id];
    next.adds = next.adds.filter(x => x && x.id !== item.id).concat(item);
  } else if (ch.kind === 'edit' && ch.targetId) {
    const updated = clone(ch.newData || {});
    updated.id = updated.id || ch.targetId;
    next.edits[ch.targetId] = updated;
    next.deletes = next.deletes.filter(id => id !== ch.targetId);
    next.adds = next.adds.map(item => item?.id === ch.targetId ? updated : item);
  } else if (ch.kind === 'delete' && ch.targetId) {
    if (!next.deletes.includes(ch.targetId)) next.deletes.push(ch.targetId);
    delete next.edits[ch.targetId];
    next.adds = next.adds.filter(item => item?.id !== ch.targetId);
  }
  return next;
}

export async function mergeAcceptedRecords(env, basePublished) {
  let next = normalizePublished(basePublished);
  const files = await listDir(env, 'data/submissions/accepted');
  const records = [];
  for (const f of files.filter(x => x.name && x.name.endsWith('.json'))) {
    const file = await getJSON(env, f.path, null);
    if (file.value) records.push(file.value);
  }
  records.sort((a, b) => recordTime(a) - recordTime(b));
  records.forEach(record => { next = applyRecordToPublished(next, record); });
  return next;
}

export async function getStoredPublished(env) {
  return getJSON(env, 'data/published.json', { adds: [], edits: {}, deletes: [] });
}

export async function ensureRecordPublished(env, record, idForMessage = '') {
  const publishedFile = await getStoredPublished(env);
  const nextPublished = applyRecordToPublished(publishedFile.value, record);
  await putJSON(env, 'data/published.json', nextPublished, `chore: update published data ${idForMessage || record?.id || 'record'}`, publishedFile.sha);
  return nextPublished;
}
