/* Lightweight acceptance checks for the static Demo. Product has no test dependency. */
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const URL = process.env.DEMO_URL || 'http://127.0.0.1:4173';
const KEY = 'chishenme.demo.v1';
const shots = path.join(__dirname,'screenshots'); fs.mkdirSync(shots,{recursive:true});
let browser, context, page; const results=[];
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function fresh(viewport={width:390,height:844}) {
  if (context) await context.close();
  context = await browser.newContext({viewport}); page = await context.newPage();
  page.setDefaultTimeout(5000); await page.goto(URL); await page.evaluate(key=>localStorage.clear(),KEY); await page.reload(); await wait(120);
}
async function click(action) { await page.locator(`dialog[open] [data-action="${action}"], [data-action="${action}"]`).last().click(); await wait(140); }
async function state() { return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY); }
async function swipe(locator, dx) {
  await locator.scrollIntoViewIfNeeded();
  const box=await locator.boundingBox(); assert.ok(box,`无法定位滑动卡片 ${await locator.getAttribute('data-value')}`);
  const x=box.x+box.width/2, y=box.y+box.height/2;
  await page.mouse.move(x,y); await page.mouse.down(); await page.mouse.move(x+dx,y,{steps:5}); await page.mouse.up(); await wait(260);
}
async function swipeFirst(dx) { await swipe(page.locator('.scatter-card').first(),dx); }
async function clearStage() { const title=await page.locator('.cold-stage-heading h1').innerText(); while(await page.locator('.scatter-card').count() && await page.locator('.cold-stage-heading h1').innerText()===title){ await page.locator('.scatter-card').first().click(); await wait(260); } await wait(100); }
async function check(name, fn) { try { await fn(); results.push({name,status:'PASS'}); console.log('PASS',name); } catch (e) { results.push({name,status:'FAIL',error:e.message}); console.log('FAIL',name,e.message); } }
(async()=>{
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
  await check('冷启动页显示散落价格卡且不再提供旧入口',async()=>{
    await fresh(); const text=await page.locator('main').innerText();
    assert.equal(await page.locator('.scatter-card').count(),4); assert.equal(await page.locator('[data-action="browse"]').count(),0);
    assert.equal(await page.locator('.choice-grid').count(),0);
    for(const removed of ['少一点纠结','从一道想吃的开始','给你一个提议','一顿饭，一个好主意']) assert.ok(!text.includes(removed));
    assert.equal(await page.locator('[data-action="entry-meal"]').count(),0); assert.ok(!text.includes('系统判断')); assert.ok(!text.includes('晚餐')); await page.screenshot({path:path.join(shots,'01-entry.png'),fullPage:true});
  });
  await check('首页主图轮换且图片不依赖外链',async()=>{
    const before=await page.locator('.hero-inner img').getAttribute('src'); await wait(3800); const after=await page.locator('.hero-inner img').getAttribute('src'); assert.notEqual(before,after); assert.equal(await page.locator('.hero-note').count(),0); assert.ok(await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)));
  });
  await check('左右滑动分别剔除和保留，并依次进入三类条件',async()=>{
    await fresh();
    await swipeFirst(-100); let s=await state(); assert.deepEqual(s.entryFilters.excludedPrice,['low']); assert.equal(await page.locator('.scatter-card').count(),3);
    await swipeFirst(100); s=await state(); assert.deepEqual(s.entryFilters.excludedPrice,['low']); assert.equal(await page.locator('.scatter-card').count(),2);
    await page.locator('.scatter-card').first().click(); await wait(260); await page.locator('.scatter-card').first().click(); await wait(260);
    assert.equal(await page.locator('.cold-stage-heading h1').innerText(),'再看距离'); assert.equal(await page.locator('.scatter-card').count(),4); await page.screenshot({path:path.join(shots,'02-distance-scatter.png'),fullPage:true});
    await clearStage(); assert.equal(await page.locator('.cold-stage-heading h1').innerText(),'最后看忌口'); assert.equal(await page.locator('.scatter-card').count(),5); await page.screenshot({path:path.join(shots,'03-taboo-scatter.png'),fullPage:true});
  });
  await check('忌口和手动关键词完成后才出现开始按钮',async()=>{
    await fresh(); await clearStage(); await clearStage();
    await page.locator('[data-action="manual-taboo"]').fill('花生');
    await swipeFirst(-100); await wait(260); await clearStage();
    assert.equal(await page.locator('.cold-complete').count(),1); assert.equal(await page.locator('[data-action="start"]').count(),1); assert.equal((await state()).entryFilters.manualTaboo,'花生'); await page.screenshot({path:path.join(shots,'04-cold-complete.png'),fullPage:true});
    await click('start'); const s=await state(); assert.equal(s.session.meal,await page.evaluate(()=>DemoCore.nearestMeal())); assert.equal(await page.locator('.food-card').count(),1);
  });
  await check('手动位置可改且不改变餐次输入方式',async()=>{
    await fresh(); await click('location'); await page.locator('[data-action="zone-draft"][data-value="library"]').click(); await click('apply-filters'); const s=await state(); assert.equal(s.zone,'library'); assert.equal(s.locationSource,'manual'); assert.equal(s.meal,await page.evaluate(()=>DemoCore.nearestMeal()));
  });
  await check('推荐闭环仍支持换卡、撤回和选定',async()=>{
    await fresh(); await page.locator('[data-action="cold-next"]').click(); await wait(120); await page.locator('[data-action="cold-next"]').click(); await wait(120); await page.locator('[data-action="cold-next"]').click(); await wait(120);
    await click('start'); assert.equal(await page.locator('.swipe-hint').count(),0); assert.equal(await page.locator('[data-action="self-select"]').count(),0); assert.equal(await page.locator('.card-recommendation').count(),1); const sizes=await page.locator('.decision-controls button').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return `${Math.round(r.width)}x${Math.round(r.height)}`})); assert.deepEqual(new Set(sizes).size,1);
    const before=await state(); await page.locator('[data-action="skip"]').click(); await wait(260); const after=await state(); assert.equal(after.session.events.at(-1).type,'card_skipped'); assert.equal(after.session.shown.length,before.session.shown.length+1); await click('undo'); assert.equal((await state()).session.current,before.session.current); await page.locator('[data-action="accept"]').click(); await wait(260); assert.equal((await state()).session.screen,'result');
  });
  await check('窄屏没有横向溢出',async()=>{
    await fresh({width:360,height:640}); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)); await page.screenshot({path:path.join(shots,'05-entry-360.png'),fullPage:true});
  });
  fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({date:new Date().toISOString(),browser:await browser.version(),results},null,2));
  await browser.close(); if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();process.exitCode=1});
