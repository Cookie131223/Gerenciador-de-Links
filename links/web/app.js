const { SUPABASE_URL, SUPABASE_KEY } = window.APP_CONFIG;
const app = document.getElementById("app");
const SESSION_KEY = "links-web-session";
const categories = ["Todos","Estudos","Trabalho","Pessoal","Tecnologia","Outros"];
let currentCategory = "Todos";
let currentLinks = [];

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

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

function saveSession(session) { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

async function signIn(email,password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method:"POST", headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  return parse(res);
}

async function signUp(email,password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method:"POST", headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  return parse(res);
}

async function loadLinks() {
  const session = getSession();
  if (!session?.access_token) return renderAuth();
  const params = new URLSearchParams({select:"*",order:"created_at.desc"});
  if (currentCategory !== "Todos") params.set("category",`eq.${currentCategory}`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/links?${params}`, {headers:headers(session.access_token)});
  if (res.status === 401) { clearSession(); return renderAuth(); }
  currentLinks = await parse(res);
  renderManager();
}

function renderAuth(register=false,message="") {
  app.innerHTML = `
    <section class="auth"><div class="card">
      <div class="brand"><div class="logo">↗</div><h1 class="title">Gerenciador de Links</h1></div>
      <p class="subtitle">${register ? "Crie sua conta para salvar e sincronizar seus links." : "Entre para acessar seus links em qualquer dispositivo."}</p>
      <form class="form" id="authForm">
        <input class="input" id="email" type="email" placeholder="E-mail" required autocomplete="email">
        <input class="input" id="password" type="password" placeholder="Senha" minlength="6" required autocomplete="${register?"new-password":"current-password"}">
        <button class="btn btn-primary" type="submit">${register?"Criar conta":"Entrar"}</button>
      </form>
      <button class="btn btn-link" id="toggleAuth">${register?"Já tem uma conta? Entrar":"Ainda não tem conta? Criar conta"}</button>
      <div id="authMessage" class="${message.includes("criada")?"success":"error"}">${message}</div>
    </div></section>`;
  document.getElementById("toggleAuth").onclick=()=>renderAuth(!register);
  document.getElementById("authForm").onsubmit=async e=>{
    e.preventDefault();
    const email=document.getElementById("email").value.trim().toLowerCase();
    const password=document.getElementById("password").value;
    const msg=document.getElementById("authMessage");
    msg.textContent="Aguarde...";
    try {
      const session=register?await signUp(email,password):await signIn(email,password);
      if (register && !session.access_token) return renderAuth(false,"Conta criada. Confira seu e-mail para confirmar e depois faça login.");
      saveSession(session);
      await loadLinks();
    } catch(err){ msg.className="error"; msg.textContent=err.message; }
  };
}

function renderManager() {
  const session=getSession();
  const chips=categories.map(c=>`<button class="chip ${c===currentCategory?"active":""}" data-cat="${c}">${c}</button>`).join("");
  const cards=currentLinks.length?currentLinks.map(link=>`
    <article class="link-card">
      <div class="link-info">
        <div class="link-name">${escapeHtml(link.name)}</div>
        <div class="link-url">${escapeHtml(link.url)}</div>
        <div class="tag">${escapeHtml(link.category)}</div>
      </div>
      <div class="actions">
        <button class="btn btn-secondary" data-open="${link.id}">Abrir</button>
        <button class="btn btn-secondary" data-edit="${link.id}">Editar</button>
        <button class="btn btn-danger" data-delete="${link.id}">Excluir</button>
      </div>
    </article>`).join(""):`<div class="empty">Nenhum link nesta categoria.</div>`;
  app.innerHTML=`
    <section class="shell">
      <div class="toolbar">
        <div><div class="brand"><div class="logo">↗</div><h1 class="title">Meus Links</h1></div><div class="user">${escapeHtml(session?.user?.email||"")}</div></div>
        <div class="toolbar-right"><button class="btn btn-primary" id="newLink">+ Novo link</button><button class="btn btn-secondary" id="logout">Sair</button></div>
      </div>
      <div class="filters">${chips}</div>
      <div class="list">${cards}</div>
    </section>`;
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=async()=>{currentCategory=b.dataset.cat;await loadLinks();});
  document.getElementById("logout").onclick=()=>{clearSession();renderAuth();};
  document.getElementById("newLink").onclick=()=>showLinkModal();
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{const l=currentLinks.find(x=>x.id===b.dataset.open);if(l) window.open(normalizeUrl(l.url),"_blank","noopener");});
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>showLinkModal(currentLinks.find(x=>x.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(confirm("Deseja realmente excluir este link?")) await deleteLink(b.dataset.delete);});
}

function showLinkModal(link=null) {
  const wrap=document.createElement("div");
  wrap.className="modal-backdrop";
  wrap.innerHTML=`<div class="modal"><h2>${link?"Editar link":"Novo link"}</h2>
    <form class="form" id="linkForm">
      <input class="input" id="linkName" placeholder="Nome" required value="${link?escapeAttr(link.name):""}">
      <input class="input" id="linkUrl" placeholder="https://..." required value="${link?escapeAttr(link.url):""}">
      <select class="select" id="linkCategory">${categories.filter(c=>c!=="Todos").map(c=>`<option ${link?.category===c?"selected":""}>${c}</option>`).join("")}</select>
      <div id="linkMessage" class="error"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" id="cancel">Cancelar</button><button class="btn btn-primary" type="submit">Salvar</button></div>
    </form></div>`;
  document.body.appendChild(wrap);
  document.getElementById("cancel").onclick=()=>wrap.remove();
  document.getElementById("linkForm").onsubmit=async e=>{
    e.preventDefault();
    try {
      await saveLink(link?.id,{
        name:document.getElementById("linkName").value.trim(),
        url:normalizeUrl(document.getElementById("linkUrl").value.trim()),
        category:document.getElementById("linkCategory").value
      });
      wrap.remove(); await loadLinks();
    } catch(err){document.getElementById("linkMessage").textContent=err.message;}
  };
}

async function saveLink(id,data) {
  const session=getSession();
  const url=id?`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`:`${SUPABASE_URL}/rest/v1/links`;
  const body=id?data:{...data,user_id:session.user.id};
  const res=await fetch(url,{method:id?"PATCH":"POST",headers:headers(session.access_token,"return=representation"),body:JSON.stringify(body)});
  await parse(res);
}

async function deleteLink(id) {
  const session=getSession();
  const res=await fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:headers(session.access_token)});
  if(!res.ok) await parse(res);
  await loadLinks();
}

function normalizeUrl(url){return /^https?:\/\//i.test(url)?url:`https://${url}`;}
function escapeHtml(v=""){return v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function escapeAttr(v=""){return escapeHtml(v);}

if(!SUPABASE_URL||!SUPABASE_KEY){app.innerHTML='<div class="auth"><div class="card"><div class="error">Configuração do Supabase ausente.</div></div></div>';}
else if(getSession()) loadLinks().catch(e=>{clearSession();renderAuth(false,e.message);});
else renderAuth();
