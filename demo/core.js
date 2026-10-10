/* Small shared rules, kept separate so filtering can be checked without a browser. */
(function (root) {
  const PRICE_BANDS = { low: '低价的', value: '实惠的', refined: '精致的' };
  const DISTANCE_BANDS = { near: '近一点', medium: '适中', far: '远一点' };
  const TABOO_LABELS = { spicy: '辣', seafood: '海鲜', cilantro: '香菜', onionGarlic: '葱蒜', beefLamb: '牛羊肉' };
  const defaults = () => ({ budget: null, maxWalk: null, excluded: [], nonSpicy: false, excludedPrice: [], excludedDistance: [], dietary: [], manualTaboo: '' });
  const priceBand = price => price <= 12 ? 'low' : price <= 18 ? 'value' : 'refined';
  const distanceBand = minutes => minutes <= 5 ? 'near' : minutes <= 10 ? 'medium' : 'far';
  function normalized(filters) {
    const f = filters || {};
    return { ...defaults(), ...f,
      excluded: Array.isArray(f.excluded) ? f.excluded : [],
      excludedPrice: Array.isArray(f.excludedPrice) ? f.excludedPrice : [],
      excludedDistance: Array.isArray(f.excludedDistance) ? f.excludedDistance : [],
      dietary: Array.isArray(f.dietary) ? f.dietary : [],
      manualTaboo: typeof f.manualTaboo === 'string' ? f.manualTaboo : '' };
  }
  function keywordTags(text) {
    const value = String(text || '').toLowerCase(), tags = [];
    if (/(辣|麻|椒|辣椒)/.test(value)) tags.push('spicy');
    if (/(海鲜|虾|鱼|蟹)/.test(value)) tags.push('seafood');
    if (/(香菜|芫荽)/.test(value)) tags.push('cilantro');
    if (/(葱|蒜|洋葱)/.test(value)) tags.push('onionGarlic');
    if (/(牛|羊)/.test(value)) tags.push('beefLamb');
    return tags;
  }
  function manualTokens(text) {
    return String(text || '').replace(/^(不吃|不要|忌口|避开)/, '').split(/[，,、\s]+/).map(x => x.trim()).filter(x => x.length >= 1);
  }
  function dishTags(dish) {
    return [...new Set([...(dish.dietaryTags || []), ...keywordTags(`${dish.name} ${dish.ingredients || ''}`).filter(tag => tag !== 'spicy')])];
  }
  function eligible(dishes, rawFilters, zone, meal) {
    const filters = normalized(rawFilters), manualTags = keywordTags(filters.manualTaboo), manualWords = manualTokens(filters.manualTaboo), blockedTags = new Set([...filters.dietary, ...manualTags]);
    if (filters.nonSpicy) blockedTags.add('spicy');
    return dishes.filter(d => {
      const walk = d.walk?.[zone], tags = new Set(dishTags(d)), search = `${d.name} ${d.ingredients || ''} ${d.description || ''}`;
      if (d.spicy) tags.add('spicy');
      return d.available && d.supply !== 'closed' && d.meals.includes(meal)
        && (filters.budget === null || (Number.isFinite(d.price) && d.price <= filters.budget))
        && (filters.maxWalk === null || (Number.isFinite(walk) && walk <= filters.maxWalk))
        && !filters.excluded.includes(d.category)
        && !filters.excludedPrice.includes(priceBand(d.price))
        && !filters.excludedDistance.includes(distanceBand(walk))
        && (!filters.nonSpicy || d.spicy === false)
        && !manualWords.some(word => search.includes(word))
        && ![...blockedTags].some(tag => tags.has(tag));
    });
  }
  function shuffle(items, random = Math.random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i],copy[j]] = [copy[j],copy[i]]; }
    return copy;
  }
  function reason(dish, rawFilters, zone) {
    const filters = normalized(rawFilters), facts = [];
    if (!filters.excludedPrice.length) facts.push(`${PRICE_BANDS[priceBand(dish.price)]}范围内`);
    if (!filters.excludedDistance.length) facts.push(`从当前位置步行约 ${dish.walk[zone]} 分钟`);
    if (filters.nonSpicy || filters.dietary.includes('spicy')) facts.push('示例配方不辣');
    return facts.length ? `${facts.slice(0,2).join('；')}。` : `从当前餐次的可用示例中选一道，步行约 ${dish.walk[zone]} 分钟。`;
  }
  function summary(rawFilters) {
    const filters = normalized(rawFilters), bits = [];
    bits.push(filters.excludedPrice.length ? `排除${filters.excludedPrice.map(x => PRICE_BANDS[x]).join('、')}` : '价格不限');
    bits.push(filters.excludedDistance.length ? `排除${filters.excludedDistance.map(x => DISTANCE_BANDS[x]).join('、')}` : '距离不限');
    const tags = [...new Set([...filters.dietary, ...keywordTags(filters.manualTaboo)])];
    if (filters.nonSpicy || tags.length) bits.push(`忌口 ${[...(filters.nonSpicy ? ['不吃辣'] : []), ...tags.map(x => TABOO_LABELS[x] || x)].filter((x,i,a) => a.indexOf(x) === i).join('、')}`);
    if (filters.manualTaboo && !tags.length) bits.push(`其他忌口 ${filters.manualTaboo}`);
    return bits.join(' · ');
  }
  function nearestMeal(now = new Date()) {
    const minutes = now.getHours() * 60 + now.getMinutes();
    return Math.abs(minutes - 12 * 60) <= Math.abs(minutes - 18 * 60) ? 'lunch' : 'dinner';
  }
  function feedbackDue(choice, now = Date.now()) {
    if (!choice || choice.reopened || choice.mealPrompted || choice.mealFeedback) return false;
    const age = now - choice.acceptedAt;
    return age >= 2 * 60 * 60 * 1000 && age <= 7 * 24 * 60 * 60 * 1000;
  }
  root.DemoCore = {defaults,normalized,eligible,shuffle,reason,summary,feedbackDue,nearestMeal,priceBand,distanceBand,keywordTags,manualTokens,PRICE_BANDS,DISTANCE_BANDS,TABOO_LABELS};
})(typeof window === 'undefined' ? globalThis : window);
