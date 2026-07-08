(function(){
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const BASE_SOURCE=window.COMIC_DATA||[];
  const STORAGE_SUB='td_contrib_submissions_v5';
  const STORAGE_DRAFT='td_contrib_draft_v5';
  const STORAGE_OPT='td_contrib_tag_options_v5';
  const STORAGE_COLORS='td_contrib_tag_colors_v5';
  const STORAGE_PUBLISHED='td_contrib_published_v11';
  const fields=['name','portal','importance','hanhua','relations','notes','pageContent'];
  const fieldLabels={name:'名称',portal:'传送门',importance:'重要性',hanhua:'汉化',relations:'关系性',notes:'备注',pageContent:'页面内容'};
  const tagFields=['importance','hanhua','relations'];
  const palette=['default','gray','brown','orange','yellow','green','blue','purple','pink','red'];

  const SECTION_ORDER=['New Earth','Prime Earth','其他','Other'];
  function sectionRank(section){
    const index=SECTION_ORDER.indexOf(section);
    return index===-1?999:index;
  }
  let published=loadJSON(STORAGE_PUBLISHED,{adds:[],edits:{},deletes:[]});
  published.adds=published.adds||[]; published.edits=published.edits||{}; published.deletes=published.deletes||[];
  let BASE=applyPublished(BASE_SOURCE,published);
  const derived=deriveTagDefaults(BASE);
  let colors={...derived.colors,...loadJSON(STORAGE_COLORS,window.TAG_COLORS||{})};
  let options=mergeOptions(derived.options,loadJSON(STORAGE_OPT,window.TAG_OPTIONS||{}));
  let draft=loadJSON(STORAGE_DRAFT,{edits:{},adds:[],deletes:[]});
  draft.edits=draft.edits||{}; draft.adds=draft.adds||[]; draft.deletes=draft.deletes||[];
  let currentSection=(sections()[0]||'New Earth');
  let currentView='table';
  let activeTag=null;
  let currentQuery='';
  const sectionIcons={
    'New Earth':'https://i.ibb.co/zWCN08VC/085-F0199-6-C90-44-AA-92-B2-C9668-C494876.gif',
    'Prime Earth':'https://i.ibb.co/gLBFFvWM/49-EDC184-DF93-4-D7-A-96-AB-EE9-BA97454-A9.gif',
    '其他':'https://i.ibb.co/wFHVNpQT/383-BEE81-4153-44-B9-99-C2-528-F92-E00-CC0.gif'
  };

  function loadJSON(k,fallback){try{return JSON.parse(localStorage.getItem(k))||fallback}catch(e){return fallback}}
  function saveJSON(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function mergeOptions(base,extra){
    const out={importance:[...(base.importance||[])],hanhua:[...(base.hanhua||[])],relations:[...(base.relations||[])]};
    Object.keys(extra||{}).forEach(k=>{out[k]=[...new Set([...(out[k]||[]),...((extra||{})[k]||[])])]});
    return out;
  }
  function deriveTagDefaults(data){
    const options={importance:[],hanhua:[],relations:[]};
    (data||[]).forEach(it=>tagFields.forEach(f=>(it[f]||[]).forEach(t=>{if(t&&!options[f].includes(t))options[f].push(t)})));
    const known={
      '出场':'gray','主要出场':'blue','重要故事':'purple','大事件':'red',
      '已汉化':'green','无汉化':'gray','汉化不全':'orange','已出版':'blue',
      'Bruce':'gray','Cass':'brown','Steph':'orange','Dick':'blue','Kon':'red','Helena':'purple','Barbara':'pink','YJ':'yellow','TT':'green','Cassie':'orange','Diana':'red','Damian':'purple','Kara':'blue','Jason':'red','Alfred':'brown','Clark':'blue'
    };
    const colors={}; let i=0;
    Object.values(options).flat().forEach(t=>{colors[t]=known[t]||palette[i++%palette.length]});
    return {options,colors};
  }
  function applyPublished(source,pub){
    const deletes=new Set(pub?.deletes||[]);
    let base=(source||[]).filter(x=>!deletes.has(x.id)).map(x=>pub?.edits?.[x.id]?{...clone(pub.edits[x.id]),_publishedEdit:true}:clone(x));
    (pub?.adds||[]).forEach(a=>{if(a&&!base.some(x=>x.id===a.id))base.push(clone(a))});
    return base.sort((a,b)=>sectionRank(a.section)-sectionRank(b.section) || ((a.order||0)-(b.order||0)));
  }
  function sameVal(a,b){return JSON.stringify(a??'')===JSON.stringify(b??'')}
  function hasDiff(base,item){return fields.some(f=>!sameVal(base?.[f],item?.[f]))}
  function setEdit(id,patch){
    const base=getBase(id);
    const merged={...clone(base),...(draft.edits[id]||{}),...patch};
    if(!base || !hasDiff(base,merged)) delete draft.edits[id];
    else draft.edits[id]=merged;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function clone(o){return JSON.parse(JSON.stringify(o||{}))}
  function getSubs(){return loadJSON(STORAGE_SUB,[])}
  function setSubs(v){saveJSON(STORAGE_SUB,v)}
  function saveDraft(){saveJSON(STORAGE_DRAFT,draft);saveJSON(STORAGE_OPT,options);saveJSON(STORAGE_COLORS,colors)}
  function getBase(id){return BASE.find(x=>x.id===id)}
  function sections(){
    const found=[...new Set(BASE.map(x=>x.section))];
    return SECTION_ORDER.filter(section=>found.includes(section)).concat(found.filter(section=>!SECTION_ORDER.includes(section)));
  }
  function tagColor(t){return colors[t]||'default'}
  function tag(t,removable=false){return `<span class="tag tag-${tagColor(t)}">${esc(t)}${removable?`<span class="x" data-remove-tag="${esc(t)}">×</span>`:''}</span>`}
  function tags(arr,removable=false){return (arr&&arr.length)?arr.map(x=>tag(x,removable)).join(''):'<span class="empty">空</span>'}
  function portalLabel(it){
    const p=(it.portal||'').trim();
    if(!p) return '<span class="empty">空</span>';
    const md=p.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
    if(md) return `<a class="portal-link portal-md" target="_blank" href="${esc(md[2])}">${esc(md[1])}</a>`;
    if(/^https?:\/\//i.test(p)) return `<a class="portal-link" target="_blank" href="${esc(p)}">打开链接</a>`;
    return `<span class="portal-short">${esc(p)}</span>`;
  }
  function itemData(id){
    if(id&&id.startsWith('add-')) return (draft.adds||[]).find(a=>a.id===id)?.data;
    return draft.edits[id] || getBase(id);
  }
  function mergedSectionItems(section=currentSection){
    draft.deletes=draft.deletes||[];
    const base=BASE.filter(x=>x.section===section).sort((a,b)=>(a.order||0)-(b.order||0));
    let out=[];
    const topAdds=(draft.adds||[]).filter(a=>a.section===section&&!a.afterId);
    topAdds.forEach(a=>out.push({...a.data,_new:true}));
    base.forEach((b,i)=>{
      const deleted=draft.deletes.includes(b.id);
      out.push(draft.edits[b.id]?{...draft.edits[b.id],_changed:true,_deleted:deleted}: {...b,_deleted:deleted});
      (draft.adds||[]).filter(a=>a.section===section&&a.afterId===b.id).forEach(a=>out.push({...a.data,_new:true}));
    });
    return out;
  }
  function currentData(){
    let items=mergedSectionItems();
    const q=currentQuery.trim().toLowerCase();
    if(q){items=items.filter(it=>[it.name,it.portal,it.notes,it.pageContentRaw,it.pageContent,...(it.importance||[]),...(it.hanhua||[]),...(it.relations||[])].join(' ').toLowerCase().includes(q));}
    return items;
  }
  function cellChanged(it,field){
    if(it._new) return true;
    const base=getBase(it.id); if(!base) return false;
    return JSON.stringify(base[field]||'')!==JSON.stringify(it[field]||'');
  }
  function updateItem(id,patch){
    if(id.startsWith('add-')){const a=draft.adds.find(x=>x.id===id); if(a)a.data={...a.data,...patch};}
    else setEdit(id,patch);
    saveDraft(); render();
  }
  function init(){
    renderTabs(); bindGlobal(); render();
  }
  function renderTabs(){
    $('#pageTitle').textContent=currentSection;
    $('#sectionTabs').innerHTML=sections().map(sec=>`<button class="tab-btn ${sec===currentSection?'active':''}" data-section="${esc(sec)}">${sectionIcons[sec]?`<img class="section-icon" src="${sectionIcons[sec]}" alt="" />`:''}${esc(sec)}</button>`).join('');
    $$('.tab-btn').forEach(b=>b.onclick=()=>{currentSection=b.dataset.section; activeTag=null; renderTabs(); render();});
  }
  function bindGlobal(){
    $$('.view-chip').forEach(b=>b.onclick=()=>{currentView=b.dataset.view; $$('.view-chip').forEach(x=>x.classList.toggle('active',x===b)); render();});
    $('#searchInput').oninput=e=>{currentQuery=e.target.value; render();};
    $('#openSubmitModal').onclick=()=>{resetContributorForm();$('#submitModal').hidden=false;};
    $('#closeSubmitModal').onclick=()=>$('#submitModal').hidden=true;
    $('#submitModal').addEventListener('click',e=>{if(e.target.id==='submitModal')$('#submitModal').hidden=true;});
    $('#submitWithInfo').onclick=()=>{
      const name=$('#contributorName').value.trim();
      const mode=document.querySelector('.avatar-mode.active')?.dataset.avatarMode || 'url';
      const email=mode==='email' ? $('#contributorEmail').value.trim() : '';
      const avatar=mode==='email' ? (email ? gravatar(email) : '') : $('#avatarUrl').value.trim();
      submitDraft({name:name||'未署名贡献者',avatar,email,show:!!(name||email||avatar),anonymous:false});
      resetContributorForm();
    };
    $('#submitAnonymous').onclick=()=>{submitDraft({name:'匿名贡献者',avatar:'',email:'',show:false,anonymous:true}); resetContributorForm();};
    $('#contributorEmail').addEventListener('input',updateAvatarPreview);
    $('#avatarUrl').addEventListener('input',updateAvatarPreview);
    $$('.avatar-mode').forEach(btn=>btn.onclick=()=>setAvatarMode(btn.dataset.avatarMode));
    if($('#clearDraftBtnDev')) $('#clearDraftBtnDev').onclick=()=>{draft={edits:{},adds:[],deletes:[]};saveDraft();render();};
    if($('#clearSubmissionsBtnDev')) $('#clearSubmissionsBtnDev').onclick=()=>{if(confirm('清空本地测试投稿记录？')){localStorage.removeItem(STORAGE_SUB);alert('已清空。')}};
    if($('#seedDemoSubmission')) $('#seedDemoSubmission').onclick=seedTestSubmission;
    $('#closeDetail').onclick=()=>$('#detailDrawer').hidden=true;
    $('#detailDrawer').addEventListener('click',e=>{if(e.target.id==='detailDrawer')$('#detailDrawer').hidden=true;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){activeTag=null;$('#submitModal').hidden=true;$('#detailDrawer').hidden=true;render();}});
    document.addEventListener('click',e=>{if(activeTag && !e.target.closest('.tag-editor') && !e.target.closest('[data-tag-field]')){activeTag=null; render();}});
  }
  function render(){
    if(currentView==='table'){$('#tableView').hidden=false;$('#boardView').hidden=true; renderTable();}
    else{$('#tableView').hidden=true;$('#boardView').hidden=false; renderBoard();}
    renderFloat();
  }
  function renderTable(){
    const data=currentData();
    const rows=data.map((it,idx)=>rowHTML(it,idx)).join('');
    $('#tableView').innerHTML=`<table class="notion-table"><thead><tr><th class="row-tools"></th><th class="col-name" data-col="name"><span class="prop-icon">Aa</span>名称</th><th class="col-portal" data-col="portal"><span class="prop-icon">≡</span>传送门</th><th class="col-tags" data-col="importance"><span class="prop-icon">☷</span>重要性</th><th class="col-tags" data-col="hanhua"><span class="prop-icon">◉</span>汉化</th><th class="col-tags" data-col="relations"><span class="prop-icon">☷</span>关系性</th><th class="col-notes" data-col="notes"><span class="prop-icon">≡</span>备注</th><th class="col-edit">详细页面</th><th class="col-delete"></th></tr></thead><tbody>${rows}</tbody></table>`;
    bindTable();
  }
  function trashIcon(){return '<svg class="trash-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11H7.7L7 9Zm3 2 .25 7h1.5L11.5 11H10Zm4 0-.25 7h-1.5l.25-7H14Z" fill="currentColor"/></svg>'}
  function rowHTML(it,idx){
    const cls=[it._new?'row-new':'', it._changed?'row-changed':'', it._deleted?'row-deleted':''].filter(Boolean).join(' ');
    const delBtn=it._deleted?`<button class="trash-btn undo" title="撤销删除" data-undo-delete="${esc(it.id)}">撤销</button>`:`<button class="trash-btn" title="删除此条目" data-delete-row="${esc(it.id)}">${trashIcon()}</button>`;
    return `<tr class="${cls}" data-row-id="${esc(it.id)}"><td class="row-tools"><div class="row-toolbox"><button class="row-tool" title="在这一条下方新增" data-add-after="${esc(it.id)}">＋</button></div></td><td>${textCell(it,'name')}</td><td>${textCell(it,'portal')}</td><td>${tagCell(it,'importance')}</td><td>${tagCell(it,'hanhua')}</td><td>${tagCell(it,'relations')}</td><td>${textCell(it,'notes')}</td><td><button class="mini-btn" data-detail="${esc(it.id)}">打开</button></td><td>${delBtn}</td></tr>`;
  }
  function textCell(it,field){
    const changed=cellChanged(it,field)?'changed':'';
    if(field==='portal') return `<div class="cell editable ${changed}" data-edit-field="portal" data-id="${esc(it.id)}">${portalLabel(it)}</div>`;
    const val=it[field]||'';
    return `<div class="cell editable ${changed} ${field==='name'?'name-cell':''}" data-edit-field="${field}" data-id="${esc(it.id)}">${val?esc(val):'<span class="empty">空</span>'}</div>`;
  }
  function tagCell(it,field){
    const key=it.id+':'+field;
    const changed=cellChanged(it,field)?'changed':'';
    if(activeTag===key) return `<div class="cell ${changed}">${tagEditorHTML(it,field)}</div>`;
    return `<div class="cell editable ${changed}" data-tag-field="${field}" data-id="${esc(it.id)}">${tags(it[field])}</div>`;
  }
  function bindTable(){
    $$('[data-edit-field]',$('#tableView')).forEach(el=>el.onclick=e=>{if(e.target.closest('a,button'))return; editText(el.dataset.id,el.dataset.editField);});
    $$('[data-tag-field]',$('#tableView')).forEach(el=>el.onclick=e=>{e.stopPropagation(); activeTag=el.dataset.id+':'+el.dataset.tagField; render(); setTimeout(()=>$('.tag-search')?.focus(),0);});
    $$('[data-add-after]',$('#tableView')).forEach(b=>b.onclick=e=>{e.stopPropagation(); addRowAfter(b.dataset.addAfter);});
    $$('[data-detail]',$('#tableView')).forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));
    $$('[data-delete-row]',$('#tableView')).forEach(b=>b.onclick=e=>{e.stopPropagation();deleteRow(b.dataset.deleteRow);});
    $$('[data-undo-delete]',$('#tableView')).forEach(b=>b.onclick=e=>{e.stopPropagation();undoDeleteRow(b.dataset.undoDelete);});
    bindTagEditor();
  }
  function editText(id,field){
    const el=document.querySelector(`[data-id="${CSS.escape(id)}"][data-edit-field="${field}"]`); if(!el)return;
    const it=itemData(id); const val=it[field]||'';
    const input=(field==='notes'||field==='portal')?document.createElement('textarea'):document.createElement('input');
    input.className=(field==='notes'||field==='portal')?'cell-textarea':'cell-input'; input.value=val; el.innerHTML=''; el.appendChild(input); input.focus();
    try{input.setSelectionRange(String(val).length,String(val).length)}catch(e){}
    let saved=false; const save=()=>{if(saved)return;saved=true;const nv=input.value.trim(); if(JSON.stringify(nv)===JSON.stringify(val||'')){render();return;} updateItem(id,{[field]:nv});};
    input.addEventListener('blur',save);
    input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.tagName==='INPUT'){e.preventDefault();save();} if(e.key==='Escape'){saved=true;render();}});
  }
  function tagEditorHTML(it,field){
    const vals=it[field]||[]; const opts=options[field]||[];
    return `<div class="tag-editor" data-editor-id="${esc(it.id)}" data-editor-field="${esc(field)}"><div class="tag-editor-top">${vals.map(v=>tag(v,true)).join('')}<input class="tag-search" placeholder="选择或创建一个选项" /></div><div class="tag-menu"><div class="tag-menu-title">选择或创建一个选项</div><div class="tag-menu-options">${opts.map(o=>`<button data-pick-tag="${esc(o)}"><span>${tag(o)}</span>${vals.includes(o)?'<span>✓</span>':''}</button>`).join('')}</div></div></div>`;
  }
  function bindTagEditor(){
    const editor=$('.tag-editor'); if(!editor)return;
    const id=editor.dataset.editorId, field=editor.dataset.editorField, input=$('.tag-search',editor), box=$('.tag-menu-options',editor);
    $$('[data-remove-tag]',editor).forEach(x=>x.onclick=e=>{e.stopPropagation(); const it=itemData(id); updateItem(id,{[field]:(it[field]||[]).filter(t=>t!==x.dataset.removeTag)}); activeTag=id+':'+field; setTimeout(()=>$('.tag-search')?.focus(),0);});
    function repaint(){
      const it=itemData(id), vals=it[field]||[], q=input.value.trim();
      const opts=(options[field]||[]).filter(o=>!q||o.toLowerCase().includes(q.toLowerCase()));
      const exact=(options[field]||[]).some(o=>o.toLowerCase()===q.toLowerCase());
      box.innerHTML=opts.map(o=>`<button data-pick-tag="${esc(o)}"><span>${tag(o)}</span>${vals.includes(o)?'<span>✓</span>':''}</button>`).join('')+(q&&!exact?`<button class="tag-create" data-create-tag="${esc(q)}">＋ 创建「${esc(q)}」</button>`:'');
      bindMenu();
    }
    function bindMenu(){
      $$('[data-pick-tag]',box).forEach(btn=>btn.onclick=e=>{e.stopPropagation(); const t=btn.dataset.pickTag; const it=itemData(id); const vals=it[field]||[]; updateItem(id,{[field]:vals.includes(t)?vals.filter(x=>x!==t):vals.concat(t)}); activeTag=id+':'+field; setTimeout(()=>$('.tag-search')?.focus(),0);});
      $$('[data-create-tag]',box).forEach(btn=>btn.onclick=e=>{e.stopPropagation(); const t=btn.dataset.createTag.trim(); if(!t)return; if(!(options[field]||[]).includes(t)){options[field]=(options[field]||[]).concat(t); colors[t]=palette[Object.keys(colors).length%palette.length];} const it=itemData(id); updateItem(id,{[field]:[...(it[field]||[]),t]}); activeTag=id+':'+field; saveDraft(); setTimeout(()=>$('.tag-search')?.focus(),0);});
    }
    input.oninput=repaint; bindMenu();
  }
  function addRowAfter(afterId){
    const list=mergedSectionItems();
    const idx=list.findIndex(x=>x.id===afterId);
    const after=list[idx];
    const before=list[idx+1];
    const id='add-'+Date.now();
    const order=after&&before?((after.order||0)+(before.order||0))/2:(after?(after.order||0)+1000:1);
    draft.adds.push({id,section:currentSection,afterId:after?.id||'',beforeId:before?.id||'',data:{id,section:currentSection,name:'',portal:'',importance:[],hanhua:[],relations:[],notes:'',pageContent:'',pageContentRaw:'',order}});
    saveDraft(); render(); setTimeout(()=>editText(id,'name'),30);
  }
  function deleteRow(id){
    const it=itemData(id);
    if(!it) return;
    if(!confirm(`确认将「${it.name||'未命名条目'}」标记为删除建议吗？\n提交后管理员会在后台看到这条删除申请。`)) return;
    if(id.startsWith('add-')){
      draft.adds=(draft.adds||[]).filter(a=>a.id!==id);
    }else{
      draft.deletes=draft.deletes||[];
      if(!draft.deletes.includes(id)) draft.deletes.push(id);
    }
    saveDraft(); render();
  }
  function undoDeleteRow(id){
    draft.deletes=(draft.deletes||[]).filter(x=>x!==id);
    saveDraft(); render();
  }
  function renderBoard(){
    const items=currentData(); const rels=[...(options.relations||[])];
    const cols=rels.map(r=>({tag:r,items:items.filter(x=>(x.relations||[]).includes(r))})).filter(c=>c.items.length);
    $('#boardView').innerHTML=cols.map(c=>`<div class="board-col" data-color="${tagColor(c.tag)}"><div class="board-head">${tag(c.tag)}<span class="board-count">${c.items.length}</span></div>${c.items.map(it=>`<div class="board-card"><div class="board-card-title">${esc(it.name)||'<span class="empty">未命名</span>'}</div><div class="board-card-sub">${stripHTML(portalLabel(it))}</div><div style="margin-top:7px">${tags(it.importance)}</div><button class="mini-btn" style="margin-top:8px" data-detail="${esc(it.id)}">打开</button></div>`).join('')}</div>`).join('');
    $$('[data-detail]',$('#boardView')).forEach(b=>b.onclick=()=>openDetail(b.dataset.detail));
  }
  function stripHTML(html){const d=document.createElement('div');d.innerHTML=html;return d.textContent||''}
  function openDetail(id){
    const it=itemData(id); if(!it)return;
    $('#detailTitle').textContent='详细页面'; $('#detailSubtitle').textContent=it.section||'';
    const raw=it.pageContentRaw||htmlToText(it.pageContent)||'';
    $('#detailBody').innerHTML=`<div class="notion-detail-page">
      <input class="detail-title-input" data-detail-input="name" value="${esc(it.name||'未命名条目')}" />
      <div class="detail-properties">
        <div class="detail-prop-row"><div class="detail-prop-name">☰ 传送门</div><div class="detail-prop-value"><textarea class="text-input" rows="3" data-detail-input="portal" placeholder="可填写纯文字、URL，或手动保留显示文字说明">${esc(it.portal||'')}</textarea></div></div>
        <div class="detail-prop-row"><div class="detail-prop-name">☷ 重要性</div><div class="detail-prop-value" data-detail-tags="importance">${detailTagsHTML(it,'importance')}</div></div>
        <div class="detail-prop-row"><div class="detail-prop-name">◉ 汉化</div><div class="detail-prop-value" data-detail-tags="hanhua">${detailTagsHTML(it,'hanhua')}</div></div>
        <div class="detail-prop-row"><div class="detail-prop-name">☷ 关系性</div><div class="detail-prop-value" data-detail-tags="relations">${detailTagsHTML(it,'relations')}</div></div>
        <div class="detail-prop-row"><div class="detail-prop-name">☰ 备注</div><div class="detail-prop-value"><textarea class="text-input" rows="3" data-detail-input="notes" placeholder="备注">${esc(it.notes||'')}</textarea></div></div>
      </div>
      <div class="page-content-section">
        <div class="page-content-title">页面内容</div>
        <textarea class="page-content-editor" data-detail-input="pageContentRaw" placeholder="这里对应 Notion 页面正文，可直接输入多行内容。">${esc(raw)}</textarea>
      </div>
    </div>`;
    $$('[data-detail-input]').forEach(el=>{
      const field=el.dataset.detailInput;
      const initial=field==='pageContentRaw'?raw:(it[field]||'');
      el.addEventListener('input',()=>{
        const value=el.value;
        if(field==='pageContentRaw') updateItemNoRender(id,{pageContentRaw:value,pageContent:renderMarkdownLike(value)});
        else updateItemNoRender(id,{[field]:value.trim()});
        refreshMainOnly();
      });
    });
    $$('[data-detail-tags]').forEach(box=>bindDetailTags(id,box.dataset.detailTags,box));
    $('#detailDrawer').hidden=false;
  }
  function htmlToText(html){const d=document.createElement('div');d.innerHTML=html||'';return d.textContent||''}
  function updateItemNoRender(id,patch){
    if(id.startsWith('add-')){const a=draft.adds.find(x=>x.id===id); if(a)a.data={...a.data,...patch};}
    else setEdit(id,patch);
    saveDraft(); renderFloat();
  }
  function refreshMainOnly(){
    if(currentView==='table') renderTable();
    else renderBoard();
    renderFloat();
  }
  function detailTagsHTML(it,field){return `<div class="detail-tag-edit">${(it[field]||[]).map(t=>`<span class="tag tag-${tagColor(t)}">${esc(t)}<span class="x" data-detail-remove="${esc(t)}">×</span></span>`).join('')||'<span class="empty">空</span>'}<div class="detail-tag-options">${(options[field]||[]).map(o=>`<button class="mini-btn" data-detail-add="${esc(o)}">${esc(o)}</button>`).join('')}</div><input class="text-input" style="margin-top:6px" placeholder="输入新 tag 后回车创建" data-detail-create></div>`}
  function bindDetailTags(id,field,box){
    box.onclick=e=>{const it=itemData(id); if(e.target.dataset.detailRemove){updateItemNoRender(id,{[field]:(it[field]||[]).filter(t=>t!==e.target.dataset.detailRemove)}); render(); openDetail(id);} if(e.target.dataset.detailAdd){const t=e.target.dataset.detailAdd; const vals=it[field]||[]; updateItemNoRender(id,{[field]:vals.includes(t)?vals.filter(x=>x!==t):vals.concat(t)}); render(); openDetail(id);}};
    const inp=$('[data-detail-create]',box); inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const t=inp.value.trim();if(!t)return;if(!(options[field]||[]).includes(t)){options[field]=(options[field]||[]).concat(t);colors[t]=palette[Object.keys(colors).length%palette.length];}const it=itemData(id);updateItemNoRender(id,{[field]:(it[field]||[]).concat(t)});saveDraft();render();openDetail(id);}};
  }
  function renderMarkdownLike(raw){
    const text=String(raw||'').trim();
    if(!text) return '';
    return text.split(/\n\s*\n/g).map(p=>'<p>'+esc(p).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2" target="_blank">$1</a>').replace(/\n/g,'<br>')+'</p>').join('');
  }
  function setAvatarMode(mode='url'){
    $$('.avatar-mode').forEach(b=>b.classList.toggle('active',b.dataset.avatarMode===mode));
    const url=$('#avatarUrl'), email=$('#contributorEmail');
    if(url && email){
      url.hidden = mode !== 'url';
      email.hidden = mode !== 'email';
      if(mode==='url') email.value=''; else url.value='';
    }
    updateAvatarPreview();
  }
  function resetContributorForm(){
    ['contributorName','avatarUrl','contributorEmail'].forEach(id=>{const el=$('#'+id); if(el) el.value='';});
    setAvatarMode('url');
    updateAvatarPreview();
  }
  function gravatar(email){
    const h=md5(String(email||'').trim().toLowerCase());
    return h ? `https://cravatar.cn/avatar/${h}?s=96&d=identicon` : '';
  }
  function updateAvatarPreview(){
    const img=$('#avatarPreview'); if(!img)return;
    const mode=document.querySelector('.avatar-mode.active')?.dataset.avatarMode || 'url';
    const direct=$('#avatarUrl').value.trim();
    const email=$('#contributorEmail').value.trim();
    const src=mode==='email' ? (email?gravatar(email):'') : direct;
    if(src){img.src=src; img.style.display='block';} else {img.removeAttribute('src'); img.style.display='none';}
  }
  function md5(str){
    function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b)}
    function ff(a,b,c,d,x,s,t){return cmn((b&c)|((~b)&d),a,b,x,s,t)}
    function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&(~d)),a,b,x,s,t)}
    function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
    function ii(a,b,c,d,x,s,t){return cmn(c^(b|(~d)),a,b,x,s,t)}
    function md5cycle(x,k){let a=x[0],b=x[1],c=x[2],d=x[3];
      a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330);
      a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983);
      a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162);
      a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329);
      a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302);
      a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848);
      a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501);
      a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734);
      a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556);
      a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640);
      a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189);
      a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651);
      a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055);
      a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799);
      a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649);
      a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551);
      x[0]=add32(a,x[0]);x[1]=add32(b,x[1]);x[2]=add32(c,x[2]);x[3]=add32(d,x[3]);}
    function md5blk(s){let r=[];for(let i=0;i<64;i+=4)r[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24);return r}
    function md51(s){let n=s.length,state=[1732584193,-271733879,-1732584194,271733878],i;for(i=64;i<=n;i+=64)md5cycle(state,md5blk(s.substring(i-64,i)));s=s.substring(i-64);let tail=Array(16).fill(0);for(i=0;i<s.length;i++)tail[i>>2]|=s.charCodeAt(i)<<((i%4)<<3);tail[i>>2]|=0x80<<((i%4)<<3);if(i>55){md5cycle(state,tail);tail=Array(16).fill(0)}tail[14]=n*8;md5cycle(state,tail);return state}
    function rhex(n){let s='',j;for(j=0;j<4;j++)s+=((n>>(j*8+4))&15).toString(16)+((n>>(j*8))&15).toString(16);return s}
    function hex(x){return x.map(rhex).join('')}
    function add32(a,b){return (a+b)&0xffffffff}
    return hex(md51(unescape(encodeURIComponent(str))));
  }

  function draftCounts(){return {adds:(draft.adds||[]).length,edits:Object.keys(draft.edits||{}).filter(id=>!(draft.deletes||[]).includes(id)).length,deletes:(draft.deletes||[]).length}}
  function renderFloat(){const c=draftCounts(),n=c.adds+c.edits+c.deletes;$('#changeFloat').hidden=n===0;$('#changeSummary').textContent=`新增 ${c.adds} 条，修改 ${c.edits} 条，删除 ${c.deletes} 条`;}
  function submitDraft(contributor){
    const c=draftCounts(); if(c.adds+c.edits+c.deletes===0){alert('没有未提交的修改。');return;}
    const changes=[];
    (draft.adds||[]).forEach(a=>changes.push({kind:'new',section:a.section,position:{afterId:a.afterId,beforeId:a.beforeId,afterName:getBase(a.afterId)?.name||'',beforeName:getBase(a.beforeId)?.name||''},newData:a.data}));
    Object.keys(draft.edits||{}).forEach(id=>{if((draft.deletes||[]).includes(id))return; const old=getBase(id), neu=draft.edits[id]; const fs=fields.filter(f=>JSON.stringify(old?.[f]||'')!==JSON.stringify(neu?.[f]||'')); if(fs.length) changes.push({kind:'edit',targetId:id,section:old.section,oldData:old,newData:neu,fields:fs});});
    (draft.deletes||[]).forEach(id=>{const old=getBase(id); if(old) changes.push({kind:'delete',targetId:id,section:old.section,oldData:old,fields:['name']});});
    const sub={id:'TD-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6),createdAt:new Date().toISOString(),status:'pending',contributor,changes,colors,options};
    const subs=getSubs(); subs.unshift(sub); setSubs(subs); draft={edits:{},adds:[],deletes:[]}; saveDraft(); $('#submitModal').hidden=true; window.location.href='success.html?id='+encodeURIComponent(sub.id);
  }
  function seedTestSubmission(){
    const base=BASE.find(x=>x.section===currentSection)||BASE[0];
    const sub={id:'TD-TEST-'+String(Date.now()).slice(-5),createdAt:new Date().toISOString(),status:'pending',contributor:{name:'测试贡献者',avatar:'',email:'',show:true},changes:[{kind:'new',section:currentSection,position:{afterId:base.id,beforeId:'',afterName:base.name,beforeName:''},newData:{id:'test-new',section:currentSection,name:'测试新增条目',portal:'详见页面内容',importance:['出场'],hanhua:['已汉化'],relations:['Dick'],notes:'测试新增。',pageContent:''}},{kind:'edit',targetId:base.id,section:base.section,oldData:base,newData:{...clone(base),notes:(base.notes||'')+'（测试修改）',relations:[...(base.relations||[]),'新tag']},fields:['notes','relations']}],colors,options};
    (sub.changes||[]).forEach((ch,i)=>{ch.changeId=sub.id+'-'+(i+1); ch.status='pending';}); const subs=getSubs(); subs.unshift(sub); setSubs(subs); alert('已生成一条测试投稿，可以打开 admin.html 查看。');
  }
  init();
})();
