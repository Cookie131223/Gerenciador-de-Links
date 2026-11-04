/* Meu Hub · MODO VITRINE (link do portfólio: /?vitrine)
   Quem abre com ?vitrine vê o app funcionando com dados de exemplo, sem conta e sem tocar no Supabase.
   Dá para trocar de aba, filtrar, buscar, abrir grupos e ver fotos; criar, editar, excluir e sair ficam travados.
   Sem ?vitrine no endereço, este arquivo não faz nada. */
(() => {
  'use strict';
  if (!new URLSearchParams(location.search).has('vitrine')) return;

  // ===== TEXTOS (edite aqui) =====
  const FAIXA = 'MODO VITRINE · SÓ PARA VER';
  const AVISO = 'Modo vitrine: aqui é só para ver. Nada pode ser criado, editado ou excluído.';
  const OPERADOR = 'visitante · modo vitrine';
  const SEXTA_VITRINE = 'https://jarvis-hibrido.vercel.app/?vitrine';

  const { SUPABASE_URL } = window.APP_CONFIG || {};
  const SESSION_KEY = 'links-web-session-v2';
  const SESSAO = { access_token: 'vitrine', refresh_token: null, user: { id: 'vitrine', email: OPERADOR } };
  document.documentElement.classList.add('hub-vitrine');

  // a sessão de exemplo fica só na memória (não apaga nem troca a conta salva neste navegador)
  const getOrig = Storage.prototype.getItem, setOrig = Storage.prototype.setItem, remOrig = Storage.prototype.removeItem;
  Storage.prototype.getItem = function (k) { return k === SESSION_KEY ? JSON.stringify(SESSAO) : getOrig.call(this, k); };
  Storage.prototype.setItem = function (k, v) { if (k !== SESSION_KEY) setOrig.call(this, k, v); };
  Storage.prototype.removeItem = function (k) { if (k !== SESSION_KEY) remOrig.call(this, k); };

  // ===== DADOS DE EXEMPLO =====
  const dias = n => new Date(Date.now() - n * 864e5).toISOString();
  const LINKS = [
    ['Documentação do Supabase', 'https://supabase.com/docs', 'Tecnologia', 1],
    ['MDN · JavaScript', 'https://developer.mozilla.org/pt-BR/docs/Web/JavaScript', 'Estudos', 2],
    ['Repositórios no GitHub', 'https://github.com/Cookie131223', 'Trabalho', 3],
    ['Painel da Vercel', 'https://vercel.com/dashboard', 'Trabalho', 4],
    ['React Native · Docs', 'https://reactnative.dev/docs/getting-started', 'Estudos', 6],
    ['Expo · Guias', 'https://docs.expo.dev/', 'Tecnologia', 8],
    ['Roadmap Back-end', 'https://roadmap.sh/backend', 'Estudos', 10],
    ['Playlist para focar', 'https://open.spotify.com/', 'Pessoal', 12],
    ['Three.js · Exemplos', 'https://threejs.org/examples/', 'Tecnologia', 15],
    ['Receitas da semana', 'https://www.tudogostoso.com.br/', 'Pessoal', 20],
    ['Figma', 'https://www.figma.com/', 'Outros', 25],
  ].map(([name, url, category, d], i) => ({ id: 'l' + i, name, url, category, created_at: dias(d) }));

  const NOTAS = [
    ['Ideias para a Sexta-Feira', 'Briefing da manhã com clima e agenda ✔\nVisão pela câmera ✔\nPróximo: resumo das notícias por voz no carro\nTestar ativação facial com pouca luz', 'Ideias', true, 1],
    ['Prova de Banco de Dados', 'Revisar normalização (1FN, 2FN, 3FN), JOINs e índices.\nFazer a lista 3 até quinta.\nLevar calculadora.', 'Faculdade', true, 2],
    ['Checklist de deploy', '1. Rodar os testes\n2. Conferir variáveis na Vercel\n3. Guardar o deploy anterior\n4. Publicar e testar no celular', 'Trabalho', false, 3],
    ['Livros para ler', 'Código Limpo\nO Programador Pragmático\nEntendendo Algoritmos', 'Pessoal', false, 5],
    ['Reunião do grupo', 'Projeto Montar PC: eu fico com a tela de peças e a pontuação. Entrega na sexta.', 'Faculdade', false, 6],
    ['Atalhos úteis do VS Code', 'Ctrl+P abrir arquivo\nCtrl+Shift+L selecionar todas as ocorrências\nAlt+↑/↓ mover linha\nCtrl+` terminal', 'Trabalho', false, 9],
  ].map(([title, content, category, pinned, d], i) => ({ id: 'n' + i, title, content, category, pinned, created_at: dias(d + 3), updated_at: dias(d) }));

  const GRUPOS = [
    { id: 'g0', name: 'Faculdade', description: 'Quadros das aulas e listas de exercícios', created_at: dias(3) },
    { id: 'g1', name: 'Projetos', description: 'Rascunhos de telas e diagramas', created_at: dias(7) },
  ];
  const FOTOS = [
    ['Quadro · Normalização', 'Aula de Banco de Dados', 'g0', 'quadro', 1],
    ['Lista 3 de exercícios', '', 'g0', 'folha', 4],
    ['Diagrama da Sexta-Feira', 'Voz, IA, lembretes e casa', 'g1', 'diagrama', 2],
    ['Rascunho do Meu Hub', 'Primeira ideia das abas', 'g1', 'tela', 9],
    ['Comprovante · curso online', 'Pago no cartão', null, 'recibo', 5],
  ].map(([title, description, group_id, tipo, d], i) => ({ id: 'p' + i, title, description, group_id, tipo, storage_path: 'vitrine/' + i, mime_type: 'image/svg+xml', created_at: dias(d) }));

  // imagens de exemplo desenhadas aqui mesmo (SVG), no visual do app
  function imagem(p) {
    const W = 800, H = 600, txt = (x, y, t, s = 26, c = '#ffe6e2', a = 'start') => `<text x="${x}" y="${y}" font-family="monospace" font-size="${s}" fill="${c}" text-anchor="${a}">${t}</text>`;
    let corpo = '';
    if (p.tipo === 'quadro') corpo = `<rect x="40" y="40" width="720" height="520" rx="10" fill="#0f1a16" stroke="#3a5a4c" stroke-width="6"/>` +
      txt(80, 110, 'NORMALIZAÇÃO', 34, '#e8f5ee') + txt(80, 170, '1FN → valores atômicos', 26, '#cfe8db') + txt(80, 220, '2FN → sem dependência parcial', 26, '#cfe8db') +
      txt(80, 270, '3FN → sem dependência transitiva', 26, '#cfe8db') + `<rect x="80" y="320" width="200" height="150" fill="none" stroke="#9fd3b8" stroke-width="3"/><rect x="420" y="320" width="200" height="150" fill="none" stroke="#9fd3b8" stroke-width="3"/><path d="M280 395 H420" stroke="#9fd3b8" stroke-width="3"/>` +
      txt(180, 400, 'ALUNO', 22, '#e8f5ee', 'middle') + txt(520, 400, 'CURSO', 22, '#e8f5ee', 'middle') + txt(350, 385, '1:N', 20, '#ffd27a', 'middle');
    else if (p.tipo === 'folha') corpo = `<rect x="150" y="30" width="500" height="540" fill="#f4efe6"/>` + txt(190, 90, 'LISTA 3 · BANCO DE DADOS', 24, '#3a2a2a') +
      [0, 1, 2, 3, 4, 5].map(i => `<rect x="190" y="${130 + i * 70}" width="${300 + (i % 3) * 50}" height="12" rx="6" fill="#c9bfb0"/><rect x="190" y="${152 + i * 70}" width="${220 + (i % 2) * 90}" height="12" rx="6" fill="#ddd4c6"/>`).join('');
    else if (p.tipo === 'diagrama') {
      const caixa = (x, y, t) => `<rect x="${x}" y="${y}" width="200" height="80" rx="10" fill="#1a0609" stroke="#ff3b3b" stroke-width="3"/>` + txt(x + 100, y + 50, t, 24, '#ffe6e2', 'middle');
      corpo = `<circle cx="400" cy="300" r="70" fill="#2a0a0f" stroke="#ffb4ab" stroke-width="4"/>` + txt(400, 308, 'SEXTA', 26, '#ffb4ab', 'middle') +
        caixa(60, 80, 'VOZ') + caixa(540, 80, 'IA') + caixa(60, 440, 'LEMBRETES') + caixa(540, 440, 'CASA') +
        `<path d="M260 140 L345 250 M540 140 L455 250 M260 470 L345 350 M540 470 L455 350" stroke="#ff3b3b" stroke-width="3" stroke-dasharray="8 6"/>`;
    } else if (p.tipo === 'tela') corpo = `<rect x="250" y="30" width="300" height="540" rx="30" fill="#140407" stroke="#8f1d29" stroke-width="4"/>` +
      txt(400, 90, 'MEU HUB', 26, '#ffb4ab', 'middle') + ['LINKS', 'NOTAS', 'FOTOS'].map((t, i) => `<rect x="${275 + i * 87}" y="115" width="80" height="34" rx="6" fill="${i ? '#2a0a0f' : '#ff3b3b'}"/>` + txt(315 + i * 87, 138, t, 16, '#ffe6e2', 'middle')).join('') +
      [0, 1, 2, 3, 4].map(i => `<rect x="275" y="${175 + i * 75}" width="250" height="60" rx="8" fill="#1f070b" stroke="#4a131b"/><circle cx="305" cy="${205 + i * 75}" r="14" fill="#8f1d29"/><rect x="330" y="${195 + i * 75}" width="${150 - i * 12}" height="10" rx="5" fill="#c08a86"/>`).join('');
    else corpo = `<rect x="220" y="40" width="360" height="520" fill="#f7f5f0"/>` + txt(400, 100, 'COMPROVANTE', 28, '#222', 'middle') + txt(400, 135, 'PAGAMENTO APROVADO', 18, '#2e7d32', 'middle') +
      [['Curso online', 'R$ 49,90'], ['Forma', 'Cartão'], ['Data', new Date(p.created_at).toLocaleDateString('pt-BR')], ['Código', 'A7F3-91C2']].map(([a, b], i) => txt(250, 200 + i * 50, a, 20, '#555') + txt(550, 200 + i * 50, b, 20, '#222', 'end')).join('') +
      `<path d="M250 420 H550" stroke="#bbb" stroke-dasharray="6 6"/>` + txt(250, 470, 'TOTAL', 24, '#222') + txt(550, 470, 'R$ 49,90', 24, '#222', 'end');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#0a0204"/>${corpo}</svg>`;
  }

  // ===== respostas no lugar do Supabase =====
  const json = (dados, extra = {}) => new Response(JSON.stringify(dados), { status: 200, headers: { 'Content-Type': 'application/json', ...extra } });
  const travado = () => new Response(JSON.stringify({ message: AVISO }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  const fetchOrig = window.fetch.bind(window);
  window.fetch = async (entrada, opcoes = {}) => {
    const url = typeof entrada === 'string' ? entrada : entrada.url;
    if (!SUPABASE_URL || !url.startsWith(SUPABASE_URL)) return fetchOrig(entrada, opcoes);
    const metodo = (opcoes.method || 'GET').toUpperCase();
    const u = new URL(url);
    const foto = u.pathname.match(/\/storage\/v1\/object\/authenticated\/receipts\/vitrine\/(\d+)/);
    if (foto && metodo === 'GET') { const p = FOTOS[+foto[1]]; return new Response(new Blob([imagem(p)], { type: 'image/svg+xml' }), { status: 200 }); }
    if (metodo !== 'GET' && metodo !== 'HEAD') return travado();
    const tabela = (u.pathname.match(/\/rest\/v1\/(\w+)/) || [])[1];
    let dados = { links: LINKS, notes: NOTAS, photos: FOTOS, photo_groups: GRUPOS }[tabela];
    if (!dados) return travado();
    const cat = u.searchParams.get('category');
    if (cat?.startsWith('eq.')) dados = dados.filter(x => x.category === cat.slice(3));
    if (tabela === 'notes') dados = [...dados].sort((a, b) => (b.pinned - a.pinned) || (b.updated_at > a.updated_at ? 1 : -1));
    if (metodo === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': `0-${dados.length - 1}/${dados.length}` } });
    return json(dados);
  };

  // ===== travas na interface =====
  const BLOQUEADOS = '#newLink,[data-edit],[data-delete],#newNote,[data-note-edit],[data-note-delete],[data-pin],#newGroup,#newPhoto,#newPhotoInGroup,#deleteGroup,[data-photo-delete],#logout';
  let faixa;
  document.addEventListener('click', e => {
    const alvo = e.target.closest(BLOQUEADOS); if (!alvo) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try { toast(AVISO); } catch {}
    if (faixa) { faixa.classList.remove('pulso'); void faixa.offsetWidth; faixa.classList.add('pulso'); }
  }, true);

  const css = document.createElement('style');
  css.textContent = `
    .vitrine-faixa{position:fixed;z-index:60;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;align-items:center;gap:10px;
      width:max-content;max-width:calc(100vw - 32px);padding:8px 16px;border:1px solid var(--line-hi);border-radius:999px;background:rgba(10,2,4,.92);
      font:12px var(--f-mono);letter-spacing:.24em;color:var(--arc-hi);box-shadow:0 0 22px rgba(255,59,59,.28);pointer-events:none}
    .vitrine-faixa i{width:7px;height:7px;border-radius:50%;background:#ffb547;box-shadow:0 0 8px #ffb547;animation:vitPisca 1.6s ease-in-out infinite}
    .vitrine-faixa.pulso{animation:vitPulso .6s ease 2}
    @keyframes vitPisca{50%{opacity:.25}}
    @keyframes vitPulso{50%{box-shadow:0 0 34px rgba(255,59,59,.75);border-color:var(--arc)}}
    .hub-vitrine #logout{display:none}
    .hub-vitrine .shell{padding-bottom:64px}
    .hub-vitrine .toasts{bottom:calc(64px + env(safe-area-inset-bottom))}
    @media (max-width:640px){
      .vitrine-faixa{bottom:calc(max(10px,env(safe-area-inset-bottom)) + 74px)}
      .hub-vitrine .shell{padding-bottom:calc(140px + env(safe-area-inset-bottom))}
      .hub-vitrine .toasts{bottom:calc(128px + env(safe-area-inset-bottom))}}
    @media (max-width:420px){.vitrine-faixa{font-size:10px;letter-spacing:.16em}}
    @media (prefers-reduced-motion:reduce){.vitrine-faixa i,.vitrine-faixa.pulso{animation:none}}`;
  document.head.append(css);

  document.addEventListener('DOMContentLoaded', () => {
    faixa = document.createElement('div'); faixa.className = 'vitrine-faixa'; faixa.setAttribute('role', 'note');
    faixa.innerHTML = '<i></i><span></span>'; faixa.lastChild.textContent = FAIXA;
    document.body.append(faixa);
    // o atalho "Sexta-Feira" do topo leva para a vitrine da Sexta
    new MutationObserver(() => document.querySelectorAll('a.voltar-sexta').forEach(a => { if (a.href !== SEXTA_VITRINE) a.href = SEXTA_VITRINE; }))
      .observe(document.getElementById('app'), { childList: true, subtree: true });
  });
})();
