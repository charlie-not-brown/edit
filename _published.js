import { json, handleOptions, getJSON } from '../_lib.js';
export async function onRequestOptions() { return handleOptions(); }
export async function onRequestGet({ env }) {
  try {
    const { value } = await getJSON(env, 'data/recent-changes.json', []);
    return json({ ok:true, logs: Array.isArray(value) ? value : [] });
  } catch (e) { return json({ ok:false, error:e.message, logs:[] }, 500); }
}
