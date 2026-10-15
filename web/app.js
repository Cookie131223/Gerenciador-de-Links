const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG || {};
const app = document.getElementById("app");
const SESSION_KEY = "links-web-session-v2";
const linkCategories = ["Todos","Estudos","Trabalho","Pessoal","Tecnologia","Outros"];
const noteCategories = ["Pessoal","Trabalho","Faculdade","Ideias"];
let currentTab = "links";
let currentCategory = "Todos";
let currentLinks = [];
let currentNotes = [];
let currentPhotos = [];
let currentPhotoGroups = [];
let selectedPhotoGroup = null;
let noteSearch = "";

function headers(token, prefer) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {})
  };
}
async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.msg || data.error_description || data.error || "Erro ao comunicar com o servidor.");
  return data;
}
function getSession(){ try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null")}catch{return null} }
function saveSession(s){ localStorage.setItem(SESSION_KEY,JSON.stringify(s)) }
function clearSession(){ localStorage.removeItem(SESSION_KEY) }

async function refreshStoredSession(){
  const current=getSession();
  if(!current?.refresh_token) throw new Error("Sessão expirada.");

  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
    method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({refresh_token:current.refresh_token})
  });

  const fresh=await parse(res);
  saveSession(fresh);
  return fresh;
}

async function authorizedFetch(url,options={},retry=true){
  let session=getSession();
  if(!session?.access_token) throw new Error("Sessão expirada.");

  let res=await fetch(url,{
    ...options,
    headers:{...headers(session.access_token,options.prefer),...(options.headers||{})}
  });

  if(res.status===401 && retry && session.refresh_token){
    try{
      session=await refreshStoredSession();
      res=await fetch(url,{
        ...options,
        headers:{...headers(session.access_token,options.prefer),...(options.headers||{})}
      });
    }catch{
      clearSession();
      throw new Error("Sessão expirada.");
    }
  }

  return res;
}
function escapeHtml(v=""){ return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])) }
function normalizeUrl(url){ return /^https?:\/\//i.test(url)?url:`https://${url}` }

async function signIn(email,password){
  return parse(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
    method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})
  }));
}
async function signUp(email,password){
  return parse(await fetch(`${SUPABASE_URL}/auth/v1/signup`,{
    method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email,password})
  }));
}

function renderAuth(register=false,message=""){
  app.innerHTML=`
  <section class="auth"><div class="card">
    <div class="brand"><div class="logo">↗</div><h1 class="title">Meu Hub</h1></div>
    <p class="subtitle">${register?"Crie sua conta para sincronizar links e anotações.":"Entre para acessar seus links e anotações em qualquer dispositivo."}</p>
    <form class="form" id="authForm">
      <input class="input" id="email" type="email" placeholder="E-mail" required autocomplete="email">
      <input class="input" id="password" type="password" placeholder="Senha" minlength="6" required autocomplete="${register?"new-password":"current-password"}">
      <button class="btn btn-primary" type="submit">${register?"Criar conta":"Entrar"}</button>
    </form>
    <button class="btn btn-link" id="toggleAuth">${register?"Já tem uma conta? Entrar":"Ainda não tem conta? Criar conta"}</button>
    <div id="authMessage" class="${message.includes("criada")?"success":"error"}">${escapeHtml(message)}</div>
  </div></section>`;
  document.getElementById("toggleAuth").onclick=()=>renderAuth(!register);
  document.getElementById("authForm").onsubmit=async e=>{
    e.preventDefault();
    const email=document.getElementById("email").value.trim().toLowerCase();
    const password=document.getElementById("password").value;
    const msg=document.getElementById("authMessage");
    msg.textContent="Aguarde...";
    try{
      const session=register?await signUp(email,password):await signIn(email,password);
      if(register&&!session.access_token)return renderAuth(false,"Conta criada. Confira seu e-mail e depois faça login.");
      saveSession(session);
      await loadData();
    }catch(err){msg.className="error";msg.textContent=err.message}
  };
}

async function loadData(){
  const session=getSession();
  if(!session?.access_token)return renderAuth();
  try{
    if(currentTab==="links") await loadLinks();
    else if(currentTab==="notes") await loadNotes();
    else await loadPhotos();
  }catch(err){
    if(String(err.message).toLowerCase().includes("jwt")){clearSession();return renderAuth()}
    renderShell(`<div class="error">${escapeHtml(err.message)}</div>`);
  }
}

async function loadLinks(){
  const s=getSession();
  const params=new URLSearchParams({select:"*",order:"created_at.desc"});
  if(currentCategory!=="Todos")params.set("category",`eq.${currentCategory}`);
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/links?${params}`);
  if(res.status===401){clearSession();return renderAuth()}
  currentLinks=await parse(res);
  renderLinks();
}

async function loadNotes(){
  const params=new URLSearchParams({select:"*",order:"pinned.desc,updated_at.desc"});
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes?${params}`);
  if(res.status===401){clearSession();return renderAuth()}
  currentNotes=await parse(res);
  renderNotes();
}

async function loadPhotos(){
  const [photosRes, groupsRes] = await Promise.all([
    authorizedFetch(`${SUPABASE_URL}/rest/v1/photos?select=*&order=created_at.desc`),
    authorizedFetch(`${SUPABASE_URL}/rest/v1/photo_groups?select=*&order=created_at.desc`)
  ]);
  if(photosRes.status===401 || groupsRes.status===401){clearSession();return renderAuth()}
  currentPhotos=await parse(photosRes);
  currentPhotoGroups=await parse(groupsRes);
  renderPhotos();
}

function shell(content){
  const s=getSession();
  return `
  <section class="shell">
    <div class="toolbar">
      <div><div class="brand"><div class="logo">↗</div><h1 class="title">Meu Hub</h1></div><div class="user">${escapeHtml(s?.user?.email||"")}</div></div>
      <div class="toolbar-right"><button class="btn btn-secondary" id="logout">Sair</button></div>
    </div>
    <div class="tabs">
      <button class="tab ${currentTab==="links"?"active":""}" id="tabLinks">Links</button>
      <button class="tab ${currentTab==="notes"?"active":""}" id="tabNotes">Anotações</button>
      <button class="tab ${currentTab==="photos"?"active":""}" id="tabPhotos">Fotos</button>
    </div>
    ${content}
  </section>`;
}
function bindShell(){
  document.getElementById("logout").onclick=()=>{clearSession();renderAuth()};
  document.getElementById("tabLinks").onclick=()=>{currentTab="links";loadData()};
  document.getElementById("tabNotes").onclick=()=>{currentTab="notes";loadData()};
  document.getElementById("tabPhotos").onclick=()=>{currentTab="photos";loadData()};
}
function renderShell(content){app.innerHTML=shell(content);bindShell()}

function renderLinks(){
  const chips=linkCategories.map(c=>`<button class="chip ${c===currentCategory?"active":""}" data-cat="${c}">${c}</button>`).join("");
  const cards=currentLinks.length?currentLinks.map(l=>`
    <article class="item-card">
      <div class="item-row"><div>
        <div class="item-name">${escapeHtml(l.name)}</div>
        <div class="item-url">${escapeHtml(l.url)}</div>
        <div class="tag">${escapeHtml(l.category)}</div>
      </div></div>
      <div class="actions">
        <button class="btn btn-secondary" data-open="${l.id}">Abrir</button>
        <button class="btn btn-secondary" data-edit="${l.id}">Editar</button>
        <button class="btn btn-danger" data-delete="${l.id}">Excluir</button>
      </div>
    </article>`).join(""):`<div class="empty">Nenhum link nesta categoria.</div>`;
  renderShell(`
    <div class="toolbar"><div class="muted">Seus links salvos na nuvem</div><button class="btn btn-primary" id="newLink">+ Novo link</button></div>
    <div class="filters">${chips}</div><div class="list">${cards}</div>`);
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.cat;loadLinks()});
  document.getElementById("newLink").onclick=()=>showLinkModal();
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const l=currentLinks.find(x=>x.id===b.dataset.open);if(l)window.open(normalizeUrl(l.url),"_blank","noopener")});
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>showLinkModal(currentLinks.find(x=>x.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Deseja realmente excluir este link?"))await deleteLink(b.dataset.delete)});
}

function showLinkModal(link=null){
  const wrap=document.createElement("div");wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal"><h2>${link?"Editar link":"Novo link"}</h2>
  <form class="form" id="linkForm">
    <input class="input" id="linkName" placeholder="Nome" required value="${link?escapeHtml(link.name):""}">
    <input class="input" id="linkUrl" placeholder="https://..." required value="${link?escapeHtml(link.url):""}">
    <select class="select" id="linkCategory">${linkCategories.filter(c=>c!=="Todos").map(c=>`<option ${link?.category===c?"selected":""}>${c}</option>`).join("")}</select>
    <div id="linkMessage" class="error"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancel">Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
  </form></div>`;
  document.body.appendChild(wrap);
  document.getElementById("cancel").onclick=()=>wrap.remove();
  document.getElementById("linkForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      await saveLink(link?.id,{name:document.getElementById("linkName").value.trim(),url:normalizeUrl(document.getElementById("linkUrl").value.trim()),category:document.getElementById("linkCategory").value});
      wrap.remove();await loadLinks();
    }catch(err){document.getElementById("linkMessage").textContent=err.message}
  };
}
async function saveLink(id,data){
  const s=getSession(),url=id?`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`:`${SUPABASE_URL}/rest/v1/links`;
  const res=await authorizedFetch(url,{method:id?"PATCH":"POST",prefer:"return=representation",body:JSON.stringify(id?data:{...data,user_id:s.user.id})});
  await parse(res);
}
async function deleteLink(id){
  const s=getSession();
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!res.ok)await parse(res);await loadLinks();
}

function renderNotes(){
  const q=noteSearch.trim().toLowerCase();
  const notes=currentNotes.filter(n=>!q||[n.title,n.content,n.category].some(v=>String(v||"").toLowerCase().includes(q)));
  const cards=notes.length?notes.map(n=>`
    <article class="item-card">
      <div class="item-row"><div>
        <div class="item-name">${n.pinned?"📌 ":""}${escapeHtml(n.title)}</div>
        <div class="note-content">${escapeHtml(n.content||"").replace(/\n/g,"<br>")}</div>
        <div class="tag">${escapeHtml(n.category)}</div>
      </div></div>
      <div class="actions">
        <button class="btn btn-secondary" data-pin="${n.id}">${n.pinned?"Desafixar":"Fixar"}</button>
        <button class="btn btn-secondary" data-copy="${n.id}">Copiar</button>
        <button class="btn btn-secondary" data-note-edit="${n.id}">Editar</button>
        <button class="btn btn-danger" data-note-delete="${n.id}">Excluir</button>
      </div>
    </article>`).join(""):`<div class="empty">${q?"Nenhuma anotação encontrada.":"Nenhuma anotação ainda."}</div>`;
  renderShell(`
    <div class="toolbar"><div class="muted">Anotações sincronizadas entre seus dispositivos</div><button class="btn btn-primary" id="newNote">+ Nova anotação</button></div>
    <input class="input search" id="noteSearch" placeholder="Buscar nas anotações..." value="${escapeHtml(noteSearch)}">
    <div class="list">${cards}</div>`);
  const search=document.getElementById("noteSearch");
  search.oninput=e=>{noteSearch=e.target.value;renderNotes();document.getElementById("noteSearch")?.focus()};
  document.getElementById("newNote").onclick=()=>showNoteModal();
  document.querySelectorAll("[data-note-edit]").forEach(b=>b.onclick=()=>showNoteModal(currentNotes.find(x=>x.id===b.dataset.noteEdit)));
  document.querySelectorAll("[data-note-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Excluir esta anotação?"))await deleteNote(b.dataset.noteDelete)});
  document.querySelectorAll("[data-pin]").forEach(b=>b.onclick=async()=>{const n=currentNotes.find(x=>x.id===b.dataset.pin);if(n)await updateNote(n.id,{pinned:!n.pinned})});
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const n=currentNotes.find(x=>x.id===b.dataset.copy);if(!n)return;try{await navigator.clipboard.writeText(n.content?`${n.title}\n\n${n.content}`:n.title);alert("Anotação copiada.")}catch{alert("Não foi possível copiar.")}});
}

function showNoteModal(note=null){
  const wrap=document.createElement("div");wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal"><h2>${note?"Editar anotação":"Nova anotação"}</h2>
  <form class="form" id="noteForm">
    <input class="input" id="noteTitle" placeholder="Título" required maxlength="140" value="${note?escapeHtml(note.title):""}">
    <textarea class="textarea" id="noteContent" placeholder="Escreva aqui...">${note?escapeHtml(note.content||""):""}</textarea>
    <select class="select" id="noteCategory">${noteCategories.map(c=>`<option ${note?.category===c?"selected":""}>${c}</option>`).join("")}</select>
    <label class="checkrow"><input type="checkbox" id="notePinned" ${note?.pinned?"checked":""}> Fixar no topo</label>
    <div id="noteMessage" class="error"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelNote">Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
  </form></div>`;
  document.body.appendChild(wrap);
  document.getElementById("cancelNote").onclick=()=>wrap.remove();
  document.getElementById("noteForm").onsubmit=async e=>{
    e.preventDefault();
    const data={title:document.getElementById("noteTitle").value.trim(),content:document.getElementById("noteContent").value.trim(),category:document.getElementById("noteCategory").value,pinned:document.getElementById("notePinned").checked};
    try{if(note)await updateNote(note.id,data,false);else await saveNote(data);wrap.remove();await loadNotes()}catch(err){document.getElementById("noteMessage").textContent=err.message}
  };
}
async function saveNote(data){
  const s=getSession();
  await parse(await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes`,{method:"POST",prefer:"return=representation",body:JSON.stringify({...data,user_id:s.user.id})}));
}
async function updateNote(id,data,reload=true){
  const s=getSession();
  await parse(await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",prefer:"return=representation",body:JSON.stringify({...data,updated_at:new Date().toISOString()})}));
  if(reload)await loadNotes();
}
async function deleteNote(id){
  const s=getSession();
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!res.ok)await parse(res);await loadNotes();
}


function storagePathUrl(path){
  return path.split("/").map(encodeURIComponent).join("/");
}

async function fetchPhotoBlob(path){
  const url=`${SUPABASE_URL}/storage/v1/object/authenticated/receipts/${storagePathUrl(path)}`;
  const res=await authorizedFetch(url,{headers:{"Content-Type":"application/octet-stream"}});
  if(!res.ok){
    let msg="Não foi possível carregar a foto.";
    try{const data=await res.json();msg=data.message||data.error||msg}catch{}
    throw new Error(msg);
  }
  return res.blob();
}

async function hydratePhotoImages(){
  document.querySelectorAll("[data-photo-img]").forEach(async img=>{
    const id=img.dataset.photoImg;
    const photo=currentPhotos.find(p=>p.id===id);
    if(!photo)return;
    try{
      const blob=await fetchPhotoBlob(photo.storage_path);
      const objectUrl=URL.createObjectURL(blob);
      img.src=objectUrl;
      img.onload=()=>URL.revokeObjectURL(objectUrl);
    }catch{
      img.alt="Não foi possível carregar";
    }
  });
}

function renderPhotos(){
  if(selectedPhotoGroup !== null){
    return renderPhotoGroupView();
  }

  const groupCards=currentPhotoGroups.map(g=>{
    const count=currentPhotos.filter(p=>p.group_id===g.id).length;
    return `
      <article class="group-card" data-open-group="${g.id}">
        <div class="group-icon">📁</div>
        <div>
          <div class="item-name">${escapeHtml(g.name)}</div>
          ${g.description?`<div class="note-content">${escapeHtml(g.description)}</div>`:""}
          <div class="group-count">${count} ${count===1?"foto":"fotos"}</div>
        </div>
      </article>`;
  }).join("");

  const ungroupedCount=currentPhotos.filter(p=>!p.group_id).length;
  const ungroupedCard=`
    <article class="group-card" data-open-group="ungrouped">
      <div class="group-icon">🗂️</div>
      <div>
        <div class="item-name">Sem grupo</div>
        <div class="note-content">Fotos e comprovantes avulsos</div>
        <div class="group-count">${ungroupedCount} ${ungroupedCount===1?"foto":"fotos"}</div>
      </div>
    </article>`;

  renderShell(`
    <div class="toolbar">
      <div class="muted">Organize comprovantes por linha, cliente, armador ou processo</div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" id="newGroup">+ Novo grupo</button>
        <button class="btn btn-primary" id="newPhoto">+ Guardar foto</button>
      </div>
    </div>
    <div class="group-grid">${groupCards}${ungroupedCard}</div>`);

  document.getElementById("newGroup").onclick=()=>showGroupModal();
  document.getElementById("newPhoto").onclick=()=>showPhotoModal();
  document.querySelectorAll("[data-open-group]").forEach(card=>card.onclick=()=>{
    selectedPhotoGroup=card.dataset.openGroup==="ungrouped"?"ungrouped":card.dataset.openGroup;
    renderPhotos();
  });
}

function renderPhotoGroupView(){
  const isUngrouped=selectedPhotoGroup==="ungrouped";
  const group=isUngrouped?null:currentPhotoGroups.find(g=>g.id===selectedPhotoGroup);
  const photos=currentPhotos.filter(p=>isUngrouped?!p.group_id:p.group_id===selectedPhotoGroup);

  const cards=photos.length?photos.map(p=>`
    <article class="photo-card">
      <div class="photo-thumb-wrap">
        <img class="photo-thumb" data-photo-img="${p.id}" alt="${escapeHtml(p.title)}">
      </div>
      <div class="photo-body">
        <div class="item-name">${escapeHtml(p.title)}</div>
        ${p.description?`<div class="note-content">${escapeHtml(p.description)}</div>`:""}
        <div class="actions">
          <button class="btn btn-secondary" data-photo-view="${p.id}">Visualizar</button>
          <button class="btn btn-danger" data-photo-delete="${p.id}">Excluir</button>
        </div>
      </div>
    </article>`).join(""):`<div class="empty">Nenhuma foto neste grupo ainda.</div>`;

  renderShell(`
    <div class="toolbar">
      <div>
        <button class="btn btn-link back-btn" id="backGroups">← Voltar aos grupos</button>
        <div class="item-name group-title">${escapeHtml(isUngrouped?"Sem grupo":group?.name||"Grupo")}</div>
        ${group?.description?`<div class="muted">${escapeHtml(group.description)}</div>`:""}
      </div>
      <div class="toolbar-right">
        ${!isUngrouped?`<button class="btn btn-danger" id="deleteGroup">Excluir grupo</button>`:""}
        <button class="btn btn-primary" id="newPhotoInGroup">+ Guardar foto</button>
      </div>
    </div>
    <div class="photo-grid">${cards}</div>`);

  document.getElementById("backGroups").onclick=()=>{selectedPhotoGroup=null;renderPhotos()};
  document.getElementById("newPhotoInGroup").onclick=()=>showPhotoModal(isUngrouped?null:selectedPhotoGroup);
  if(!isUngrouped){
    document.getElementById("deleteGroup").onclick=async()=>{
      if(confirm("Excluir este grupo? As fotos ficarão em Sem grupo.")) await deletePhotoGroup(selectedPhotoGroup);
    };
  }
  document.querySelectorAll("[data-photo-view]").forEach(b=>b.onclick=()=>viewPhoto(b.dataset.photoView));
  document.querySelectorAll("[data-photo-delete]").forEach(b=>b.onclick=async()=>{
    if(confirm("Excluir esta foto e o arquivo armazenado?")) await deletePhoto(b.dataset.photoDelete);
  });
  hydratePhotoImages();
}

function showGroupModal(){
  const wrap=document.createElement("div");
  wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal"><h2>Novo grupo</h2>
    <form class="form" id="groupForm">
      <input class="input" id="groupName" placeholder="Nome do grupo (ex.: CMA CGM)" required maxlength="120">
      <textarea class="textarea photo-description" id="groupDescription" placeholder="Descrição opcional (ex.: Comprovantes da linha Ásia)"></textarea>
      <div id="groupMessage" class="error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancelGroup">Cancelar</button>
        <button class="btn btn-primary" type="submit">Criar grupo</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  document.getElementById("cancelGroup").onclick=()=>wrap.remove();
  document.getElementById("groupForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      await createPhotoGroup(
        document.getElementById("groupName").value.trim(),
        document.getElementById("groupDescription").value.trim()
      );
      wrap.remove();
      await loadPhotos();
    }catch(err){
      document.getElementById("groupMessage").textContent=err.message;
    }
  };
}

async function createPhotoGroup(name,description){
  const s=getSession();
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/photo_groups`,{
    method:"POST",
    prefer:"return=representation",
    body:JSON.stringify({user_id:s.user.id,name,description})
  });
  await parse(res);
}

async function deletePhotoGroup(id){
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/photo_groups?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!res.ok)await parse(res);
  selectedPhotoGroup=null;
  await loadPhotos();
}

function showPhotoModal(preselectedGroupId=null){
  const wrap=document.createElement("div");
  wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal"><h2>Guardar foto</h2>
    <form class="form" id="photoForm">
      <input class="input" id="photoTitle" placeholder="Título (ex.: Comprovante cliente X)" required maxlength="140">
      <textarea class="textarea photo-description" id="photoDescription" placeholder="Observação opcional"></textarea>
      <select class="select" id="photoGroup">
        <option value="">Sem grupo</option>
        ${currentPhotoGroups.map(g=>`<option value="${g.id}" ${preselectedGroupId===g.id?"selected":""}>${escapeHtml(g.name)}</option>`).join("")}
      </select>
      <label class="upload-box">
        <span>Selecionar foto</span>
        <small>JPG, PNG, WEBP ou HEIC • até 10 MB</small>
        <input id="photoFile" type="file" accept="image/*" required>
      </label>
      <div id="photoMessage" class="error"></div>
      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="cancelPhoto">Cancelar</button>
        <button class="btn btn-primary" type="submit" id="savePhoto">Salvar foto</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(wrap);
  document.getElementById("cancelPhoto").onclick=()=>wrap.remove();
  document.getElementById("photoForm").onsubmit=async e=>{
    e.preventDefault();
    const file=document.getElementById("photoFile").files?.[0];
    const title=document.getElementById("photoTitle").value.trim();
    const description=document.getElementById("photoDescription").value.trim();
    const groupId=document.getElementById("photoGroup").value||null;
    const msg=document.getElementById("photoMessage");
    const btn=document.getElementById("savePhoto");
    if(!file)return;
    if(file.size>10*1024*1024){msg.textContent="A foto deve ter no máximo 10 MB.";return}
    if(!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)){msg.textContent="Selecione um arquivo de imagem.";return}
    try{
      btn.disabled=true;btn.textContent="Enviando...";
      await uploadPhoto(file,title,description,groupId);
      wrap.remove();
      await loadPhotos();
    }catch(err){
      msg.textContent=err.message;
      btn.disabled=false;btn.textContent="Salvar foto";
    }
  };
}

async function uploadPhoto(file,title,description,groupId){
  const s=getSession();
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
  const path=`${s.user.id}/${Date.now()}-${safeName}`;
  const uploadUrl=`${SUPABASE_URL}/storage/v1/object/receipts/${storagePathUrl(path)}`;

  const uploadRes=await authorizedFetch(uploadUrl,{
    method:"POST",
    headers:{"Content-Type":file.type||"application/octet-stream","x-upsert":"false"},
    body:file
  });
  if(!uploadRes.ok){
    let data={};try{data=await uploadRes.json()}catch{}
    throw new Error(data.message||data.error||"Não foi possível enviar a foto.");
  }

  try{
    const metaRes=await authorizedFetch(`${SUPABASE_URL}/rest/v1/photos`,{
      method:"POST",
      prefer:"return=representation",
      body:JSON.stringify({
        user_id:s.user.id,
        title,
        description,
        storage_path:path,
        mime_type:file.type||null,
        group_id:groupId
      })
    });
    await parse(metaRes);
  }catch(err){
    await authorizedFetch(uploadUrl,{method:"DELETE"}).catch(()=>{});
    throw err;
  }
}

async function viewPhoto(id){
  const photo=currentPhotos.find(p=>p.id===id);
  if(!photo)return;
  try{
    const blob=await fetchPhotoBlob(photo.storage_path);
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(!w) location.href=url;
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(err){alert(err.message)}
}

async function deletePhoto(id){
  const photo=currentPhotos.find(p=>p.id===id);
  if(!photo)return;
  const objectUrl=`${SUPABASE_URL}/storage/v1/object/receipts/${storagePathUrl(photo.storage_path)}`;
  const storageRes=await authorizedFetch(objectUrl,{method:"DELETE"});
  if(!storageRes.ok){
    let data={};try{data=await storageRes.json()}catch{}
    throw new Error(data.message||data.error||"Não foi possível excluir o arquivo.");
  }
  const metaRes=await authorizedFetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!metaRes.ok)await parse(metaRes);
  await loadPhotos();
}

window.addEventListener("error",e=>{console.error(e.error||e.message)});
if(!SUPABASE_URL||!SUPABASE_KEY) app.innerHTML='<div class="auth"><div class="card"><div class="error">Configuração do Supabase ausente.</div></div></div>';
else if(getSession()) loadData();
else renderAuth();
