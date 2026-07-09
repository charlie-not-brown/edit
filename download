import { json, handleOptions } from '../_lib.js';
import { getStoredPublished, mergeAcceptedRecords, normalizePublished } from '../_published.js';

export async function onRequestOptions() { return handleOptions(); }
export async function onRequestGet({ env }) {
  try {
    const { value } = await getStoredPublished(env);
    const published = await mergeAcceptedRecords(env, value);
    return json({ ok: true, published: normalizePublished(published) });
  } catch (e) {
    return json({ ok: false, error: e.message, published: { adds: [], edits: {}, deletes: [] } }, 500);
  }
}
