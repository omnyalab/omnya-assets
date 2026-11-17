import puppeteer from 'puppeteer-core';
const OUT = '../board/f', B = 'http://localhost:5391/zz-f/watch';
const br = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const shots = [['top', "document.body.classList.add('rv'); scrollTo(0,0)"], ['proof', "document.querySelector('.b2h').scrollIntoView({block:'start'}); scrollBy(0,-20)"], ['line', "document.querySelector('.join').scrollIntoView({block:'center'})"], ['offer-m', "document.querySelector('#offer .right').scrollIntoView({block:'start'}); scrollBy(0,-20)"], ['offer-d', "document.querySelector('#offer').scrollIntoView({block:'start'})"], ['bf', "document.querySelector('.bfsec').scrollIntoView({block:'start'}); scrollBy(0,-120)"]];
for (const day of [1, 2]) for (const dev of ['m', 'd']) for (const [n, js] of shots) {
  if ((n === 'offer-m' && dev === 'd') || (n === 'offer-d' && dev === 'm')) continue
  if (day === 2 && !['top', 'offer-m', 'offer-d'].includes(n)) continue
  const p = await br.newPage();
  if (dev === 'm') await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  else await p.setViewport({ width: 1440, height: 900 });
  await p.evaluateOnNewDocument(d => { try { localStorage.clear(); if (d === 2) localStorage.setItem('omnya_ry_first', '20261116') } catch (e) {} }, day);
  await p.goto(B, { waitUntil: 'networkidle2', timeout: 60000 });
  await p.addStyleTag({ content: '[class*=cookie]{display:none!important}' });
  await p.evaluate(js); await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: `${OUT}/day${day}-${n}-${dev}.jpg`, type: 'jpeg', quality: 82 });
  await p.close();
}
await br.close(); console.log('ok')
