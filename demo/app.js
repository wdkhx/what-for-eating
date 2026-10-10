(() => {
  'use strict';
  const DATA = window.DEMO_DATA, C = window.DemoCore;
  const KEY = 'chishenme.demo.v1';
  const app = document.querySelector('#app'), footer = document.querySelector('#footer');
  const sheet = document.querySelector('#sheet'), announcer = document.querySelector('#announcer');
  const dishes = DATA.dishes, byId = Object.fromEntries(dishes.map(d => [d.id,d]));
  const icons = {
    bowl:'<path d="M3 10h18c-1 6-4.5 9-9 9s-8-3-9-9Z"/><path d="M8 22h8M8 6c3-2-3-3 0-5M15 6c3-2-3-3 0-5"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    settings:'<path d="M3 6h18M3 18h18M8 2v8M16 14v8"/>',
    undo:'<path d="m9 5-6 6 6 6M3 11h11a7 7 0 0 1 0 14" transform="translate(0 -3)"/>',
    x:'<path d="m6 6 12 12M6 18 18 6"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    chevron:'<path d="m9 5 7 7-7 7"/>',
    down:'<path d="m6 9 6 6 6-6"/>',
    history:'<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v6l4 2"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/>',
    chat:'<path d="M20 15a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"/><path d="M7 8h9M7 12h6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    flag:'<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
    reset:'<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'
  };
  const icon = name => `<svg class="icon ${name === 'down' ? 'chevron' : ''}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.bowl}</svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const button = (action, name, glyph, cls = '', extra = '') => `<button type="button" class="icon-button ${cls}" data-action="${action}" aria-label="${name}" ${extra}>${icon(glyph)}</button>`;
  let storageOK = true, corrupt = false, locked = false, gesture = null, draft = null, modalKind = null, modalData = null, returnFocus = null, toastTimer;
  let dueVisible = false, previewChoice = null, preload = new Image(), coldDraft = null;
  let coldStage = 0, coldPending = [], coldFlowInitialized = false, coldGesture = null, coldBusy = false, coldUndo = null;
  let coldLayouts = [], coldAnimationTimer = null;
  let homeHeroTimer = null, homeHeroIndex = 0;
  const fresh = () => ({schema:1,zone:'east',locationSource:'device',locationResolved:false,meal:C.nearestMeal(),entryFilters:C.defaults(),session:null,latest:null,learned:false,reports:[]});
  function validFilters(f) {
    return f && C.normalized(f) && Array.isArray(f.excluded) && f.excluded.every(c => DATA.categories.includes(c))
      && Array.isArray(f.excludedPrice) && f.excludedPrice.every(c => ['low','value','refined'].includes(c))
      && Array.isArray(f.excludedDistance) && f.excludedDistance.every(c => ['near','medium','far'].includes(c))
      && Array.isArray(f.dietary) && f.dietary.every(c => ['spicy','seafood','cilantro','onionGarlic','beefLamb'].includes(c))
      && typeof f.manualTaboo === 'string';
  }
  function validChoice(c) {
    return c === null || (c && byId[c.dishId] && typeof c.id === 'string' && Number.isFinite(c.acceptedAt)
      && DATA.zones[c.zone] && ['lunch','dinner'].includes(c.meal));
  }
  const validIds = ids => Array.isArray(ids) && ids.every(x=>typeof x==='string'&&byId[x]);
  function validUndo(u) {
    if(u===null)return true;
    const snap=u?.snapshot;
    return u && ['skip','accept'].includes(u.type) && typeof u.action_id==='string' && snap
      && byId[snap.current] && snap.screen==='recommend' && validIds(snap.queue) && validIds(snap.shown)
      && Number.isFinite(snap.skips) && validChoice(u.previousLatest);
  }
  function readState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      const value = JSON.parse(raw), s = value.session;
      if (value.schema !== 1 || !DATA.zones[value.zone] || !['lunch','dinner'].includes(value.meal)
        || !validFilters(value.entryFilters) || !validChoice(value.latest) || !Array.isArray(value.reports)) throw Error('invalid state');
      if (!value.locationSource) value.locationSource = 'device';
      if (typeof value.locationResolved !== 'boolean') value.locationResolved = true;
      if (s && (!['recommend','result','empty'].includes(s.screen) || !validFilters(s.filters)
        || !Number.isFinite(s.startedAt) || !Number.isFinite(s.lastActiveAt) || !Number.isFinite(s.skips)
        || !Array.isArray(s.shown) || !s.shown.every(x=>byId[x]) || !Array.isArray(s.queue) || !s.queue.every(x=>byId[x])
        || typeof s.id!=='string' || !Array.isArray(s.events) || !s.events.every(e=>e && typeof e.type==='string' && typeof e.action_id==='string' && Number.isFinite(e.at)) || (s.current !== null && !byId[s.current])
        || (s.screen !== 'empty' && !s.current) || (s.screen === 'result' && (!value.latest || value.latest.dishId !== s.current))
        || !validUndo(s.undo))) throw Error('invalid session');
      if (s && Date.now() - s.lastActiveAt > 30 * 60 * 1000) { value.session = null; value.entryFilters = C.defaults(); }
      return value;
    } catch (error) {
      if (error instanceof SyntaxError || error.message?.startsWith('invalid')) corrupt = true;
      else storageOK = false;
      return fresh();
    }
  }
  let state = readState();
  function save(touch = true) {
    if (touch && state.session) state.session.lastActiveAt = Date.now();
    try { localStorage.setItem(KEY,JSON.stringify(state)); }
    catch { storageOK = false; }
    document.querySelector('#storage-notice').hidden = storageOK;
  }
  function toast(message) {
    const el = document.querySelector('#toast');
    el.textContent = message; el.classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(()=>el.classList.remove('visible'),2600);
  }
  function announce(message) { announcer.textContent = ''; setTimeout(()=>{ announcer.textContent = message; },30); }
  function event(type, extra = {}) {
    if (!state.session) return null;
    const e = {action_id:id(),type,at:Date.now(),dishId:state.session.current,...extra};
    state.session.events.push(e);
    state.session.events = state.session.events.slice(-200);
    return e;
  }
  const filters = () => state.session?.filters || state.entryFilters;
  const eligible = (f = filters(), zone = state.zone, meal = state.meal) => C.eligible(dishes,f,zone,meal);
  const location = d => `${d.canteen} ${d.floor} · ${d.stall}`;
  const fullLocation = d => `示例校园 · ${d.canteen}${d.floor} · ${d.stall} · ${d.window}`;
  const mealName = meal => meal === 'lunch' ? '午餐' : '晚餐';
  const current = () => byId[state.session?.current];
  function imageBlock(d, cls, info = true) {
    const broken = state.session?.brokenImage === d.id;
    return `<div class="${cls}" data-photo>
      <img src="${broken ? 'assets/intentional-missing-image.webp' : d.image}" alt="${esc(d.name)}，菜品示意照片" style="object-position:${d.position}" draggable="false" fetchpriority="high">
      <div class="photo-fallback">${icon('image')}<p>图片暂不可用<br>仍可以选定或换一个</p><button class="text-button" data-action="retry-image" data-id="${d.id}">重新加载图片</button></div>
      <span class="image-badge">示意图</span>
      ${info ? button('detail','查看菜品详情','info','info-button',`data-id="${d.id}"`) : ''}
    </div>`;
  }
  function brand(homeButton = false) {
    return homeButton ? `<button class="brand-button" data-action="home" aria-label="返回首页">${icon('bowl')}</button>` : `<div class="brand">${icon('bowl')}<span>吃什么</span></div>`;
  }
  function dueCard() {
    if (!dueVisible || !state.latest) return '';
    if (!state.latest.mealPrompted) { state.latest.mealPrompted=true; save(false); }
    return `<aside class="due-card"><p>上次的${esc(byId[state.latest.dishId].name)}，后来吃了吗？</p><div class="row"><button class="text-button" data-action="meal-feedback">随手记一下 ${icon('arrow')}</button><button class="quiet" data-action="dismiss-meal">先跳过</button></div></aside>`;
  }
  function stopHomeHeroRotation() {
    if (homeHeroTimer) { clearInterval(homeHeroTimer); homeHeroTimer = null; }
  }
  function startHomeHeroRotation() {
    stopHomeHeroRotation();
    const options = dishes.filter(d => d.available && d.supply !== 'closed' && d.image);
    if (options.length < 2) return;
    homeHeroTimer = setInterval(() => {
      if (state.session || !document.querySelector('.hero-inner')) { stopHomeHeroRotation(); return; }
      homeHeroIndex = (homeHeroIndex + 1) % options.length;
      const dish = options[homeHeroIndex];
      const image = document.querySelector('.hero-inner img');
      if (!image) return;
      image.classList.add('is-rotating');
      image.addEventListener('transitionend', () => image.classList.remove('is-rotating'), {once:true});
      setTimeout(() => image.classList.remove('is-rotating'), 280);
      image.src = dish.image;
      image.alt = `${dish.name}，菜品示意照片`;
      image.style.objectPosition = dish.position;
    }, 3600);
  }
  const coldStages = [
    {key:'excludedPrice', title:'先看价格', short:'价格', values:[['low','低价的','¥12 及以下'],['value','实惠的','¥13–18'],['refined','精致的','¥19 及以上'],['all','不考虑价格','这一类都保留']]},
    {key:'excludedDistance', title:'再看距离', short:'距离', values:[['near','近一点','步行 5 分钟内'],['medium','适中','步行 6–10 分钟'],['far','远一点','步行超过 10 分钟'],['all','不考虑距离','这一类都保留']]},
    {key:'dietary', title:'最后看忌口', short:'忌口', values:[['spicy','辣','不想要就滑走'],['seafood','海鲜','不想要就滑走'],['cilantro','香菜','不想要就滑走'],['onionGarlic','葱蒜','不想要就滑走'],['beefLamb','牛羊肉','不想要就滑走']]}
  ];
  function initColdFlow(force = false) {
    if (!coldFlowInitialized || force) {
      clearTimeout(coldAnimationTimer); coldBusy = false; coldUndo = null;
      coldDraft = C.normalized(state.entryFilters);
      coldStage = 0; coldPending = coldStages[0].values.map(x => x[0]); coldFlowInitialized = true;
      // Bounded variation gives every new round a loose arrangement. Positions
      // stay fixed within the round, so removing one card never moves its peers.
      const anchors = [[[27,31,-10],[70,39,8],[34,75,-5],[73,73,6]],[[29,36,7],[73,29,-8],[27,72,5],[72,73,-6]],[[27,21,-9],[71,23,7],[30,53,5],[70,57,-7],[48,82,4]]];
      coldLayouts = anchors.map(layout => layout.map(([x,y,r]) => [x + Math.random()*3-1.5,y + Math.random()*2-1,r + Math.random()*4-2]));
    }
  }
  function coldCurrentStage() { return coldStages[coldStage]; }
  function coldCardStyle(index) {
    const [x,y,rotation] = coldLayouts[coldStage][index];
    return `--card-r:${rotation}deg;--card-x:${x}%;--card-y:${y}%;--card-z:${10-index}`;
  }
  function coldCards() {
    return coldCurrentStage().values.map(([value,label,detail], index) => coldPending.includes(value) ? `<button type="button" class="scatter-card scatter-tone-${index%3}" style="${coldCardStyle(index)}" data-action="cold-card" data-value="${value}" aria-label="${label}，左滑或点击剔除，右滑保留，也可用左右方向键"><span class="scatter-mark" aria-hidden="true">${icon(coldStage===0?'bowl':coldStage===1?'pin':'x')}</span><strong>${label}</strong><small>${detail}</small><span class="scatter-intent" aria-hidden="true"></span></button>` : '').join('');
  }
  function coldSnapshot() { return {stage:coldStage,pending:[...coldPending],filters:clone(coldDraft)}; }
  function advanceColdStage() {
    coldStage += 1; coldPending = coldCurrentStage()?.values.map(x => x[0]) || [];
  }
  function updateColdFlow(focus = false) {
    const flow = document.querySelector('#cold-flow'); if (!flow) return;
    flow.innerHTML = coldFlowMarkup(); attachColdGestures();
    if (focus) flow.querySelector('.scatter-card, [data-action="start"]')?.focus({preventScroll:true});
  }
  function coldResolve(value, exclude, focus = false) {
    const stage = coldCurrentStage(); if (!stage || !coldPending.includes(value) || state.session) return;
    coldUndo = coldSnapshot();
    const field = stage.key;
    if (value === 'all') {
      coldDraft[field] = [];
      coldPending = [];
      state.entryFilters = clone(coldDraft); save(); advanceColdStage(); updateColdFlow(focus);
      announce(`${stage.free || stage.values.find(x=>x[0]===value)[1]}。${coldCurrentStage()?.title || '排除完成，可以开始选这一顿。'}`);
      return;
    }
    coldDraft[field] = coldDraft[field].filter(x => x !== value);
    if (exclude) coldDraft[field].push(value);
    coldPending = coldPending.filter(x => x !== value);
    state.entryFilters = clone(coldDraft); save();
    if (!coldPending.length) advanceColdStage();
    updateColdFlow(focus);
    announce(`${exclude?'已剔除':'已保留'}${stage.values.find(x=>x[0]===value)[1]}。${coldStage>=coldStages.length?'排除完成，可以开始选这一顿。':coldCurrentStage()!==stage?coldCurrentStage().title:''}`);
  }
  function coldNext(unlimited = false) {
    if (coldBusy || !coldCurrentStage()) return;
    coldUndo = coldSnapshot(); const field = coldCurrentStage().key;
    coldDraft[field] = unlimited ? [] : coldDraft[field].filter(x => !coldPending.includes(x));
    state.entryFilters = clone(coldDraft); save(); advanceColdStage(); updateColdFlow(true);
    announce(coldCurrentStage()?.title || '排除完成，可以开始选这一顿。');
  }
  function undoCold() {
    if (coldBusy || !coldUndo) return;
    coldStage=coldUndo.stage; coldPending=coldUndo.pending; coldDraft=coldUndo.filters; coldUndo=null;
    state.entryFilters=clone(coldDraft); save(); updateColdFlow(true); announce('已撤回，可以重新滑动。');
  }
  function resetColdGesture() {
    const g=coldGesture; coldGesture=null;
    if (g?.card) {
      g.card.style.transition=''; g.card.style.transform=''; g.card.classList.remove('is-dragging');
      delete g.card.dataset.intent;
      if (g.card.hasPointerCapture?.(g.pointer)) g.card.releasePointerCapture(g.pointer);
    }
  }
  function dismissColdCard(card, exclude, focus = false) {
    if (coldBusy || !coldPending.includes(card.dataset.value) || sheet.open) return;
    coldBusy = true; resetColdGesture();
    card.classList.add('is-leaving'); card.dataset.intent=exclude?'exclude':'keep';
    card.querySelector('.scatter-intent').textContent=exclude?'剔除':'保留';
    const direction = exclude ? -1 : 1;
    card.style.transform=`translate(-50%,-50%) translateX(${direction*460}px) rotate(${direction*24}deg)`;
    card.style.opacity='0';
    clearTimeout(coldAnimationTimer);
    coldAnimationTimer=setTimeout(()=>{
      coldBusy=false;
      if (card.isConnected) coldResolve(card.dataset.value,exclude,focus);
    },matchMedia('(prefers-reduced-motion: reduce)').matches?40:210);
  }
  function attachColdGestures() {
    document.querySelectorAll('.scatter-card').forEach(card => {
      card.addEventListener('pointerdown', e => {
        if (coldBusy || sheet.open || e.button !== 0 || !e.isPrimary) return;
        card.dataset.ignoreClick='false';
        coldGesture = {card,pointer:e.pointerId,x:e.clientX,y:e.clientY,dx:0,axis:null};
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', e => {
        const g=coldGesture; if(!g||g.card!==card||g.pointer!==e.pointerId)return;
        const dx=e.clientX-g.x,dy=e.clientY-g.y;
        if(!g.axis && Math.max(Math.abs(dx),Math.abs(dy))<8)return;
        card.dataset.ignoreClick='true';
        if(!g.axis){if(Math.abs(dx)>Math.abs(dy)*1.2)g.axis='x';else{resetColdGesture();return;}}
        g.dx=dx;card.classList.add('is-dragging');card.style.transition='none';
        card.style.transform=`translate(-50%,-50%) translate(${dx}px,${Math.min(16,Math.max(-16,dy/3))}px) rotate(${Math.min(16,Math.max(-16,dx/12))}deg)`;
        card.dataset.intent=dx<0?'exclude':'keep'; card.querySelector('.scatter-intent').textContent=dx<0?'剔除':'保留';
      });
      card.addEventListener('pointerup', e => {
        const g=coldGesture;if(!g||g.card!==card||g.pointer!==e.pointerId)return;
        const dx=e.clientX-g.x, commit=g.axis==='x'&&Math.abs(dx)>=64;
        if(commit) dismissColdCard(card,dx<0); else resetColdGesture();
      });
      card.addEventListener('pointercancel',()=>{card.dataset.ignoreClick='true';resetColdGesture();});
      card.addEventListener('lostpointercapture',e=>{if(e.target===card&&coldGesture?.pointer===e.pointerId)resetColdGesture();});
      card.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();dismissColdCard(card,e.key==='ArrowLeft',true);}});
    });
  }
  function coldManualInput() {
    return `<label class="manual-taboo cold-manual"><span>其他忌口</span><input data-action="manual-taboo" value="${esc(coldDraft.manualTaboo)}" placeholder="手动补充，如花生" maxlength="30"></label>`;
  }
  function coldFlowMarkup() {
    const done=coldStage>=coldStages.length,stage=coldCurrentStage();
    const progress=`<ol class="cold-progress" aria-label="排除进度">${coldStages.map((s,i)=>`<li class="${i<coldStage?'is-done':i===coldStage?'is-current':''}" ${i===coldStage?'aria-current="step"':''}><span>${i<coldStage?'✓':String(i+1).padStart(2,'0')}</span>${s.short}</li>`).join('')}</ol>`;
    const back=`<button class="cold-undo text-button" data-action="cold-undo" ${coldUndo?'':'disabled'}>${icon('undo')} 撤回</button>`;
    if(done) return `${progress}<div class="cold-complete"><div class="cold-complete-mark">${icon('check')}</div><h1>现在，选这一顿。</h1><p class="cold-summary">${esc(C.summary(coldDraft))}</p>${coldManualInput()}<button class="primary cold-start-button" data-action="start">开始选这一顿 ${icon('arrow')}</button>${back}</div>`;
    const excluded=coldDraft[stage.key].filter(v=>!coldPending.includes(v));
    return `${progress}<div class="cold-stage-heading"><h1>${stage.title}</h1><span>${coldStage+1} / 3</span></div><p class="cold-instruction"><span>← 不想要，滑走</span><span>可以接受，保留 →</span></p><div class="cold-pile ${coldStage===2?'cold-pile-taboo':''}" aria-label="${stage.short}选项">${coldCards()}</div><div class="cold-pile-status"><span>${excluded.length?`已剔除 ${excluded.length} 项`:'也可以点卡片剔除'}</span><span>还剩 ${coldPending.length} 张</span></div>${coldStage===2?coldManualInput():''}<div class="cold-actions">${back}<button class="text-button cold-next" data-action="cold-next">${coldStage===2?'忌口选好了':'其余都可以'} ${icon('arrow')}</button></div>`;
  }
  function resolveDefaultLocation() {
    if (state.locationResolved || state.locationSource === 'manual') return;
    state.locationResolved = true;
    if (!navigator.geolocation) { state.locationSource = 'default'; save(false); return; }
    navigator.geolocation.getCurrentPosition(() => {
      /* The demo campus has no real coordinate map; a successful device read selects its default zone. */
      if (state.locationSource === 'manual') return;
      state.locationSource = 'device'; save(false); if (!state.session) render();
    }, () => { state.locationSource = 'default'; save(false); }, {maximumAge: 5 * 60 * 1000, timeout: 1500});
  }
  function renderHome() {
    initColdFlow();
    const options = dishes.filter(d => d.available && d.supply !== 'closed' && d.image);
    const hero = options[homeHeroIndex % Math.max(options.length, 1)] || byId['shrimp-noodles'];
    app.innerHTML = `<header class="topbar">${brand()}${state.latest ? button('history','查看上次选择','history','subtle') : '<span class="local-label">示例演示</span>'}</header>
      <div class="hero cold-hero" aria-label="轮换展示的菜品示意图片">${imageBlock(hero,'hero-inner',false)}</div>
      <section class="cold-start"><div class="cold-meta"><button class="location-control" data-action="location">${icon('pin')}${DATA.zones[state.zone]}${icon('down')}</button></div><div id="cold-flow">${coldFlowMarkup()}</div></section>${dueCard()}`;
    attachColdGestures();
    startHomeHeroRotation();
    resolveDefaultLocation();
  }
  function recommendHeader() {
    return `<header class="recommend-head"><div class="topbar">${brand(true)}<button class="location-control" data-action="location">${icon('pin')}${DATA.zones[state.zone]}</button>${button('filters','修改本顿条件','settings','subtle')}</div><div class="subline"><span>${esc(C.summary(filters()))}</span><span>示例${mealName(state.meal)}</span></div></header>`;
  }
  function renderRecommendation() {
    const d = current(), s = state.session;
    app.innerHTML = `${recommendHeader()}<div class="card-stage"><div class="swipe-viewport"><article class="food-card" id="food-card" aria-label="${esc(d.name)}，可左右滑动选择" data-dish="${d.id}">
      ${imageBlock(d,'card-photo')}<div class="card-facts"><div class="dish-topline"><h1>${d.name}</h1><div class="price"><small>参考价</small><strong>¥${d.price}</strong></div></div><p class="card-recommendation">${esc(d.description || `这一顿可以试试${d.name}。`)}</p>${d.notice ? `<p class="notice">${icon('info')}<span>${d.notice}</span></p>` : ''}</div></article></div></div>
      <div class="decision-controls" aria-label="选择这一顿">${button('undo','撤回上一次跳过','undo','undo',!s.undo ? 'disabled' : '')}${button('skip','换一个','x','skip')}${button('accept','就吃这个','check','accept')}</div>
      ${s.skips>=3 && !s.helpDismissed ? `<div class="help-nudge"><button data-action="help">还没遇到想吃的？调一下条件 ${icon('arrow')}</button>${button('dismiss-help','收起调整提示','x')}</div>` : ''}
      <div class="recommend-bottom"><button class="text-button" data-action="new-meal">开始新一顿</button></div>`;
    attachGesture();
    const next = byId[s.queue[0]];
    if (next) preload.src = next.image;
  }
  function renderEmpty() {
    const s = state.session, count = eligible().length;
    const exhausted = count > 0;
    app.innerHTML = `${recommendHeader()}<section class="empty-state"><div class="empty-illustration">${icon(exhausted?'bowl':'settings')}</div><h1>${exhausted?'暂时没有更多':'这一顿，暂时没匹配到'}</h1><p>${exhausted?'符合本顿条件的菜都看过了。<br>可以回看，也可以改改条件。':'当前餐次、预算、距离和排除条件下，<br>没有合适的示例菜品。'}</p><div class="filter-summary">${esc(C.summary(s.filters))}<br>${DATA.zones[state.zone]} · 示例${mealName(state.meal)}</div><div class="stack"><button class="primary" data-action="filters">修改本顿条件 ${icon('settings')}</button>${exhausted ? '<button class="secondary" data-action="self-select">我自己选 · 回看合格候选</button>' : ''}${s.undo ? '<button class="secondary" data-action="undo">撤回上一次跳过</button>' : ''}<button class="quiet" data-action="new-meal">结束这顿，回到首页</button></div><p class="caption">条件由你来改，我们不会自动放宽。</p></section>`;
  }
  function renderResult() {
    const d = current(), choice = state.latest;
    app.innerHTML = `<header class="topbar">${brand(true)}<span class="local-label">这一顿，有着落了</span>${button('undo','撤回这次选定','undo','subtle')}</header><section class="result-heading"><span class="result-badge">${icon('check')}已选定</span><h1 id="result-title" tabindex="-1">就吃${d.name}。</h1><p>参考价 ¥${d.price} · 从${DATA.zones[choice.zone]}步行约 ${d.walk[choice.zone]} 分钟</p></section>
      ${imageBlock(d,'result-photo')}<section class="place-card"><div class="row">${icon('pin')}<div><h2>${d.canteen} · ${d.floor} · ${d.stall}</h2><p>${d.window} · 示例校园<br>记住这一处，就可以收起页面了。</p></div></div>${d.notice ? `<p class="notice">${d.notice}</p>` : ''}</section>
      <button class="primary" data-action="route">去这里 ${icon('arrow')}</button><p class="route-hint">演示位置 · 只展示文字路线</p>
      <button class="feedback-entry" data-action="decision-feedback"><span class="row">${icon('chat')}${choice.decisionFeedback ? '这次体验已记录 · 可以修改' : '这次选饭怎么样？'}</span>${icon('chevron')}</button>
      <div class="result-links"><button class="text-button" data-action="preview-meal">预览餐后反馈</button><button class="text-button" data-action="report" data-id="${d.id}">信息有误</button></div>${choice.mealFeedback ? '<p class="demo-note">餐后结果已保存到本机，可从上次选择中修改。</p>' : ''}${dueCard()}<button class="secondary new-meal" data-action="new-meal">开始新一顿</button>`;
  }
  function renderFooter() {
    const wasOpen = footer.querySelector('details')?.open;
    footer.innerHTML = `<div class="footer-line">${icon('lock')}<span>示例校园 · 演示数据 · 仅本机保存</span></div><details ${wasOpen?'open':''}><summary>${icon('settings')}演示工具 ${icon('down')}</summary><div class="demo-tools"><p>这些按钮切换本地演示场景，不代表真实用餐或市场验证结果。</p><div class="tool-grid"><button data-action="demo-default">恢复默认条件</button><button data-action="demo-empty">无匹配</button><button data-action="demo-three">连续跳过 3 次</button><button data-action="demo-exhausted">候选耗尽</button><button data-action="demo-image">图片无法加载</button><button data-action="demo-unknown">营业待确认</button><button data-action="preview-meal">预览餐后反馈</button><button data-action="state">查看本次记录</button><button data-action="reset" class="danger">清除本机记录</button></div></div></details>`;
  }
  function render(focusResult = false) {
    stopHomeHeroRotation();
    resetGesture();
    if (!state.session) renderHome();
    else if (state.session.screen === 'recommend') renderRecommendation();
    else if (state.session.screen === 'result') renderResult();
    else renderEmpty();
    renderFooter();
    if (focusResult) document.querySelector('#result-title')?.focus({preventScroll:true});
  }
  function drawNext() {
    const s = state.session;
    s.current = s.queue.shift() || null;
    if (s.current && !s.shown.includes(s.current)) s.shown.push(s.current);
    s.screen = s.current ? 'recommend' : 'empty';
  }
  function startSession(mode = 'choose', initial = state.entryFilters) {
    coldFlowInitialized = false;
    state.meal = C.nearestMeal();
    state.session = {id:id(),startedAt:Date.now(),lastActiveAt:Date.now(),filters:clone(C.normalized(initial)),zone:state.zone,meal:state.meal,current:null,shown:[],queue:[],skips:0,screen:'recommend',undo:null,events:[],firstAcceptedAt:null,helpDismissed:false,entry:mode,demoScene:null};
    state.session.queue = C.shuffle(eligible().map(d=>d.id));
    event('session_started',{entry:mode,demo:true}); drawNext(); save(); render(); scrollTo(0,0);
    announce(current() ? `为你提议：${current().name}，参考价 ${current().price} 元。` : '当前条件下暂无匹配。');
  }
  function snapshot() {
    const s = state.session;
    return {current:s.current,shown:[...s.shown],queue:[...s.queue],skips:s.skips,screen:s.screen};
  }
  function decide(type, method = 'button', immediate = false) {
    const s = state.session;
    if (locked || !s || s.screen!=='recommend' || sheet.open || !current()) return;
    locked = true; resetGesture();
    const snap = snapshot(), e = event(type === 'accept' ? 'card_accepted' : 'card_skipped',{input_method:method});
    const previousLatest = type === 'accept' ? clone(state.latest) : null;
    const card = document.querySelector('#food-card');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('.decision-controls button').forEach(b=>b.disabled=true);
    if (card && !reduced && !immediate) { card.style.transition='transform 200ms ease, opacity 200ms ease'; card.style.transform=`translateX(${type==='accept'?'':'-'}115%) rotate(${type==='accept'?'':'-'}8deg)`; card.style.opacity='0'; }
    const complete = () => {
      state.learned = true;
      s.undo = {type,snapshot:snap,action_id:e.action_id,previousLatest};
      if (type === 'skip') { s.skips++; drawNext(); }
      else {
        s.screen = 'result';
        if (!s.firstAcceptedAt) s.firstAcceptedAt = e.at;
        state.latest = {id:e.action_id,dishId:s.current,sessionId:s.id,acceptedAt:e.at,zone:state.zone,meal:state.meal,decisionFeedback:null,mealFeedback:null,mealFeedbackPreview:null,mealPrompted:false};
        dueVisible = false;
      }
      save(); locked = false; render(type==='accept');
      if (type==='accept') { scrollTo(0,0); announce('已选定。位置和文字路线已准备好。'); }
      else announce(current() ? `${current().name}，参考价 ${current().price} 元。` : '暂时没有更多。可以撤回或修改条件。');
    };
    // Even reduced-motion button presses share a short lock, preventing double submission.
    setTimeout(complete,immediate ? 0 : 200);
  }
  function undo() {
    const s = state.session, u = s?.undo;
    if (locked || !u) return;
    if (u.type === 'accept') { state.latest = u.previousLatest; dueVisible=false; }
    const elapsed = Date.now() - (s.events.find(e=>e.action_id===u.action_id)?.at || Date.now());
    event(u.type==='accept'?'decision_reopened':'card_undo',{original_action_id:u.action_id,elapsed_ms:elapsed});
    Object.assign(s,clone(u.snapshot)); s.undo=null;
    save(); render(); scrollTo(0,0); announce(`已撤回，回到${current()?.name || '上一张'}。`);
  }
  function newMeal() {
    event('session_ended',{finalSelection:state.session?.screen==='result'});
    state.session = null; state.entryFilters = C.defaults(); state.meal = C.nearestMeal(); coldFlowInitialized = false; save(); render(); scrollTo(0,0);
  }
  function home() {
    if (state.session?.screen==='result') { newMeal(); return; }
    openSheet('离开这一顿？','end',`<p>返回首页会结束当前选饭。本顿条件和已看过的菜会清空，上次选择仍会保留。</p><div class="sheet-actions"><button class="primary" data-action="confirm-home">结束并返回首页</button><button class="secondary" data-action="close">继续选这一顿</button></div>`);
  }
  function openSheet(title, kind, html, data = null) {
    resetGesture();
    if (!sheet.open) returnFocus = document.activeElement;
    modalKind=kind; modalData=data;
    sheet.innerHTML = `<div class="sheet-header"><h2 id="sheet-title" tabindex="-1">${esc(title)}</h2>${button('close','关闭弹层','x')}</div><div class="sheet-body">${html}</div>`;
    if (!sheet.open) sheet.showModal();
    sheet.scrollTop=0; sheet.querySelector('#sheet-title').focus();
  }
  function closeSheet() { if (sheet.open) sheet.close(); }
  sheet.addEventListener('close',()=>{
    if (sheet.open) return;
    modalKind=null; modalData=null;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
    else document.querySelector('[data-action="filters"], [data-action="start"], [data-action="new-meal"]')?.focus({preventScroll:true});
  });
  sheet.addEventListener('click',e=>{ if (e.target===sheet) { const r=sheet.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeSheet(); } });
  sheet.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const nodes=[...sheet.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea, select, a[href], summary, [tabindex="0"]')].filter(n=>n.getClientRects().length);
    const first=nodes[0],last=nodes.at(-1),active=document.activeElement;
    if(!first){e.preventDefault();return;}
    if(e.shiftKey&&(active===first||active.id==='sheet-title')){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&active===last){e.preventDefault();first.focus();}
  });
  function openFilters(locationOnly = false) {
    draft = {filters:C.normalized(filters()),zone:state.zone};
    showFilterSheet(locationOnly);
  }
  function draftChoice(field, value, label) {
    const list = draft.filters[field] || [], pressed = value === 'all' ? list.length === 0 : list.includes(value);
    return `<button class="choice-card" data-action="draft-choice" data-field="${field}" data-value="${value}" aria-pressed="${pressed}"><strong>${label}</strong><small>${pressed ? (value === 'all' ? '未剔除' : '已剔除') : '点一下剔除'}</small></button>`;
  }
  function showFilterSheet(locationOnly = false) {
    const body = `<p style="margin-bottom:20px">${locationOnly?'默认位置来自设备读取，也可以在这里手动改成演示出发点。':'继续排除这一顿不想要的，已选项只影响本顿。'}</p>
      <div class="form-group"><span class="form-label">出发点</span><div class="chips">${Object.entries(DATA.zones).map(([value,label])=>`<button class="chip" data-action="zone-draft" data-value="${value}" aria-pressed="${draft.zone===value}">${label}</button>`).join('')}</div></div>
      ${locationOnly ? '' : `<div class="form-group"><span class="form-label">价格</span><div class="choice-grid">${draftChoice('excludedPrice','low','低价的')}${draftChoice('excludedPrice','value','实惠的')}${draftChoice('excludedPrice','refined','精致的')}${draftChoice('excludedPrice','all','不考虑价格')}</div></div><div class="form-group"><span class="form-label">距离</span><div class="choice-grid">${draftChoice('excludedDistance','near','近一点')}${draftChoice('excludedDistance','medium','适中')}${draftChoice('excludedDistance','far','远一点')}${draftChoice('excludedDistance','all','不考虑距离')}</div></div><div class="form-group"><span class="form-label">忌口</span><div class="choice-grid taboo-grid">${draftChoice('dietary','spicy','辣')}${draftChoice('dietary','seafood','海鲜')}${draftChoice('dietary','cilantro','香菜')}${draftChoice('dietary','onionGarlic','葱蒜')}${draftChoice('dietary','beefLamb','牛羊肉')}</div><label class="manual-taboo"><span>还有其他忌口？</span><input data-action="draft-manual" value="${esc(draft.filters.manualTaboo)}" placeholder="如花生" maxlength="30"></label></div>`}
      <p id="filter-count" class="filter-count">当前有 ${eligible(draft.filters,draft.zone,state.session?.meal || state.meal).length} 道示例符合条件</p><button class="primary" data-action="apply-filters">${state.session?'应用到这一顿':'保存条件'} ${icon('check')}</button>${!locationOnly?'<div class="sheet-actions"><button class="quiet" data-action="draft-default">恢复默认排除</button></div>':''}`;
    openSheet(locationOnly?'修改出发点':'调整本顿排除','filters',body,{locationOnly});
  }
  function updateDraftUI() {
    sheet.querySelectorAll('[data-action="draft-choice"]').forEach(b=>{const list=draft.filters[b.dataset.field]||[];b.setAttribute('aria-pressed',(b.dataset.value==='all'?list.length===0:list.includes(b.dataset.value)));});
    sheet.querySelectorAll('[data-action="zone-draft"]').forEach(b=>b.setAttribute('aria-pressed',draft.zone===b.dataset.value));
    sheet.querySelector('#filter-count').textContent=`当前有 ${eligible(draft.filters,draft.zone,state.session?.meal || state.meal).length} 道示例符合条件`;
  }
  function applyFilters(showSelf = false) {
    state.zone=draft.zone; state.locationSource='manual'; state.locationResolved=true; state.meal=state.session?.meal || C.nearestMeal();
    const s=state.session;
    if (!s) state.entryFilters=clone(draft.filters);
    else {
      s.filters=clone(C.normalized(draft.filters)); s.zone=state.zone; s.meal=state.meal; s.undo=null;
      const ids=eligible().map(d=>d.id);
      s.queue=C.shuffle(ids.filter(x=>!s.shown.includes(x)));
      if (!ids.includes(s.current)) drawNext();
      event('conditions_changed');
    }
    closeSheet(); save(); render();
    if (showSelf) { if(!state.session) startSession('choose'); openSelf(); }
  }
  function openDetail(dishId = state.session?.current) {
    const d=byId[dishId]; if(!d) return;
    const isResult=state.session?.screen==='result';
    const f=filters(), zone=isResult?state.latest.zone:state.zone;
    openSheet(d.name,'detail',`<div class="detail-reason"><p class="eyebrow">为什么是它</p><p>${esc(C.reason(d,f,zone))}</p></div><section class="sheet-section"><p>${esc(d.description || `${d.name}，示例参考价 ¥${d.price}。`)}</p></section><section class="sheet-section"><dl class="detail-facts"><dt>完整位置</dt><dd>${fullLocation(d)}</dd><dt>参考价</dt><dd>¥${d.price} · 示例价格</dd><dt>步行</dt><dd>从${DATA.zones[zone]}约 ${d.walk[zone]} 分钟</dd><dt>供应餐次</dt><dd>${d.meals.map(mealName).join(' / ')}（示例）</dd><dt>营业信息</dt><dd>${d.supply==='unknown'?'待确认；仅作未知状态演示':'预设可用状态，并非实时营业'}</dd><dt>事实来源</dt><dd>随 Demo 提供的虚构资料</dd><dt>真实核验</dt><dd>未核验 · 不对应真实校园档口</dd><dt>资料版本</dt><dd>2026-09-23 · Demo v1</dd></dl></section><section class="sheet-section"><p><strong>示例配料</strong><br>${d.ingredients}</p><p class="caption" style="margin-top:10px">配料为演示字段，不能用于判断过敏安全。照片为同类菜品示意，配餐与实际份量不以图片为依据。</p></section>${!isResult?`<section class="sheet-section"><button class="secondary" data-action="exclude-category" data-id="${d.id}">这一顿不想吃${d.category}</button><p class="form-caption">仅排除本顿的「${d.category}」，下次不会记为不喜欢。</p></section>`:''}<button class="text-button" data-action="report" data-id="${d.id}">${icon('flag')} 信息有误</button>`,{dishId});
  }
  function excludeCategory(dishId) {
    const d=byId[dishId]; if(!d||!state.session) return;
    draft={filters:clone(filters()),zone:state.zone,meal:state.meal};
    if(!draft.filters.excluded.includes(d.category)) draft.filters.excluded.push(d.category);
    applyFilters(); toast(`这一顿已排除${d.category}`);
  }
  function openSelf() {
    if(!state.session) startSession('browse');
    const list=eligible();
    openSheet('我自己选','self',`<p>只看符合本顿条件的 ${list.length} 道菜。这里可以回看已经见过的提议。</p><div class="self-list">${list.map(d=>`<button class="dish-list-item" data-action="pick" data-id="${d.id}"><img src="${d.image}" alt="${d.name}示意图" loading="lazy"><span><strong>${d.name}</strong><small>¥${d.price} · 约 ${d.walk[state.zone]} 分钟${state.session.shown.includes(d.id)?' · 看过':''}</small><small>${location(d)}${d.supply==='unknown'?' · 营业待确认':''}</small></span>${icon('chevron')}</button>`).join('')}</div>${!list.length?'<div class="feedback-help">当前条件没有匹配的菜，先改改条件吧。</div>':''}<div class="sheet-actions"><button class="secondary" data-action="filters">修改本顿条件</button></div>`);
  }
  function pick(dishId) {
    if(!eligible().some(d=>d.id===dishId)) return;
    const s=state.session;
    s.current=dishId; if(!s.shown.includes(dishId))s.shown.push(dishId);
    s.queue=s.queue.filter(x=>x!==dishId);s.screen='recommend';s.undo=null;
    event('self_selected_card');closeSheet();save();render();scrollTo(0,0);
    announce(`正在看${current().name}。可以选定或继续换菜。`);
  }
  const decisionLabels = {'easier':'更省心','same':'差不多','harder':'更费劲','no-problem':'平时不用纠结'};
  const mealLabels = {'satisfied':'照着吃了，而且满意','not-satisfied':'照着吃了，一般或不满意','not-eaten':'没照着吃','unknown':'还没吃 / 记不清'};
  function openFeedback(kind, simulated = false) {
    if (simulated && !state.latest) previewChoice={id:'preview-only',dishId:'shrimp-noodles',mealFeedbackPreview:state.previewFeedback||null};
    const choice=state.latest || (simulated ? previewChoice : null);
    if(!choice) { toast('先选定一顿，再体验反馈'); return; }
    const isMeal=kind==='meal';
    if(isMeal&&!simulated) { choice.mealPrompted=true;dueVisible=false;save(); }
    const value = isMeal ? (simulated?choice.mealFeedbackPreview?.value:choice.mealFeedback?.value) : choice.decisionFeedback?.value;
    const labels=isMeal?mealLabels:decisionLabels;
    event(isMeal?'meal_feedback_shown':'feedback_shown',{simulated,choiceId:choice.id});save();
    openSheet(isMeal?'后来，这一顿怎么样？':'这次选饭怎么样？','feedback',`${simulated?'<div class="feedback-help"><strong>模拟餐后回访</strong><br>现在不必真的吃过。此处记录单独标记为模拟，不覆盖正式餐后回答。</div>':''}<p>${isMeal?`${choice.id==='preview-only'?'演示菜品':'上次选了'}「${byId[choice.dishId].name}」。没去吃或记不清，都可以如实记下。`:'和平时自己想吃什么相比，这次感觉如何？'}</p><div class="feedback-options">${Object.entries(labels).map(([v,label])=>`<button class="feedback-option" data-action="save-feedback" data-value="${v}" aria-pressed="${value===v}">${label}${value===v?icon('check'):''}</button>`).join('')}</div><p class="local-label">${icon('lock')}只保存在本机，不会上传给开发者</p><p class="saved-note" id="feedback-saved" aria-live="polite">${value?'已保存到本机，可随时修改。':'可以直接关闭，不回答也没关系。'}</p><div class="sheet-actions"><button class="quiet" data-action="close">${value?'完成':'先跳过'}</button></div>`,{kind,simulated,choiceId:choice.id});
  }
  function saveFeedback(value) {
    const context=modalData, choice=context?.choiceId==='preview-only'?previewChoice:state.latest;
    if(!choice||!context||context.choiceId!==choice.id) return;
    const labels=context.kind==='meal'?mealLabels:decisionLabels;
    if(!labels[value])return;
    const key=context.kind==='meal'?(context.simulated?'mealFeedbackPreview':'mealFeedback'):'decisionFeedback';
    choice[key]={value,at:Date.now(),simulated:context.simulated};
    if (choice.id==='preview-only') state.previewFeedback=choice[key];
    event(context.kind==='meal'?'meal_feedback_answered':'feedback_answered',{value,simulated:context.simulated,choiceId:choice.id});
    if(context.kind==='meal'&&!context.simulated)dueVisible=false;
    save(); render();
    sheet.querySelectorAll('[data-action="save-feedback"]').forEach(b=>{ const selected=b.dataset.value===value;b.setAttribute('aria-pressed',selected);b.innerHTML=labels[b.dataset.value]+(selected?icon('check'):''); });
    sheet.querySelector('#feedback-saved').textContent=storageOK?'已保存到本机，可随时修改。':'已记录在当前页面；本次记录暂不能保存。';
    sheet.querySelector('[data-action="close"].quiet').textContent='完成';
  }
  function openRoute() {
    const choice=state.latest;if(!choice)return;
    const d=byId[choice.dishId];
    openSheet('去这里，吃这一顿','route',`<div class="feedback-help">以下是虚构校园的示例路线，只用来说明选定后的信息结构。</div><div class="route-step"><span class="step-number">1</span><div><h3>从${DATA.zones[choice.zone]}出发</h3><p>沿示例校园主路前往${d.canteen}。</p></div></div><div class="route-step"><span class="step-number">2</span><div><h3>到${d.canteen}${d.floor}</h3><p>示例步行约 ${d.walk[choice.zone]} 分钟，不含排队时间。</p></div></div><div class="route-step"><span class="step-number">3</span><div><h3>${d.stall} · ${d.window}</h3><p>选「${d.name}」，参考价 ¥${d.price}。</p></div></div><p class="caption">没有真实地图坐标，不会跳转到虚构目的地。</p><div class="sheet-actions"><button class="primary" data-action="close">记住了 ${icon('check')}</button></div>`);
  }
  function openHistory() {
    const c=state.latest;if(!c)return;
    const d=byId[c.dishId];
    openSheet('上次的选择','history',`<div class="result-badge">${icon('check')}上次已选定</div><h3>${d.name}</h3><p>${new Date(c.acceptedAt).toLocaleString('zh-CN',{month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'})} · 示例${mealName(c.meal)}</p><section class="sheet-section"><p>${fullLocation(d)}<br>参考价 ¥${d.price}</p></section><p>选饭体验：${decisionLabels[c.decisionFeedback?.value]||'未反馈'}<br>餐后结果：${mealLabels[c.mealFeedback?.value]||'未知，尚未反馈'}</p><div class="sheet-actions"><button class="primary" data-action="route">查看示例路线 ${icon('arrow')}</button><button class="secondary" data-action="meal-feedback">${c.mealFeedback?'更新':'补充'}餐后结果</button><button class="quiet" data-action="decision-feedback">记录选饭体验</button></div><p class="caption">仅保留最近一次选择；新的一顿不会沿用临时排除。</p>`);
  }
  function openHelp() {
    openSheet('还没遇到想吃的？','help',`<p>主要是哪种原因？可选，也可以直接自己挑。</p><div class="feedback-options">${['不想吃这类','太远或太贵','看起来没食欲','其他'].map((label,i)=>`<button class="feedback-option" data-action="help-reason" data-value="${i}">${label}</button>`).join('')}</div><div class="sheet-actions"><button class="primary" data-action="self-select">我自己选</button><button class="quiet" data-action="close">继续看下一道</button></div>`);
  }
  function openReport(dishId) {
    const d=byId[dishId]||current()||byId[state.latest?.dishId];if(!d)return;
    openSheet('哪里需要改一下？','report',`<p>关于「${d.name}」的示例资料或界面。</p><form id="report-form"><div class="form-group" style="margin-top:18px"><label for="report-text">一句话说明</label><textarea id="report-text" name="report" placeholder="比如：图片和菜名不太一致……" maxlength="300" required></textarea></div><p class="form-caption">仅保存到本机，不会发送给开发者。无需联系方式；讨论时可自行分享截图。</p><div class="sheet-actions"><button type="submit" class="primary">保存这条本地反馈</button></div></form>`,{dishId:d.id});
  }
  function openState() {
    const s=state.session, c=state.latest;
    const rawSkips=s?.events.filter(e=>e.type==='card_skipped').length||0;
    const elapsed=s?Math.round(((s.firstAcceptedAt||Date.now())-s.startedAt)/1000):null;
    openSheet('本次演示记录','state',`<p>本设备的演示记录，用于讨论交互，不是全体用户统计。所有会话均标记为 Demo。</p><dl class="state-table"><dt>当前状态</dt><dd>${s?({recommend:'正在看卡',result:'已选定',empty:'暂无候选'}[s.screen]):'首页'}</dd><dt>首次认可耗时</dt><dd>${s?.firstAcceptedAt?`${elapsed} 秒`:'尚未认可'}（从本次开始计时）</dd><dt>换卡动作</dt><dd>${rawSkips} 次，含撤回前的原始动作</dd><dt>本顿已看</dt><dd>${s?.shown.length||0} 道</dd><dt>当前条件</dt><dd>${esc(C.summary(filters()))}</dd><dt>上次选择</dt><dd>${c?byId[c.dishId].name:'暂无'}</dd><dt>场景标记</dt><dd>${esc(s?.demoScene||'普通演示')}</dd><dt>存储</dt><dd>${storageOK?'本浏览器 localStorage':'不可用，仅当前页面内存'}</dd></dl><details><summary>查看原始本地状态</summary><pre class="state-json">${esc(JSON.stringify(state,null,2))}</pre></details>`);
  }
  function demoScene(scene) {
    closeSheet();
    if(scene==='image') {
      if(!state.session||state.session.screen!=='recommend')startSession();
      if(!current()) { state.entryFilters=C.defaults();startSession(); }
      state.session.brokenImage=state.session.current;state.session.demoScene='image-failure';save();render();return;
    }
    state.zone='east';state.meal='lunch';state.entryFilters=C.defaults();
    if(scene==='empty')state.entryFilters.excludedPrice=['low','value','refined'];
    if(scene==='unknown'){state.entryFilters=C.defaults();}
    startSession('demo-tool');state.session.demoScene=scene;
    const s=state.session;
    if(scene==='three'||scene==='exhausted') {
      const count=scene==='three'?3:eligible().length;
      for(let i=0;i<count&&s.current;i++) {const snap=snapshot(),e=event('card_skipped',{input_method:'demo',simulated:true});s.undo={type:'skip',snapshot:snap,action_id:e.action_id,previousLatest:null};s.skips++;drawNext();}
      state.learned=true;
    }
    if(scene==='unknown'){s.current='cucumber';s.shown=['cucumber'];s.queue=s.queue.filter(x=>x!=='cucumber');s.screen='recommend';}
    save();render();scrollTo(0,0);
  }
  function resetGesture() {
    if(gesture?.card) {gesture.card.style.transition='transform 180ms ease';gesture.card.style.transform='';gesture.card.classList.remove('dragging');}
    gesture=null;document.querySelector('#swipe-intent').className='swipe-intent';
  }
  function attachGesture() {
    const card=document.querySelector('#food-card');if(!card)return;
    card.addEventListener('pointerdown',e=>{
      if(locked||sheet.open||e.button!==0||!e.isPrimary||e.target.closest('button,a,input,textarea')||e.clientX<20||e.clientX>innerWidth-20)return;
      gesture={card,pointer:e.pointerId,x:e.clientX,y:e.clientY,dx:0,axis:null};
    });
    card.addEventListener('pointermove',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pointer)return;
      const dx=e.clientX-g.x,dy=e.clientY-g.y;
      if(!g.axis&&Math.max(Math.abs(dx),Math.abs(dy))<10)return;
      if(!g.axis){if(Math.abs(dx)>Math.abs(dy)*1.35){g.axis='x';card.setPointerCapture(e.pointerId);}else if(Math.abs(dy)>Math.abs(dx)){resetGesture();return;}else return;}
      g.dx=dx;card.classList.add('dragging');card.style.transition='none';
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      card.style.transform=`translateX(${reduced?0:dx}px) rotate(${reduced?0:Math.max(-8,Math.min(8,dx/20))}deg)`;
      const threshold=Math.max(80,Math.min(112,card.offsetWidth*.25));
      const hint=document.querySelector('#swipe-intent');
      hint.className=`swipe-intent ${Math.abs(dx)>=threshold?'visible':''} ${dx>0?'accept':''}`;
      hint.innerHTML=icon(dx>0?'check':'x')+(dx>0?'就吃这个':'换一个');
    });
    card.addEventListener('pointerup',e=>{
      const g=gesture;if(!g||e.pointerId!==g.pointer)return;
      const dx=e.clientX-g.x;
      const threshold=Math.max(80,Math.min(112,card.offsetWidth*.25));
      const commit=g.axis==='x'&&Math.abs(dx)>=threshold;
      resetGesture();if(commit)decide(dx>0?'accept':'skip','swipe');
    });
    card.addEventListener('pointercancel',resetGesture);
    // Touch starts with implicit capture on a photo child. Moving that capture to
    // the card emits a bubbling child event; only losing the card's own capture cancels.
    card.addEventListener('lostpointercapture',e=>{if(e.target===card&&gesture&&e.pointerId===gesture.pointer)resetGesture();});
  }
  document.addEventListener('pointerdown',e=>{if(gesture&&e.pointerId!==gesture.pointer)resetGesture();},true);
  document.addEventListener('pointerup',e=>{if(gesture&&e.pointerId===gesture.pointer&&!gesture.card.contains(e.target))resetGesture();});
  // Every state mutation is saved immediately; hiding a stale tab must not overwrite newer storage.
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetGesture();});
  window.addEventListener('blur',resetGesture);
  document.addEventListener('error',e=>{if(e.target.tagName==='IMG'){const photo=e.target.closest('[data-photo]');if(photo)photo.classList.add('photo-failed');}},true);
  document.addEventListener('load',e=>{if(e.target.tagName==='IMG')e.target.closest('[data-photo]')?.classList.remove('photo-failed');},true);
  document.addEventListener('input',e=>{
    if(e.target.dataset.action==='manual-taboo' && coldDraft){ coldDraft.manualTaboo=e.target.value; state.entryFilters=clone(coldDraft); save(); }
  });
  sheet.addEventListener('input',e=>{if(e.target.dataset.action==='draft-manual'){draft.filters.manualTaboo=e.target.value;updateDraftUI();}});
  sheet.addEventListener('submit',e=>{
    if(e.target.id!=='report-form')return;e.preventDefault();
    const message=new FormData(e.target).get('report').trim();if(!message)return;
    state.reports.push({id:id(),dishId:modalData.dishId,at:Date.now(),message:message.slice(0,300)});state.reports=state.reports.slice(-20);
    save();closeSheet();toast(storageOK?'已保存到本机，没有上传':'已记在当前页面，暂不能持久保存');
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b||b.disabled||locked)return;
    const a=b.dataset.action;
    if(a==='start')startSession();
    else if(a==='browse')startSession('choose');
    else if(a==='skip'||a==='accept')decide(a);
    else if(a==='undo')undo();
    else if(a==='new-meal')newMeal();
    else if(a==='home')home();
    else if(a==='confirm-home'){closeSheet();newMeal();}
    else if(a==='filters')openFilters();
    else if(a==='location')openFilters(true);
    else if(a==='close')closeSheet();
    else if(a==='cold-card'){if(b.dataset.ignoreClick!=='true')dismissColdCard(b,true,true);}
    else if(a==='cold-undo')undoCold();
    else if(a==='cold-next')coldNext(false);
    else if(a==='cold-unlimited')coldNext(true);
    else if(a==='draft-choice'){const field=b.dataset.field,value=b.dataset.value,list=draft.filters[field]||[];draft.filters[field]=value==='all'?[]:(list.includes(value)?list.filter(x=>x!==value):[...list,value]);updateDraftUI();}
    else if(a==='zone-draft'){draft.zone=b.dataset.value;updateDraftUI();}
    else if(a==='apply-filters')applyFilters();
    else if(a==='self-select-draft')applyFilters(true);
    else if(a==='draft-default'){draft.filters=C.defaults();showFilterSheet(false);}
    else if(a==='detail')openDetail(b.dataset.id);
    else if(a==='exclude-category')excludeCategory(b.dataset.id);
    else if(a==='self-select')openSelf();
    else if(a==='pick')pick(b.dataset.id);
    else if(a==='decision-feedback')openFeedback('decision');
    else if(a==='meal-feedback')openFeedback('meal');
    else if(a==='preview-meal')openFeedback('meal',true);
    else if(a==='save-feedback')saveFeedback(b.dataset.value);
    else if(a==='dismiss-meal'){dueVisible=false;save();render();}
    else if(a==='history')openHistory();
    else if(a==='route')openRoute();
    else if(a==='help')openHelp();
    else if(a==='help-reason'){event('rejection_reason',{value:['不想吃这类','太远或太贵','看起来没食欲','其他'][Number(b.dataset.value)]});state.session.helpDismissed=true;save();if(['0','1'].includes(b.dataset.value))openFilters();else{closeSheet();render();toast(storageOK?'原因已保存到本机':'原因已记录在当前页面');}}
    else if(a==='dismiss-help'){state.session.helpDismissed=true;save();render();}
    else if(a==='report')openReport(b.dataset.id);
    else if(a==='state')openState();
    else if(a==='retry-image'){if(state.session)state.session.brokenImage=null;const img=b.closest('[data-photo]').querySelector('img');img.src=`${byId[b.dataset.id].image}?retry=${Date.now()}`;save();}
    else if(a==='demo-default'){closeSheet();state.entryFilters=C.defaults();state.session=null;state.meal=C.nearestMeal();coldFlowInitialized=false;state.locationSource='device';state.locationResolved=false;save();render();scrollTo(0,0);}
    else if(a.startsWith('demo-'))demoScene(a.slice(5));
    else if(a==='reset')openSheet('清除本机记录？','reset','<p>将清除这个浏览器的本顿状态、上次选择和本地反馈。示例菜品文件不会改变。</p><div class="sheet-actions"><button class="primary" data-action="confirm-reset">清除并从头体验</button><button class="secondary" data-action="close">保留记录</button></div>');
    else if(a==='confirm-reset'){closeSheet();try{localStorage.removeItem(KEY);}catch{storageOK=false;}state=fresh();dueVisible=false;save();render();scrollTo(0,0);toast('已重置本机 Demo 记录');}
  });
  if(C.feedbackDue(state.latest))dueVisible=true;
  save(false);render();
  if(corrupt)toast('旧记录无法读取，已恢复初始状态');
})();
