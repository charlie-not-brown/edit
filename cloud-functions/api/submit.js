import { json, handleOptions, putJSON, requireEnv } from '../_lib.js';

function cleanIdPart(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80);
}
function stripPrivateContributor(c = {}) {
  return {
    name: c.anonymous ? '匿名贡献者' : (c.name || '未署名贡献者'),
    avatar: c.anonymous ? '' : (c.avatar || ''),
    anonymous: !!c.anonymous,
    show: !c.anonymous && !!c.show
  };
}
function textOf(v) {
  if (Array.isArray(v)) return v.join('、');
  return String(v || '').replace(/<[^>]+>/g, '').slice(0, 500);
}
function targetName(ch) {
  return ch.kind === 'new' ? (ch.newData?.name || '未命名新条目') : (ch.oldData?.name || ch.targetId || '未命名条目');
}
function kindText(k) { return k === 'new' ? '新增' : (k === 'delete' ? '删除' : '修改'); }
function summaryLine(ch) {
  if (ch.kind === 'new') return `【新增】${targetName(ch)}\n位置：${ch.position?.afterName || '开头'} 之后${ch.position?.beforeName ? '，' + ch.position.beforeName + ' 之前' : ''}`;
  if (ch.kind === 'delete') return `【删除】${targetName(ch)}`;
  const fields = (ch.fields || []).join('、') || '字段';
  return `【修改】${targetName(ch)}\n字段：${fields}`;
}
function detailBlock(ch) {
  if (ch.kind === 'new') {
    const d = ch.newData || {};
    return `${summaryLine(ch)}\n名称：${textOf(d.name)}\n传送门：${textOf(d.portal)}\n重要性：${textOf(d.importance)}\n汉化：${textOf(d.hanhua)}\n关系性：${textOf(d.relations)}\n备注：${textOf(d.notes)}\n页面内容：${textOf(d.pageContentRaw || d.pageContent)}`;
  }
  if (ch.kind === 'delete') return summaryLine(ch);
  const lines = [summaryLine(ch)];
  (ch.fields || []).forEach(f => lines.push(`${f}\n旧：${textOf(ch.oldData?.[f])}\n新：${textOf(ch.newData?.[f])}`));
  return lines.join('\n');
}
async function notifyFeishu(env, sub, records) {
  if (!env.FEISHU_WEBHOOK) return;
  const contributor = stripPrivateContributor(sub.contributor || {});
  const title = `小提漫画库有新提交：${sub.id}`;
  const text = [
    title,
    `提交时间：${new Date(sub.createdAt || Date.now()).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
    `贡献者：${contributor.anonymous ? '匿名' : contributor.name}`,
    `改动概览：${records.map(r => kindText(r.change.kind)).join('、')}`,
    '',
    records.map(r => `# ${r.id}\n${detailBlock(r.change)}`).join('\n\n---\n\n')
  ].join('\n');
  await fetch(env.FEISHU_WEBHOOK, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } })
  });
}

export async function onRequestOptions() { return handleOptions(); }
export async function onRequestPost({ request, env }) {
  try {
    requireEnv(env, ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO']);
    const sub = await request.json();
    if (!sub || !sub.id || !Array.isArray(sub.changes) || !sub.changes.length) return json({ ok:false, error:'没有可提交的修改' }, 400);
    const contributor = stripPrivateContributor(sub.contributor || {});
    const records = sub.changes.map((change, index) => {
      const id = cleanIdPart(change.changeId || `${sub.id}-${index + 1}`);
      return {
        id,
        submissionId: sub.id,
        createdAt: sub.createdAt || new Date().toISOString(),
        contributor,
        change: { ...change, changeId: id, status: 'pending' },
        colors: sub.colors || {},
        options: sub.options || {}
      };
    });
    for (const record of records) {
      await putJSON(env, `data/submissions/pending/${record.id}.json`, record, `chore: new submission ${record.id}`);
    }
    await notifyFeishu(env, sub, records);
    return json({ ok:true, id: sub.id, changes: records.map(r => r.id) });
  } catch (e) {
    return json({ ok:false, error:e.message || '提交失败' }, 500);
  }
}
