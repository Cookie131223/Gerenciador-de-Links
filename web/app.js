const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG || {};
const app = document.getElementById("app");
const SESSION_KEY = "links-web-session-v2";
const linkCategories = ["Todos","Estudos","Trabalho","Pessoal","Tecnologia","Outros"];
const noteCategories = ["Pessoal","Trabalho","Faculdade","Ideias"];
const SEXTA_URL = "https://jarvis-hibrido.vercel.app/";
let currentTab = "links";
let currentCategory = "Todos";
let currentLinks = [];
let currentNotes = [];
let currentPhotos = [];
let currentPhotoGroups = [];
let selectedPhotoGroup = null;
let noteSearch = "";
let currentNoteCategory = "Todos";
let contagem = { links: null, notes: null, photos: null };

/* ================= ícones ================= */
const svg = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  link: svg('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  nota: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>'),
  foto: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>'),
  editar: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  lixo: svg('<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>'),
  fixar: svg('<path d="M12 17v5M9 10.76V6h6v4.76l2 2.24v2H7v-2z"/><path d="M8 3h8"/>'),
  copiar: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  abrir: svg('<path d="M7 17 17 7M8 7h9v9"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  sair: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
  busca: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  pasta: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  fechar: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
  voltar: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  ver: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
};

/* ================= Supabase (inalterado) ================= */
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

/* ================= interface: utilidades ================= */
function toast(msg,tipo="ok"){
  const box=document.getElementById("toasts"); if(!box)return;
  const t=document.createElement("div");
  t.className=`toast painel ${tipo==="erro"?"erro":""}`;
  t.innerHTML=`<i></i><span>${escapeHtml(msg)}</span>`;
  box.appendChild(t);
  setTimeout(()=>{t.classList.add("sai");setTimeout(()=>t.remove(),260)},tipo==="erro"?4200:2600);
}

// janela de confirmação própria (no lugar do confirm() do navegador)
function confirmar(titulo,texto,rotulo="Excluir"){
  return new Promise(resolve=>{
    const wrap=document.createElement("div");wrap.className="modal-backdrop";
    wrap.innerHTML=`<div class="modal painel" role="dialog" aria-modal="true" aria-labelledby="cfT"><h2 id="cfT">${escapeHtml(titulo)}</h2>
      <p>${escapeHtml(texto)}</p>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" data-r="0">Cancelar</button><button type="button" class="btn btn-primary" data-r="1">${escapeHtml(rotulo)}</button></div></div>`;
    const fim=v=>{document.removeEventListener("keydown",tecla);wrap.remove();resolve(v)};
    const tecla=e=>{if(e.key==="Escape")fim(false)};
    wrap.addEventListener("click",e=>{if(e.target===wrap)fim(false);const b=e.target.closest("[data-r]");if(b)fim(b.dataset.r==="1")});
    document.addEventListener("keydown",tecla);
    document.body.appendChild(wrap);
    wrap.querySelector('[data-r="1"]').focus();
  });
}

// fecha janelas com Esc ou tocando fora
function prepararModal(wrap){
  const tecla=e=>{if(e.key==="Escape")fechar()};
  const fechar=()=>{document.removeEventListener("keydown",tecla);wrap.remove()};
  document.addEventListener("keydown",tecla);
  wrap.addEventListener("mousedown",e=>{if(e.target===wrap)fechar()});
  setTimeout(()=>wrap.querySelector("input,textarea")?.focus(),30);
  return fechar;
}

function dominio(url){ try{return new URL(normalizeUrl(url)).hostname.replace(/^www\./,"")}catch{return url} }
function dataCurta(iso){ if(!iso)return ""; const d=new Date(iso); return isNaN(d)?"":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}).replace(".","").toUpperCase() }
function saudacao(){ const h=new Date().getHours(); return h<5?"Boa noite":h<12?"Bom dia":h<18?"Boa tarde":"Boa noite" }
const esqueleto=(n,cls="")=>Array.from({length:n},()=>`<div class="esqueleto ${cls}"></div>`).join("");
const vazio=(titulo,texto)=>`<div class="empty"><span class="reator"></span><b>${titulo}</b><span>${texto}</span></div>`;

// contadores do cabeçalho (só leitura, contagem feita pelo próprio Supabase)
async function contar(tabela){
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/${tabela}?select=id`,{method:"HEAD",prefer:"count=exact"});
  const total=(res.headers.get("content-range")||"").split("/")[1];
  return total&&total!=="*"?Number(total):null;
}
async function loadCounts(){
  try{
    const [l,n,f]=await Promise.all([contar("links"),contar("notes"),contar("photos")]);
    contagem={links:l,notes:n,photos:f};
    pintarContadores();
  }catch{}
}
function pintarContadores(){
  for(const k of ["links","notes","photos"]){
    const el=document.querySelector(`[data-cont="${k}"]`);
    if(el&&contagem[k]!=null)el.textContent=contagem[k];
  }
}

// relógio do topo
setInterval(()=>{
  const t=document.getElementById("hubHora"),d=document.getElementById("hubData");
  if(!t)return;
  const agora=new Date();
  t.textContent=agora.toLocaleTimeString("pt-BR");
  d.textContent=agora.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
},1000);

/* ================= login ================= */
function renderAuth(register=false,message=""){
  app.innerHTML=`
  <section class="auth"><div class="painel entra">
    <div class="marca"><span class="reator grande"></span><div><h1 class="title">Meu Hub</h1><div class="marca-sub">MÓDULO DE MEMÓRIA · SEXTA-FEIRA</div></div></div>
    <p class="subtitle">${register?"Crie sua conta para sincronizar links, anotações e fotos.":"Entre para acessar seus links, anotações e fotos em qualquer dispositivo."}</p>
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
    msg.className="muted";msg.textContent="Autenticando...";
    try{
      const session=register?await signUp(email,password):await signIn(email,password);
      if(register&&!session.access_token)return renderAuth(false,"Conta criada. Confira seu e-mail e depois faça login.");
      saveSession(session);
      await loadData(true);
      loadCounts();
    }catch(err){msg.className="error";msg.textContent=err.message}
  };
}

/* ================= dados ================= */
async function loadData(mostrarEsqueleto=false){
  const session=getSession();
  if(!session?.access_token)return renderAuth();
  if(mostrarEsqueleto)renderShell(esqueletoDaAba());
  try{
    if(currentTab==="links") await loadLinks();
    else if(currentTab==="notes") await loadNotes();
    else await loadPhotos();
  }catch(err){
    if(String(err.message).toLowerCase().includes("jwt")){clearSession();return renderAuth()}
    renderShell(`<div class="error">${escapeHtml(err.message)}</div>`);
  }
}
function esqueletoDaAba(){
  if(currentTab==="links")return `<div class="link-grid">${esqueleto(6)}</div>`;
  if(currentTab==="notes")return `<div class="link-grid">${esqueleto(4,"alto")}</div>`;
  return `<div class="group-grid">${esqueleto(3,"alto")}</div>`;
}

async function loadLinks(){
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

/* ================= casca (topo, saudação, abas) ================= */
const ABAS=[["links","Links","link"],["notes","Anotações","nota"],["photos","Fotos","foto"]];
function shell(content){
  const s=getSession();
  const idx=ABAS.findIndex(a=>a[0]===currentTab);
  const cont=k=>contagem[k]==null?"—":contagem[k];
  return `
  <section class="shell">
    <header class="topo painel">
      <div class="marca"><span class="reator"></span><div><h1 class="title">Meu Hub</h1><div class="marca-sub">MÓDULO DE MEMÓRIA · SEXTA-FEIRA</div></div></div>
      <div class="topo-dir">
        <div class="relogio"><span id="hubData">--</span><strong id="hubHora">--:--:--</strong></div>
        <a class="voltar-sexta" href="${SEXTA_URL}" title="Voltar para a Sexta-Feira">${ICON.voltar.replace("<svg","<svg width='13' height='13'")}<span>SEXTA-FEIRA</span></a>
        <button class="icone" id="logout" title="Sair" aria-label="Sair da conta">${ICON.sair}</button>
      </div>
    </header>
    <div class="saudacao">
      <div><h2>${saudacao()}. <em>Tudo sincronizado.</em></h2><div class="operador">OPERADOR · ${escapeHtml(s?.user?.email||"")}</div></div>
      <div class="contadores">
        <span class="contador"><b data-cont="links">${cont("links")}</b>LINKS</span>
        <span class="contador"><b data-cont="notes">${cont("notes")}</b>NOTAS</span>
        <span class="contador"><b data-cont="photos">${cont("photos")}</b>FOTOS</span>
      </div>
    </div>
    <nav class="tabs painel" aria-label="Seções">
      <span class="tab-indicador" style="transform:translateX(${idx*100}%)"></span>
      ${ABAS.map(([id,nome,ic])=>`<button class="tab ${currentTab===id?"active":""}" data-tab="${id}" ${currentTab===id?'aria-current="page"':""}>${ICON[ic]}<span>${nome}</span></button>`).join("")}
    </nav>
    <div id="conteudo">${content}</div>
  </section>`;
}
function bindShell(){
  document.getElementById("logout").onclick=()=>{clearSession();contagem={links:null,notes:null,photos:null};renderAuth()};
  document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{
    if(b.dataset.tab===currentTab)return;
    currentTab=b.dataset.tab;
    if(currentTab==="photos")selectedPhotoGroup=null;
    loadData(true);
  });
  const agora=new Date();
  document.getElementById("hubHora").textContent=agora.toLocaleTimeString("pt-BR");
  document.getElementById("hubData").textContent=agora.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
}
function renderShell(content){
  // reaproveita o topo se ele já estiver na tela (o indicador das abas desliza em vez de pular)
  const atual=document.querySelector(".shell");
  if(atual){
    const idx=ABAS.findIndex(a=>a[0]===currentTab);
    atual.querySelector(".tab-indicador").style.transform=`translateX(${idx*100}%)`;
    atual.querySelectorAll("[data-tab]").forEach(b=>{const on=b.dataset.tab===currentTab;b.classList.toggle("active",on);on?b.setAttribute("aria-current","page"):b.removeAttribute("aria-current")});
    document.getElementById("conteudo").innerHTML=content;
    pintarContadores();
    return;
  }
  app.innerHTML=shell(content);bindShell();
}

/* ================= links ================= */
function renderLinks(){
  const chips=linkCategories.map(c=>`<button class="chip ${c==="Todos"?"todos":""} ${c===currentCategory?"active":""}" data-cat="${c}" data-cor="${c}">${c}</button>`).join("");
  const cards=currentLinks.length?currentLinks.map((l,i)=>{
    const dom=dominio(l.url);
    return `
    <article class="link-card painel entra" style="--i:${i}" data-cor="${escapeHtml(l.category)}">
      <span class="faixa"></span>
      <div class="favicon" data-letra="${escapeHtml((l.name||dom||"?").trim().charAt(0))}"><img src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(dom)}.ico" alt="" loading="lazy"></div>
      <div class="link-info">
        <a class="item-name link-nome" href="${escapeHtml(normalizeUrl(l.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.name)}</a>
        <div class="dominio">${escapeHtml(dom)}</div>
        <span class="tag" data-cor="${escapeHtml(l.category)}">${escapeHtml(l.category)}</span>
      </div>
      <div class="link-acoes">
        <button class="icone" data-edit="${l.id}" title="Editar" aria-label="Editar ${escapeHtml(l.name)}">${ICON.editar}</button>
        <button class="icone perigo" data-delete="${l.id}" title="Excluir" aria-label="Excluir ${escapeHtml(l.name)}">${ICON.lixo}</button>
      </div>
      <span class="link-abrir" aria-hidden="true">${ICON.abrir}</span>
    </article>`}).join(""):vazio("NENHUM LINK AQUI",currentCategory==="Todos"?"Salve o primeiro link no botão “Novo link”.":"Nenhum link nesta categoria.");
  renderShell(`
    <div class="toolbar"><div class="secao-h">Links salvos<small>Sincronizados na nuvem entre seus aparelhos</small></div><button class="btn btn-primary" id="newLink">${ICON.mais}Novo link</button></div>
    <div class="filters">${chips}</div><div class="link-grid">${cards}</div>`);
  document.querySelectorAll(".favicon img").forEach(img=>img.addEventListener("error",()=>{const f=img.parentElement;img.remove();f.textContent=f.dataset.letra}));
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{currentCategory=b.dataset.cat;loadLinks()});
  document.getElementById("newLink").onclick=()=>showLinkModal();
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>showLinkModal(currentLinks.find(x=>x.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{
    const l=currentLinks.find(x=>x.id===b.dataset.delete);
    if(await confirmar("Excluir link",`“${l?.name||"Este link"}” será removido de todos os seus aparelhos.`)){
      try{await deleteLink(b.dataset.delete);toast("Link excluído.")}catch(err){toast(err.message,"erro")}
    }
  });
}

function showLinkModal(link=null){
  const wrap=document.createElement("div");wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal painel" role="dialog" aria-modal="true"><h2>${link?"Editar link":"Novo link"}</h2>
  <form class="form" id="linkForm">
    <input class="input" id="linkName" placeholder="Nome" required value="${link?escapeHtml(link.name):""}">
    <input class="input" id="linkUrl" placeholder="https://..." required value="${link?escapeHtml(link.url):""}">
    <select class="select" id="linkCategory">${linkCategories.filter(c=>c!=="Todos").map(c=>`<option ${link?.category===c?"selected":""}>${c}</option>`).join("")}</select>
    <div id="linkMessage" class="error"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancel">Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
  </form></div>`;
  document.body.appendChild(wrap);
  const fechar=prepararModal(wrap);
  document.getElementById("cancel").onclick=fechar;
  document.getElementById("linkForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      await saveLink(link?.id,{name:document.getElementById("linkName").value.trim(),url:normalizeUrl(document.getElementById("linkUrl").value.trim()),category:document.getElementById("linkCategory").value});
      fechar();await loadLinks();loadCounts();toast(link?"Link atualizado.":"Link salvo.");
    }catch(err){document.getElementById("linkMessage").textContent=err.message}
  };
}
async function saveLink(id,data){
  const s=getSession(),url=id?`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`:`${SUPABASE_URL}/rest/v1/links`;
  const res=await authorizedFetch(url,{method:id?"PATCH":"POST",prefer:"return=representation",body:JSON.stringify(id?data:{...data,user_id:s.user.id})});
  await parse(res);
}
async function deleteLink(id){
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!res.ok)await parse(res);await loadLinks();loadCounts();
}

/* ================= anotações ================= */
function notasFiltradas(){
  const q=noteSearch.trim().toLowerCase();
  return currentNotes.filter(n=>{
    const matchesSearch=!q||[n.title,n.content,n.category].some(v=>String(v||"").toLowerCase().includes(q));
    const matchesCategory=currentNoteCategory==="Todos"||n.category===currentNoteCategory;
    return matchesSearch&&matchesCategory;
  });
}
function cartoesNotas(animar=true){
  const notes=notasFiltradas();
  if(!notes.length)return vazio(noteSearch.trim()?"NADA ENCONTRADO":"NENHUMA ANOTAÇÃO",noteSearch.trim()?"Tente outra palavra na busca.":"Crie a primeira no botão “Nova anotação”.");
  return notes.map((n,i)=>{
    const longa=(n.content||"").length>360||(n.content||"").split("\n").length>8;
    return `
    <article class="nota painel ${animar?"entra":""} ${n.pinned?"fixada":""}" style="--i:${i}" data-cor="${escapeHtml(n.category)}">
      <span class="faixa-topo"></span>
      <div class="nota-topo"><div class="nota-titulo">${escapeHtml(n.title)}</div>${n.pinned?'<span class="fixada-tag">FIXADA</span>':""}</div>
      ${n.content?`<div class="note-content ${longa?"cortada":""}">${escapeHtml(n.content)}</div>${longa?'<button class="ver-mais" data-mais>Ver mais</button>':""}`:""}
      <div class="nota-rodape">
        <span class="tag" data-cor="${escapeHtml(n.category)}">${escapeHtml(n.category)}</span>
        <span class="data">${dataCurta(n.updated_at||n.created_at)}</span>
      </div>
      <div class="nota-rodape">
        <div class="nota-acoes">
          <button class="icone ${n.pinned?"ativo":""}" data-pin="${n.id}" title="${n.pinned?"Desafixar":"Fixar no topo"}" aria-label="${n.pinned?"Desafixar":"Fixar"}">${ICON.fixar}</button>
          <button class="icone" data-copy="${n.id}" title="Copiar" aria-label="Copiar">${ICON.copiar}</button>
          <button class="icone" data-note-edit="${n.id}" title="Editar" aria-label="Editar">${ICON.editar}</button>
          <button class="icone perigo" data-note-delete="${n.id}" title="Excluir" aria-label="Excluir">${ICON.lixo}</button>
        </div>
      </div>
    </article>`}).join("");
}
function ligarNotas(){
  document.querySelectorAll("[data-mais]").forEach(b=>b.onclick=()=>{const c=b.previousElementSibling;const aberto=c.classList.toggle("cortada");b.textContent=aberto?"Ver mais":"Ver menos"});
  document.querySelectorAll("[data-note-edit]").forEach(b=>b.onclick=()=>showNoteModal(currentNotes.find(x=>x.id===b.dataset.noteEdit)));
  document.querySelectorAll("[data-note-delete]").forEach(b=>b.onclick=async()=>{
    const n=currentNotes.find(x=>x.id===b.dataset.noteDelete);
    if(await confirmar("Excluir anotação",`“${n?.title||"Esta anotação"}” será apagada de todos os seus aparelhos.`)){
      try{await deleteNote(b.dataset.noteDelete);toast("Anotação excluída.")}catch(err){toast(err.message,"erro")}
    }
  });
  document.querySelectorAll("[data-pin]").forEach(b=>b.onclick=async()=>{const n=currentNotes.find(x=>x.id===b.dataset.pin);if(n){try{await updateNote(n.id,{pinned:!n.pinned});toast(n.pinned?"Anotação desafixada.":"Anotação fixada no topo.")}catch(err){toast(err.message,"erro")}}});
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=async()=>{const n=currentNotes.find(x=>x.id===b.dataset.copy);if(!n)return;try{await navigator.clipboard.writeText(n.content?`${n.title}\n\n${n.content}`:n.title);toast("Anotação copiada.")}catch{toast("Não foi possível copiar.","erro")}});
}
function renderNotes(){
  const chips=["Todos",...noteCategories].map(c=>`<button class="chip ${c==="Todos"?"todos":""} ${c===currentNoteCategory?"active":""}" data-note-cat="${c}" data-cor="${c}">${c}</button>`).join("");
  renderShell(`
    <div class="toolbar"><div class="secao-h">Anotações<small>Sincronizadas entre seus dispositivos</small></div><button class="btn btn-primary" id="newNote">${ICON.mais}Nova anotação</button></div>
    <div class="filters">${chips}</div>
    <label class="busca">${ICON.busca}<input class="input" id="noteSearch" placeholder="Buscar nas anotações..." value="${escapeHtml(noteSearch)}" aria-label="Buscar nas anotações"></label>
    <div class="mural" id="mural">${cartoesNotas()}</div>`);
  ligarNotas();
  document.querySelectorAll("[data-note-cat]").forEach(b=>b.onclick=()=>{
    currentNoteCategory=b.dataset.noteCat;
    renderNotes();
  });
  // a busca atualiza só o mural (o campo não perde o foco e os cartões não piscam)
  document.getElementById("noteSearch").oninput=e=>{noteSearch=e.target.value;document.getElementById("mural").innerHTML=cartoesNotas(false);ligarNotas()};
  document.getElementById("newNote").onclick=()=>showNoteModal();
}

function showNoteModal(note=null){
  const wrap=document.createElement("div");wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal painel" role="dialog" aria-modal="true"><h2>${note?"Editar anotação":"Nova anotação"}</h2>
  <form class="form" id="noteForm">
    <input class="input" id="noteTitle" placeholder="Título" required maxlength="140" value="${note?escapeHtml(note.title):""}">
    <textarea class="textarea" id="noteContent" placeholder="Escreva aqui...">${note?escapeHtml(note.content||""):""}</textarea>
    <select class="select" id="noteCategory">${noteCategories.map(c=>`<option ${note?.category===c?"selected":""}>${c}</option>`).join("")}</select>
    <label class="checkrow"><input type="checkbox" id="notePinned" ${note?.pinned?"checked":""}> Fixar no topo</label>
    <div id="noteMessage" class="error"></div>
    <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancelNote">Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
  </form></div>`;
  document.body.appendChild(wrap);
  const fechar=prepararModal(wrap);
  document.getElementById("cancelNote").onclick=fechar;
  document.getElementById("noteForm").onsubmit=async e=>{
    e.preventDefault();
    const data={title:document.getElementById("noteTitle").value.trim(),content:document.getElementById("noteContent").value.trim(),category:document.getElementById("noteCategory").value,pinned:document.getElementById("notePinned").checked};
    try{if(note)await updateNote(note.id,data,false);else await saveNote(data);fechar();await loadNotes();loadCounts();toast(note?"Anotação atualizada.":"Anotação salva.")}catch(err){document.getElementById("noteMessage").textContent=err.message}
  };
}
async function saveNote(data){
  const s=getSession();
  await parse(await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes`,{method:"POST",prefer:"return=representation",body:JSON.stringify({...data,user_id:s.user.id})}));
}
async function updateNote(id,data,reload=true){
  await parse(await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",prefer:"return=representation",body:JSON.stringify({...data,updated_at:new Date().toISOString()})}));
  if(reload)await loadNotes();
}
async function deleteNote(id){
  const res=await authorizedFetch(`${SUPABASE_URL}/rest/v1/notes?id=eq.${encodeURIComponent(id)}`,{method:"DELETE"});
  if(!res.ok)await parse(res);await loadNotes();loadCounts();
}

/* ================= fotos ================= */
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
  // capa = foto mais recente do grupo
  const capa=fotos=>fotos[0]?`<img data-photo-img="${fotos[0].id}" alt="">`:ICON.pasta;
  const grupos=[...currentPhotoGroups.map(g=>({id:g.id,nome:g.name,desc:g.description,fotos:currentPhotos.filter(p=>p.group_id===g.id)})),
    {id:"ungrouped",nome:"Sem grupo",desc:"Fotos e comprovantes avulsos",fotos:currentPhotos.filter(p=>!p.group_id)}];

  const cards=grupos.map((g,i)=>`
      <button class="group-card painel entra" style="--i:${i}" data-open-group="${g.id}">
        <div class="capa">${capa(g.fotos)}<span class="group-count">${g.fotos.length} ${g.fotos.length===1?"FOTO":"FOTOS"}</span></div>
        <div class="group-body">
          <div class="item-name">${escapeHtml(g.nome)}</div>
          ${g.desc?`<div class="note-content">${escapeHtml(g.desc)}</div>`:""}
        </div>
      </button>`).join("");

  renderShell(`
    <div class="toolbar">
      <div class="secao-h">Fotos e comprovantes<small>Organize por linha, cliente, armador ou processo</small></div>
      <div class="toolbar-right">
        <button class="btn btn-secondary" id="newGroup">${ICON.pasta}Novo grupo</button>
        <button class="btn btn-primary" id="newPhoto">${ICON.mais}Guardar foto</button>
      </div>
    </div>
    <div class="group-grid">${cards}</div>`);

  document.getElementById("newGroup").onclick=()=>showGroupModal();
  document.getElementById("newPhoto").onclick=()=>showPhotoModal();
  document.querySelectorAll("[data-open-group]").forEach(card=>card.onclick=()=>{
    selectedPhotoGroup=card.dataset.openGroup==="ungrouped"?"ungrouped":card.dataset.openGroup;
    renderPhotos();
  });
  hydratePhotoImages();
}

function renderPhotoGroupView(){
  const isUngrouped=selectedPhotoGroup==="ungrouped";
  const group=isUngrouped?null:currentPhotoGroups.find(g=>g.id===selectedPhotoGroup);
  const photos=currentPhotos.filter(p=>isUngrouped?!p.group_id:p.group_id===selectedPhotoGroup);

  const cards=photos.length?photos.map((p,i)=>`
    <article class="photo-card painel entra" style="--i:${i}">
      <button class="photo-thumb-wrap" data-photo-view="${p.id}" aria-label="Ver ${escapeHtml(p.title)}">
        <img class="photo-thumb" data-photo-img="${p.id}" alt="${escapeHtml(p.title)}">
      </button>
      <div class="photo-body">
        <div class="item-name">${escapeHtml(p.title)}</div>
        ${p.description?`<div class="note-content">${escapeHtml(p.description)}</div>`:""}
        <div class="nota-rodape">
          <span class="data">${dataCurta(p.created_at)}</span>
          <div class="nota-acoes">
            <button class="icone" data-photo-view="${p.id}" title="Ver" aria-label="Ver foto">${ICON.ver}</button>
            <button class="icone perigo" data-photo-delete="${p.id}" title="Excluir" aria-label="Excluir foto">${ICON.lixo}</button>
          </div>
        </div>
      </div>
    </article>`).join(""):vazio("GRUPO VAZIO","Nenhuma foto neste grupo ainda.");

  renderShell(`
    <div class="toolbar">
      <div>
        <button class="btn btn-link back-btn" id="backGroups">← Voltar aos grupos</button>
        <div class="group-title">${escapeHtml(isUngrouped?"Sem grupo":group?.name||"Grupo")}</div>
        ${group?.description?`<div class="muted">${escapeHtml(group.description)}</div>`:""}
      </div>
      <div class="toolbar-right">
        ${!isUngrouped?`<button class="btn btn-danger" id="deleteGroup">${ICON.lixo}Excluir grupo</button>`:""}
        <button class="btn btn-primary" id="newPhotoInGroup">${ICON.mais}Guardar foto</button>
      </div>
    </div>
    <div class="photo-grid">${cards}</div>`);

  document.getElementById("backGroups").onclick=()=>{selectedPhotoGroup=null;renderPhotos()};
  document.getElementById("newPhotoInGroup").onclick=()=>showPhotoModal(isUngrouped?null:selectedPhotoGroup);
  if(!isUngrouped){
    document.getElementById("deleteGroup").onclick=async()=>{
      if(await confirmar("Excluir grupo","O grupo será apagado e as fotos dele irão para “Sem grupo”.")){
        try{await deletePhotoGroup(selectedPhotoGroup);toast("Grupo excluído.")}catch(err){toast(err.message,"erro")}
      }
    };
  }
  document.querySelectorAll("[data-photo-view]").forEach(b=>b.onclick=()=>viewPhoto(b.dataset.photoView));
  document.querySelectorAll("[data-photo-delete]").forEach(b=>b.onclick=async()=>{
    if(!await confirmar("Excluir foto","A foto e o arquivo armazenado serão apagados."))return;
    b.disabled=true;
    try{await deletePhoto(b.dataset.photoDelete);toast("Foto excluída.")}
    catch(err){toast(err.message||"Não foi possível excluir a foto. Tente novamente.","erro")}
    finally{b.disabled=false}
  });
  hydratePhotoImages();
}

function showGroupModal(){
  const wrap=document.createElement("div");
  wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal painel" role="dialog" aria-modal="true"><h2>Novo grupo</h2>
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
  const fechar=prepararModal(wrap);
  document.getElementById("cancelGroup").onclick=fechar;
  document.getElementById("groupForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      await createPhotoGroup(
        document.getElementById("groupName").value.trim(),
        document.getElementById("groupDescription").value.trim()
      );
      fechar();
      await loadPhotos();
      toast("Grupo criado.");
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
  wrap.innerHTML=`<div class="modal painel" role="dialog" aria-modal="true"><h2>Guardar foto</h2>
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
  const fechar=prepararModal(wrap);
  document.getElementById("cancelPhoto").onclick=fechar;
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
      fechar();
      await loadPhotos();
      loadCounts();
      toast("Foto guardada.");
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
    await removePhotoFile(path).catch(()=>{});
    throw err;
  }
}

// visualizador dentro do próprio site
async function viewPhoto(id){
  const photo=currentPhotos.find(p=>p.id===id);
  if(!photo)return;
  const wrap=document.createElement("div");
  wrap.className="lightbox";wrap.setAttribute("role","dialog");wrap.setAttribute("aria-modal","true");
  wrap.innerHTML=`<div class="lightbox-topo"><div><div class="item-name">${escapeHtml(photo.title)}</div>${photo.description?`<div class="muted">${escapeHtml(photo.description)}</div>`:""}</div>
    <div class="nota-acoes"><a class="icone" id="lbOriginal" title="Abrir original" aria-label="Abrir original" target="_blank" rel="noopener" hidden>${ICON.abrir}</a><button class="icone" id="lbFechar" title="Fechar" aria-label="Fechar">${ICON.fechar}</button></div></div>
    <div class="lightbox-img"><div class="boot-txt">CARREGANDO IMAGEM</div></div>`;
  document.body.appendChild(wrap);
  let url=null;
  const tecla=e=>{if(e.key==="Escape")fechar()};
  const fechar=()=>{document.removeEventListener("keydown",tecla);wrap.remove();if(url)setTimeout(()=>URL.revokeObjectURL(url),60000)};
  document.addEventListener("keydown",tecla);
  wrap.querySelector("#lbFechar").onclick=fechar;
  wrap.querySelector(".lightbox-img").addEventListener("click",e=>{if(e.target.classList.contains("lightbox-img"))fechar()});
  wrap.querySelector("#lbFechar").focus();
  try{
    const blob=await fetchPhotoBlob(photo.storage_path);
    url=URL.createObjectURL(blob);
    const img=new Image();img.src=url;img.alt=photo.title;
    wrap.querySelector(".lightbox-img").replaceChildren(img);
    const orig=wrap.querySelector("#lbOriginal");orig.href=url;orig.hidden=false;
  }catch(err){fechar();toast(err.message,"erro")}
}

async function removePhotoFile(path){
  const res=await authorizedFetch(`${SUPABASE_URL}/storage/v1/object/receipts`,{
    method:"DELETE",
    body:JSON.stringify({prefixes:[path]})
  });
  return parse(res);
}

async function deletePhoto(id){
  const photo=currentPhotos.find(p=>p.id===id);
  if(!photo)return;
  await removePhotoFile(photo.storage_path);
  const metaRes=await authorizedFetch(`${SUPABASE_URL}/rest/v1/photos?id=eq.${encodeURIComponent(id)}`,{
    method:"DELETE",
    prefer:"return=representation"
  });
  const deleted=await parse(metaRes);
  if(!Array.isArray(deleted)||!deleted.some(p=>p.id===id)){
    throw new Error("O registro da foto não foi excluído. Atualize a página e tente novamente.");
  }
  await loadPhotos();
  loadCounts();
}

window.addEventListener("error",e=>{console.error(e.error||e.message)});
if(!SUPABASE_URL||!SUPABASE_KEY) app.innerHTML='<div class="auth"><div class="painel" style="padding:24px"><div class="error">Configuração do Supabase ausente.</div></div></div>';
else if(getSession()) { loadData(true); loadCounts(); }
else renderAuth();
