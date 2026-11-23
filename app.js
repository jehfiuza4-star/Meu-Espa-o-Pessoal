/* Meu Caderno — site estático: modo local (IndexedDB) + opção de nuvem (Supabase Auth/RLS). */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {mode:null,user:null,db:null,folders:[],notes:[],currentFolder:'home',activeId:null,selectedMedia:null,range:null,saveTimer:null,saving:false,blobUrls:[],modalResolve:null};
  const cfg = window.CADERNO_CONFIG || {};
  const cloudReady = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase?.createClient);
  const sb = cloudReady ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey) : null;
  const uid = () => globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c => {const r=Math.random()*16|0;return (c==='x'?r:(r&3|8)).toString(16)});
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stripped = html => {let tmp=document.createElement('div');tmp.innerHTML=html||'';return tmp.textContent||''};
  const norm = text => String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const formatDate = d => {const x=new Date(d);return isNaN(x)?'agora':x.toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})};
  const notify = msg => {const el=$('toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(notify.timer);notify.timer=setTimeout(()=>el.classList.add('hidden'),3500)};
  const authMessage = msg => {$('authFeedback').textContent=msg;$('authFeedback').classList.remove('hidden')};
  const setSaveText = msg => {$('saveState').textContent=msg;$('editorSaveState').textContent=msg};
  const localKeys = {folders:'meuCaderno.v1.folders',notes:'meuCaderno.v1.notes'};

  function openIDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open('meuCadernoMedia',1);request.onupgradeneeded=()=>request.result.createObjectStore('files',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
  async function idbPut(id,blob){const db=state.db||(state.db=await openIDB());return new Promise((resolve,reject)=>{const tx=db.transaction('files','readwrite');tx.objectStore('files').put({id,blob});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  async function idbGet(id){const db=state.db||(state.db=await openIDB());return new Promise((resolve,reject)=>{const tx=db.transaction('files');const req=tx.objectStore('files').get(id);req.onsuccess=()=>resolve(req.result?.blob);req.onerror=()=>reject(req.error)})}
  async function idbAll(){const db=state.db||(state.db=await openIDB());return new Promise((resolve,reject)=>{const req=db.transaction('files').objectStore('files').getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
  function localPersist(){localStorage.setItem(localKeys.folders,JSON.stringify(state.folders));localStorage.setItem(localKeys.notes,JSON.stringify(state.notes))}
  function seedLocal(){if(localStorage.getItem(localKeys.folders)!==null)return;
    const folderId=uid();const now=new Date().toISOString();state.folders=[{id:folderId,name:'Português',created_at:now},{id:uid(),name:'Pedagogia',created_at:now},{id:uid(),name:'Minha rotina',created_at:now}];
    state.notes=[{id:uid(),folder_id:folderId,title:'Fonemas · Exemplo',content:'<h2>O que são fonemas?</h2><p>Este é um texto de exemplo. Clique para editar, formatar e acrescentar suas próprias explicações, imagens e vídeos.</p><p>Você pode criar quantos tópicos quiser e pesquisar as palavras depois.</p>',created_at:now,updated_at:now},{id:uid(),folder_id:folderId,title:'Pronomes · Exemplo',content:'<h2>Pronomes</h2><p>Esta é outra anotação de exemplo. Organize seu aprendizado por assunto e salve tudo automaticamente.</p>',created_at:now,updated_at:now}];localPersist()}
  function loadLocal(){state.folders=JSON.parse(localStorage.getItem(localKeys.folders)||'[]');state.notes=JSON.parse(localStorage.getItem(localKeys.notes)||'[]')}
  async function loadCloud(){const [fr,nr]=await Promise.all([sb.from('study_folders').select('*').order('created_at'),sb.from('study_notes').select('*').order('updated_at',{ascending:false})]);if(fr.error)throw fr.error;if(nr.error)throw nr.error;state.folders=fr.data||[];state.notes=nr.data||[]}
  async function enter(mode,user=null){state.mode=mode;state.user=user;state.currentFolder='home';state.activeId=null;try{if(mode==='local'){seedLocal();loadLocal()}else{await loadCloud()}}catch(e){notify('Não foi possível carregar os dados: '+e.message);return} $('authScreen').classList.add('hidden');$('app').classList.remove('hidden');$('modeBadge').textContent=mode==='local'?'Neste aparelho':'Conta sincronizada';$('storageText').textContent=mode==='local'?'Modo local: faça cópias de segurança.':'Arquivos privados na sua conta.';render()}
  function resetToAuth(){$('app').classList.add('hidden');$('editorOverlay').classList.add('hidden');$('authScreen').classList.remove('hidden');state.mode=null;state.user=null;state.notes=[];state.folders=[]}
  async function doAuth(type){if(!sb){authMessage('Para ativar uma conta com senha, configure o Supabase em config.js. Você já pode experimentar o site no seu aparelho pelo botão abaixo.');return}
    const email=$('emailInput').value.trim(),password=$('passwordInput').value;
    if(!email||password.length<6){authMessage('Informe um e-mail válido e uma senha com pelo menos 6 caracteres.');return}
    $('authFeedback').classList.add('hidden');$('loginBtn').disabled=true;$('signupBtn').disabled=true;
    try{const {data,error}=type==='signup'?await sb.auth.signUp({email,password}):await sb.auth.signInWithPassword({email,password});if(error)throw error;
      if(data.session?.user){await enter('cloud',data.session.user)}else{authMessage('Conta criada! Confira seu e-mail e confirme o cadastro. Depois, faça login.')}
    }catch(e){authMessage('Não foi possível acessar: '+e.message)}finally{$('loginBtn').disabled=false;$('signupBtn').disabled=false}}
  $('loginBtn').onclick=()=>doAuth('login');$('signupBtn').onclick=()=>doAuth('signup');$('demoBtn').onclick=()=>enter('local');$('logoutBtn').onclick=async()=>{await flushSave();if(state.mode==='cloud')await sb.auth.signOut();resetToAuth()};

  function folderName(id){return state.folders.find(f=>f.id===id)?.name||'Sem pasta'}
  function pickFolder(id){state.currentFolder=id;$('sidebar').classList.remove('sidebar-open');$('app').classList.remove('sidebar-open');$('searchInput').value='';render()}
  function render(){renderSidebar();renderPage()}
  function renderSidebar(){const active=state.currentFolder;
    $('homeBtn').classList.toggle('active',active==='home');$('allNotesBtn').classList.toggle('active',active==='all');
    $('folderList').innerHTML=state.folders.map(f=>`<div class="folder-item ${active===f.id?'active':''}" data-folder="${esc(f.id)}"><span class="folder-icon">▣</span><span class="folder-name">${esc(f.name)}</span><span class="count">${state.notes.filter(n=>n.folder_id===f.id).length}</span><button class="folder-menu" data-options="${esc(f.id)}" aria-label="Opções da pasta ${esc(f.name)}">⋯</button></div>`).join('');
    document.querySelectorAll('[data-folder]').forEach(el=>el.onclick=e=>{if(e.target.closest('[data-options]'))return;pickFolder(el.dataset.folder)});
    document.querySelectorAll('[data-options]').forEach(el=>el.onclick=e=>{e.stopPropagation();folderOptions(el.dataset.options)})}
  function renderPage(){const f=state.folders.find(x=>x.id===state.currentFolder);const isHome=state.currentFolder==='home';const isAll=state.currentFolder==='all';const query=norm($('searchInput').value.trim());const searchType=$('searchType').value;
    $('pageEyebrow').textContent=f?'CADERNO DE ESTUDOS':isHome?'BEM-VINDA AO SEU ESPAÇO':'SUA BIBLIOTECA';
    $('pageTitle').textContent=f?f.name:isAll?'Todos os seus textos 📚':'Onde as ideias florescem ✨';
    $('pageSubtitle').textContent=f?'Todas as suas anotações de '+f.name+'.':isAll?'Encontre tudo que você já escreveu.':'Um cantinho especial para tudo que você aprende.';
    $('welcomePanel').classList.toggle('hidden',!isHome||!!query);$('folderCards').classList.toggle('hidden',!isHome||!!query);$('listHeading').textContent='Seus cadernos';$('listHeading').parentElement.classList.toggle('hidden',!isHome||!!query);
    $('folderCards').innerHTML=state.folders.map(f=>`<div class="folder-card" data-cardfolder="${esc(f.id)}"><div class="folder-card-head"><div class="folder-card-icon">📖</div><span class="folder-card-arrow">↗</span></div><h4>${esc(f.name)}</h4><p>${state.notes.filter(n=>n.folder_id===f.id).length} texto(s) guardado(s)</p></div>`).join('');
    document.querySelectorAll('[data-cardfolder]').forEach(el=>el.onclick=()=>pickFolder(el.dataset.cardfolder));
    let notes=state.notes.filter(n=>query||isHome||isAll||n.folder_id===activeFolder());
    if(query)notes=notes.filter(n=>{let inTitle=norm(n.title).includes(query),inBody=norm(stripped(n.content)).includes(query);return searchType==='title'?inTitle:searchType==='content'?inBody:inTitle||inBody});
    notes.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
    $('notesHeading').textContent=query?'Resultados da pesquisa':f?'Textos de '+f.name:'Anotações recentes';$('resultCount').textContent=`${notes.length} texto(s)`;
    $('notesGrid').innerHTML=notes.map(n=>`<div class="note-card" data-note="${esc(n.id)}"><div class="note-icon">✎</div><h4>${esc(n.title||'Sem título')}</h4><p>${esc(stripped(n.content).slice(0,250)||'Clique para começar a escrever...')}</p><footer><span>${esc(folderName(n.folder_id))}</span><span>${esc(formatDate(n.updated_at))}</span></footer></div>`).join('');
    document.querySelectorAll('[data-note]').forEach(el=>el.onclick=()=>openNote(el.dataset.note));$('emptyState').classList.toggle('hidden',notes.length!==0)}
  function activeFolder(){return state.currentFolder}
  $('homeBtn').onclick=()=>pickFolder('home');$('allNotesBtn').onclick=()=>pickFolder('all');$('searchInput').oninput=renderPage;$('searchType').onchange=renderPage;$('menuToggle').onclick=()=>{$('app').classList.toggle('sidebar-open')};

  function askModal(title,hint,placeholder,value=''){return new Promise(resolve=>{state.modalResolve=resolve;$('modalTitle').textContent=title;$('modalHint').textContent=hint;$('modalInput').placeholder=placeholder;$('modalInput').value=value;$('modalBackdrop').classList.remove('hidden');setTimeout(()=>$('modalInput').focus(),0)})}
  function closeModal(value){$('modalBackdrop').classList.add('hidden');const resolve=state.modalResolve;state.modalResolve=null;resolve?.(value)}
  $('modalCancel').onclick=()=>closeModal(null);$('modalConfirm').onclick=()=>closeModal($('modalInput').value.trim());$('modalInput').onkeydown=e=>{if(e.key==='Enter')closeModal($('modalInput').value.trim());if(e.key==='Escape')closeModal(null)};
  $('modalBackdrop').onclick=e=>{if(e.target===$('modalBackdrop'))closeModal(null)};
  async function saveFolder(f){if(state.mode==='local'){const i=state.folders.findIndex(x=>x.id===f.id);if(i>=0)state.folders[i]=f;else state.folders.push(f);localPersist()}else{const {error}=await sb.from('study_folders').upsert({...f,user_id:state.user.id});if(error)throw error;const i=state.folders.findIndex(x=>x.id===f.id);if(i>=0)state.folders[i]=f;else state.folders.push(f)}render()}
  async function newFolder(){const name=await askModal('Nova pasta 📚','Ex.: Português, Pedagogia, Inglês, Minha rotina...','Nome da pasta');if(!name)return;
    if(name.length>80){notify('Nome muito longo.');return}try{const id=uid();await saveFolder({id,name,created_at:new Date().toISOString()});pickFolder(id);notify('Pasta criada com sucesso!')}catch(e){notify('Erro ao criar pasta: '+e.message)}}
  $('newFolderBtn').onclick=newFolder;$('newFolderInlineBtn').onclick=newFolder;
  async function folderOptions(id){const f=state.folders.find(f=>f.id===id);if(!f)return;const action=await askModal('Organizar pasta','Digite um novo nome para renomear. Para excluir, escreva EXCLUIR. Os textos serão movidos para “Sem pasta”.','Novo nome ou EXCLUIR',f.name);if(action===null||action===f.name)return;
    if(action==='EXCLUIR'){if(!confirm(`Excluir a pasta "${f.name}"? Os textos serão preservados sem pasta.`))return;try{if(state.mode==='cloud'){const {error}=await sb.from('study_folders').delete().eq('id',id);if(error)throw error}else{state.notes.forEach(n=>{if(n.folder_id===id)n.folder_id=null})}state.folders=state.folders.filter(x=>x.id!==id);if(state.mode==='cloud'){state.notes.forEach(n=>{if(n.folder_id===id)n.folder_id=null})}else localPersist();pickFolder('home');notify('Pasta excluída, textos preservados.')}catch(e){notify('Erro: '+e.message)}return}
    if(action){try{await saveFolder({...f,name:action});notify('Pasta renomeada')}catch(e){notify('Erro: '+e.message)}}}

  async function createNote(){await flushSave();let folder=state.folders.some(f=>f.id===state.currentFolder)?state.currentFolder:null;const now=new Date().toISOString();const note={id:uid(),folder_id:folder,title:'Sem título',content:'',created_at:now,updated_at:now};try{if(state.mode==='cloud'){const {error}=await sb.from('study_notes').insert({...note,user_id:state.user.id});if(error)throw error}state.notes.unshift(note);if(state.mode==='local')localPersist();await openNote(note.id)}catch(e){notify('Erro ao criar texto: '+e.message)}}
  $('createNoteBtn').onclick=createNote;
  function revokeMedia(){state.blobUrls.forEach(url=>URL.revokeObjectURL(url));state.blobUrls=[]}
  async function openNote(id){await flushSave();const note=state.notes.find(n=>n.id===id);if(!note)return;state.activeId=id;state.range=null;state.selectedMedia=null;$('mediaToolbar').classList.add('hidden');revokeMedia();
    $('noteTitle').value=note.title==='Sem título'?'':note.title;const folderOpts=[{id:'',name:'Sem pasta'},...state.folders];$('noteFolder').innerHTML=folderOpts.map(f=>`<option value="${esc(f.id)}" ${f.id===(note.folder_id||'')?'selected':''}>${esc(f.name)}</option>`).join('');
    $('lastEdited').textContent='Editado em '+formatDate(note.updated_at);$('editor').innerHTML=sanitize(note.content);$('editorOverlay').classList.remove('hidden');$('app').classList.add('hidden');setSaveText('Salvo');countWords();await hydrate($('editor'))}
  function sanitize(html){const tpl=document.createElement('template');tpl.innerHTML=String(html||'');const allowed=new Set(['P','DIV','BR','STRONG','B','EM','I','U','S','STRIKE','H1','H2','H3','H4','UL','OL','LI','BLOCKQUOTE','A','TABLE','TBODY','THEAD','TR','TD','TH','FIGURE','IMG','VIDEO','SOURCE','IFRAME','SPAN','HR','FIGCAPTION','FONT']);
    const walk=node=>{for(const child of [...node.children]){if(!allowed.has(child.tagName)){const fragment=document.createDocumentFragment();while(child.firstChild)fragment.appendChild(child.firstChild);child.replaceWith(fragment);walk(node);continue}
      for(const attr of [...child.attributes]){const k=attr.name.toLowerCase(),v=attr.value;
        const permitted=['data-media-id','data-media-path','data-media-name','data-align','alt','controls','loading','title','contenteditable','colspan','rowspan'].includes(k)||k==='style'||(k==='src'&&['IMG','VIDEO','SOURCE','IFRAME'].includes(child.tagName))||(k==='href'&&child.tagName==='A');
        if(!permitted||k.startsWith('on')){child.removeAttribute(attr.name);continue}
        if(k==='style'){const kept=[];for(const rule of v.split(';')){const [key,value]=rule.split(':').map(s=>s?.trim());if(!key||!value)continue;if(key==='width'&&/^(100|[1-9]?\d)(\.\d+)?%$/.test(value))kept.push(`width:${value}`);if(key==='text-align'&&/^(left|right|center|justify)$/.test(value))kept.push(`text-align:${value}`);if(key==='float'&&/^(left|right|none)$/.test(value))kept.push(`float:${value}`);if(key==='margin'&&/^[\w\s.%\-]+$/.test(value))kept.push(`margin:${value}`);if((key==='color'||key==='background-color')&&/^(#[0-9a-f]{3,8}|rgb\([\d,\s.%]+\)|[a-z]+)$/i.test(value))kept.push(`${key}:${value}`)}child.setAttribute('style',kept.join(';'));continue}
        if(k==='src'){if(child.tagName==='IFRAME'&&!/^https:\/\/www\.youtube-nocookie\.com\/embed\/[a-zA-Z0-9_-]{11}$/.test(v)){child.removeAttribute('src')}else if(child.tagName!=='IFRAME'&&!/^(blob:|https:\/\/|data:image\/(png|jpeg|gif|webp);base64,)/i.test(v))child.removeAttribute('src')}
        if(k==='href'&&!/^https?:\/\//i.test(v))child.removeAttribute('href');
        if(k==='data-media-path'&&!/^[a-f0-9-]{20,}\/[\w.\-]+$/i.test(v))child.removeAttribute(k);
      }walk(child)} };walk(tpl.content);return tpl.innerHTML}
  async function hydrate(root){const elements=[...root.querySelectorAll('[data-media-id],[data-media-path]')];await Promise.all(elements.map(async el=>{try{if(el.dataset.mediaId&&state.mode==='local'){const blob=await idbGet(el.dataset.mediaId);if(blob){const url=URL.createObjectURL(blob);state.blobUrls.push(url);el.src=url}else el.alt='Arquivo não encontrado neste aparelho'}else if(el.dataset.mediaPath&&state.mode==='cloud'){const {data,error}=await sb.storage.from('study-media').createSignedUrl(el.dataset.mediaPath,3600);if(error)throw error;el.src=data.signedUrl}}catch(e){console.warn('Falha ao carregar mídia',e)}}))}
  function serialize(){const clone=$('editor').cloneNode(true);clone.querySelectorAll('.selected').forEach(el=>el.classList.remove('selected'));clone.querySelectorAll('[data-media-id],[data-media-path]').forEach(el=>el.removeAttribute('src'));return sanitize(clone.innerHTML)}
  function captureNote(){const note=state.notes.find(n=>n.id===state.activeId);if(!note)return null;note.title=$('noteTitle').value.trim()||'Sem título';note.folder_id=$('noteFolder').value||null;note.content=serialize();note.updated_at=new Date().toISOString();return note}
  async function persistNote(note){if(state.mode==='local'){localPersist();return}const {error}=await sb.from('study_notes').upsert({...note,user_id:state.user.id});if(error)throw error}
  async function flushSave(){if(!state.activeId)return;clearTimeout(state.saveTimer);const note=captureNote();if(!note)return;setSaveText('Salvando...');try{await persistNote(note);setSaveText('Salvo ✓')}catch(e){setSaveText('Erro ao salvar');notify('Não foi possível salvar: '+e.message);throw e}}
  function queueSave(){setSaveText('Alterações pendentes');clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>{flushSave().catch(()=>{})},850);countWords()}
  function countWords(){const text=$('editor').innerText.trim();$('wordCount').textContent=(text?text.split(/\s+/).length:0)+' palavras'}
  $('editor').addEventListener('input',queueSave);$('noteTitle').addEventListener('input',queueSave);$('noteFolder').onchange=queueSave;
  $('editorBackBtn').onclick=async()=>{try{await flushSave();revokeMedia();state.activeId=null;$('editorOverlay').classList.add('hidden');$('app').classList.remove('hidden');render()}catch(e){notify('Não foi possível salvar. Tente novamente antes de voltar.')}};
  $('deleteNoteBtn').onclick=async()=>{if(!confirm('Excluir esta anotação definitivamente?'))return;const id=state.activeId;clearTimeout(state.saveTimer);try{if(state.mode==='cloud'){const {error}=await sb.from('study_notes').delete().eq('id',id);if(error)throw error}state.notes=state.notes.filter(n=>n.id!==id);if(state.mode==='local')localPersist();state.activeId=null;revokeMedia();$('editorOverlay').classList.add('hidden');$('app').classList.remove('hidden');render();notify('Texto excluído.')}catch(e){notify('Erro ao excluir: '+e.message)}};

  function rememberSelection(){const sel=window.getSelection();if(sel?.rangeCount&&$('editor').contains(sel.anchorNode))state.range=sel.getRangeAt(0).cloneRange()}
  $('editor').addEventListener('keyup',rememberSelection);$('editor').addEventListener('mouseup',rememberSelection);$('editor').addEventListener('focus',rememberSelection);
  function restoreSelection(){const sel=window.getSelection();$('editor').focus();if(state.range){try{sel.removeAllRanges();sel.addRange(state.range)}catch(e){}}}
  function exec(command,value=null){restoreSelection();document.execCommand(command,false,value);rememberSelection();queueSave()}
  document.querySelectorAll('#toolbar [data-cmd]').forEach(btn=>{btn.addEventListener('pointerdown',e=>e.preventDefault());btn.onclick=()=>exec(btn.dataset.cmd)});
  $('blockStyle').onchange=e=>{exec('formatBlock',e.target.value);e.target.value='P'};
  function insertHTML(html){restoreSelection();document.execCommand('insertHTML',false,html);rememberSelection();queueSave()}
  $('insertLinkBtn').onclick=()=>{const raw=prompt('Cole o endereço do link (https://):');if(!raw)return;try{const url=new URL(raw);if(!/^https?:$/.test(url.protocol))throw Error('Protocolo inválido');exec('createLink',url.href)}catch{notify('Insira um link começando com https://')}};
  $('insertLineBtn').onclick=()=>insertHTML('<hr><p><br></p>');
  $('insertTableBtn').onclick=()=>insertHTML('<table><tbody><tr><td>Escreva aqui</td><td>Escreva aqui</td></tr><tr><td>Escreva aqui</td><td>Escreva aqui</td></tr></tbody></table><p><br></p>');
  function videoEmbed(url){try{const u=new URL(url);let id='';if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname)){id=u.searchParams.get('v')||u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/)?.[1]||''}else if(u.hostname==='youtu.be'||u.hostname==='www.youtu.be')id=u.pathname.slice(1).split('/')[0];if(/^[\w-]{11}$/.test(id))return `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo do YouTube" allowfullscreen></iframe>`;if(url.startsWith('https://')&&/\.(mp4|webm)(?:\?|$)/i.test(u.pathname))return `<video controls src="${esc(url)}"></video>`}catch{}return null}
  // Fotos e vídeos do próprio aparelho: o botão de vídeo NÃO exige um link.
  function chooseMedia(type){
    const input=$('mediaFileInput');input.value='';
    input.accept=type==='image'?'image/*': 'video/*,.mp4,.webm,.mov,.m4v';
    input.dataset.kind=type;
    rememberSelection();input.click();
  }
  $('insertPhotoBtn').onclick=()=>chooseMedia('image');
  $('insertVideoBtn').onclick=()=>chooseMedia('video');
  $('insertVideoLinkBtn').onclick=async()=>{const url=await askModal('Vídeo por link (opcional) ▶','Cole o endereço de um vídeo do YouTube. Para um vídeo salvo no computador, use “Vídeo do computador”.','https://www.youtube.com/watch?v=...');if(!url)return;const embed=videoEmbed(url);if(!embed){notify('Link de vídeo não reconhecido.');return}insertHTML(`<figure contenteditable="false" data-align="center" style="width:80%;margin:22px auto">${embed}</figure><p><br></p>`)};

  async function imageCompress(file){if(!file.type.startsWith('image/')||file.type==='image/gif'||file.type==='image/svg+xml')return file;try{const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));if(scale===1&&file.size<2_000_000)return file;const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return await new Promise(resolve=>canvas.toBlob(b=>resolve(b||file),'image/jpeg',.83))}catch{return file}}
  const extensionFor = mime => ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/svg+xml':'svg','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov','video/x-m4v':'m4v','video/ogg':'ogv'})[mime] || '';
  const safeName = name => String(name||'arquivo').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/^\.+/,'').slice(0,120)||'arquivo';
  function nameForStoredFile(original,blob){const ext=extensionFor(blob.type);const base=safeName(original).replace(/\.[^.]+$/,'');return `${base||'arquivo'}.${ext||'bin'}`}
  $('mediaFileInput').onchange=async e=>{
    const chosen=e.target.files?.[0];if(!chosen)return;
    const requested=e.target.dataset.kind;
    const isImage=chosen.type.startsWith('image/'),isVideo=chosen.type.startsWith('video/');
    if(!((requested==='image'&&isImage)||(requested==='video'&&isVideo))){notify(requested==='image'?'Escolha uma imagem.':'Escolha um arquivo de vídeo.');return}
    const limit=state.mode==='local'?100*1024*1024:25*1024*1024;
    if(chosen.size>limit){notify(`Arquivo grande demais. Limite neste modo: ${Math.round(limit/1024/1024)} MB.`);return}
    notify('Guardando o arquivo no seu espaço...');
    const file=isImage?await imageCompress(chosen):chosen;
    const storedName=nameForStoredFile(chosen.name,file);
    try{let dataAttr='',url='';
      if(state.mode==='local'){
        const id=uid();await idbPut(id,file);dataAttr=`data-media-id="${id}"`;url=URL.createObjectURL(file);state.blobUrls.push(url);
      }else{
        const path=`${state.user.id}/${uid()}.${extensionFor(file.type)||'bin'}`;
        const {error}=await sb.storage.from('study-media').upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
        const signed=await sb.storage.from('study-media').createSignedUrl(path,3600);if(signed.error)throw signed.error;
        dataAttr=`data-media-path="${path}"`;url=signed.data.signedUrl;
      }
      const attrs=`${dataAttr} data-media-name="${esc(storedName)}"`;
      const media=isImage?`<img ${attrs} alt="${esc(storedName)}" src="${esc(url)}" />`:`<video ${attrs} controls src="${esc(url)}"></video>`;
      insertHTML(`<figure contenteditable="false" data-align="center" style="width:80%;margin:22px auto">${media}<figcaption>${esc(storedName)} · Clique para ajustar ou baixar</figcaption></figure><p><br></p>`);
      await flushSave();notify('Arquivo adicionado e salvo neste espaço!');
    }catch(error){notify('Não foi possível guardar o arquivo: '+(error?.name==='QuotaExceededError'?'armazenamento do navegador cheio. Faça uma cópia de segurança.':error.message))}
  };
  $('editor').addEventListener('click',e=>{const fig=e.target.closest('figure');if(state.selectedMedia)state.selectedMedia.classList.remove('selected');state.selectedMedia=fig||null;$('mediaToolbar').classList.toggle('hidden',!fig);if(fig){fig.classList.add('selected');$('mediaWidth').value=parseFloat(fig.style.width)||80}});
  document.querySelectorAll('[data-align]').forEach(btn=>btn.onclick=()=>{const fig=state.selectedMedia;if(!fig)return;const a=btn.dataset.align;fig.dataset.align=a;fig.style.float=a==='center'?'none':a;fig.style.margin=a==='center'?'22px auto':a==='left'?'20px 25px 20px 0':'20px 0 20px 25px';queueSave()});
  $('mediaWidth').oninput=e=>{if(!state.selectedMedia)return;state.selectedMedia.style.width=e.target.value+'%';queueSave()};
  $('mediaUpBtn').onclick=()=>{const f=state.selectedMedia;if(f?.previousElementSibling){f.previousElementSibling.before(f);queueSave()}};
  $('mediaDownBtn').onclick=()=>{const f=state.selectedMedia;if(f?.nextElementSibling){f.nextElementSibling.after(f);queueSave()}};
  $('mediaRemoveBtn').onclick=()=>{if(!state.selectedMedia)return;state.selectedMedia.remove();state.selectedMedia=null;$('mediaToolbar').classList.add('hidden');queueSave()};
  $('editor').addEventListener('paste',e=>{if(!e.clipboardData)return;e.preventDefault();const txt=e.clipboardData.getData('text/plain');document.execCommand('insertText',false,txt)});
  async function mediaBlob(el){
    if(el.dataset.mediaId && state.mode==='local'){
      const b=await idbGet(el.dataset.mediaId);if(!b)throw Error('Arquivo não encontrado neste navegador.');return b;
    }
    if(el.dataset.mediaPath && state.mode==='cloud'){
      const {data,error}=await sb.storage.from('study-media').download(el.dataset.mediaPath);if(error)throw error;return data;
    }
    throw Error('Esta mídia veio de um link externo, não dos seus arquivos.');
  }
  function downloadBlob(blob,name){
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=safeName(name);
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  $('mediaDownloadBtn').onclick=async()=>{
    const el=state.selectedMedia?.querySelector('img[data-media-id],video[data-media-id],img[data-media-path],video[data-media-path]');
    if(!el){notify('Clique primeiro em uma foto ou vídeo que você enviou.');return}
    try{const blob=await mediaBlob(el);downloadBlob(blob,el.dataset.mediaName||`arquivo.${extensionFor(blob.type)||'bin'}`);notify('Arquivo enviado para Downloads.')}catch(e){notify('Não foi possível baixar: '+e.message)}
  };
  // Criador de ZIP sem depender de bibliotecas externas. O arquivo contém HTML e mídias reais.
  const enc=new TextEncoder();
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0});
  function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0}
  function zipFiles(items){
    const chunks=[],central=[];let offset=0;
    for(const item of items){
      const name=enc.encode(item.name),bytes=item.bytes;const crc=crc32(bytes);
      const h=new Uint8Array(30+name.length),d=new DataView(h.buffer);
      d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);
      d.setUint32(14,crc,true);d.setUint32(18,bytes.length,true);d.setUint32(22,bytes.length,true);d.setUint16(26,name.length,true);h.set(name,30);
      chunks.push(h,bytes);
      const ch=new Uint8Array(46+name.length),cd=new DataView(ch.buffer);
      cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,0x800,true);
      cd.setUint32(16,crc,true);cd.setUint32(20,bytes.length,true);cd.setUint32(24,bytes.length,true);cd.setUint16(28,name.length,true);
      cd.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=h.length+bytes.length;
    }
    const cdSize=central.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),ed=new DataView(end.buffer);
    ed.setUint32(0,0x06054b50,true);ed.setUint16(8,items.length,true);ed.setUint16(10,items.length,true);
    ed.setUint32(12,cdSize,true);ed.setUint32(16,offset,true);
    return new Blob([...chunks,...central,end],{type:'application/zip'});
  }
  $('exportNoteBtn').onclick=async()=>{
    const btn=$('exportNoteBtn');btn.disabled=true;const before=btn.textContent;btn.textContent='Preparando arquivos...';
    try{
      await flushSave();const note=state.notes.find(n=>n.id===state.activeId);if(!note)throw Error('Nenhuma anotação aberta.');
      const doc=document.createElement('div');doc.innerHTML=sanitize(note.content);
      const files=[];let index=0;
      for(const el of doc.querySelectorAll('img[data-media-id],video[data-media-id],img[data-media-path],video[data-media-path]')){
        const blob=await mediaBlob(el),name=safeName(el.dataset.mediaName||`arquivo.${extensionFor(blob.type)||'bin'}`);
        const filename=`midias/${String(++index).padStart(2,'0')}-${name}`;
        files.push({name:filename,bytes:new Uint8Array(await blob.arrayBuffer())});
        el.setAttribute('src',filename);el.removeAttribute('data-media-id');el.removeAttribute('data-media-path');el.removeAttribute('data-media-name');
      }
      doc.querySelectorAll('[contenteditable]').forEach(el=>el.removeAttribute('contenteditable'));
      const title=esc(note.title||'Sem título');
      const html=`<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{max-width:900px;margin:40px auto;padding:0 22px;font:17px/1.65 Georgia,serif;color:#303039}h1,h2,h3{font-family:Arial,sans-serif;line-height:1.3}h1{color:#884365}img,video,iframe{max-width:100%;height:auto}figure{max-width:100%;margin:18px auto}figcaption{font:12px Arial,sans-serif;color:#777}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:9px}blockquote{border-left:3px solid #c27b9e;padding-left:16px}a{color:#9b4972}</style></head><body><h1>${title}</h1><main>${doc.innerHTML}</main></body></html>`;
      files.unshift({name:'abrir-meu-texto.html',bytes:enc.encode(html)});
      const zip=zipFiles(files);downloadBlob(zip,`${safeName(note.title||'meu-texto')}.zip`);
      notify('Texto e arquivos baixados! Extraia o ZIP e abra “abrir-meu-texto.html”.');
    }catch(e){notify('Não foi possível baixar: '+e.message)}finally{btn.disabled=false;btn.textContent=before}
  };
  $('presentationBtn').onclick=async()=>{await flushSave();$('presentationTitle').textContent=$('noteTitle').value.trim()||'Sem título';$('presentationBody').innerHTML=sanitize($('editor').innerHTML);$('presentationOverlay').classList.remove('hidden')};
  $('closePresentationBtn').onclick=()=>$('presentationOverlay').classList.add('hidden');

  async function toDataURL(blob){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob)})}
  function dataURLBlob(str){const [head,b64]=str.split(',');const bytes=atob(b64);const data=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);return new Blob([data],{type:head.match(/data:(.*?);/)?.[1]||'application/octet-stream'})}
  $('backupBtn').onclick=async()=>{try{await flushSave();const payload={kind:'meu-caderno-backup',version:1,exportedAt:new Date().toISOString(),folders:state.folders,notes:state.notes,media:[]};if(state.mode==='local'){const assets=await idbAll();for(const {id,blob} of assets)payload.media.push({id,data:await toDataURL(blob)})}
      const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`meu-caderno-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify(state.mode==='cloud'?'Cópia de textos exportada (mídias permanecem na nuvem).':'Cópia de segurança criada!')
    }catch(e){notify('Erro ao exportar: '+e.message)}};
  $('importFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{const data=JSON.parse(await file.text());if(data.kind!=='meu-caderno-backup'||!Array.isArray(data.notes)||!Array.isArray(data.folders))throw Error('Arquivo de cópia inválido.');if(!confirm('Importar cópia? Pastas e textos existentes com o mesmo ID serão substituídos.'))return;
      if(state.mode==='local'){for(const asset of data.media||[])if(asset.id&&asset.data)await idbPut(asset.id,dataURLBlob(asset.data));const folderMap=new Map(state.folders.map(f=>[f.id,f]));for(const f of data.folders)folderMap.set(f.id,f);const noteMap=new Map(state.notes.map(n=>[n.id,n]));for(const n of data.notes)noteMap.set(n.id,n);state.folders=[...folderMap.values()];state.notes=[...noteMap.values()];localPersist()}
      else{for(const f of data.folders){const {error}=await sb.from('study_folders').upsert({...f,user_id:state.user.id});if(error)throw error}for(const n of data.notes){const {error}=await sb.from('study_notes').upsert({...n,user_id:state.user.id});if(error)throw error}await loadCloud()}
      pickFolder('home');notify('Cópia importada!')
    }catch(error){notify('Falha na importação: '+error.message)}};
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();if(state.activeId)flushSave().catch(()=>{})}if(e.key==='Escape'&&!$('presentationOverlay').classList.contains('hidden'))$('presentationOverlay').classList.add('hidden')});
  if(!cloudReady)$('authHelp').textContent='O login seguro será ativado depois da configuração. Por enquanto, experimente sem conta.';
  if(sb){sb.auth.getSession().then(({data})=>{if(data.session?.user)enter('cloud',data.session.user)}).catch(()=>{})}
})();
