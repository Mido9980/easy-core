/* EASY CORE dashboard */
const API = 'https://shark-vision-labs.base44.app/functions/coreApi';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(e._h);e._h=setTimeout(()=>e.classList.remove('on'),1900);}
const post = b => fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());

async function loadAll(){
  $('#state').textContent='…';
  try{
    const [s, a] = await Promise.all([ post({action:'stats'}), post({action:'apps'}) ]);
    $('#state').textContent = s.ok ? 'متصل' : 'خطأ';
    $('#state').classList.toggle('ok', !!s.ok);
    if(s.ok){
      $('#sEvents').textContent=s.totals.events; $('#sUsers').textContent=s.totals.users;
      $('#sItems').textContent=s.totals.items; $('#sApps').textContent=s.totals.apps;
      $('#events').innerHTML = (s.recent||[]).length ? s.recent.map(e=>`<div class="h">${esc(e.app)} · ${esc(e.type)} · ${esc((e.detail||'').slice(0,40))} <span class="mut">${String(e.at||'').slice(5,16)}</span></div>`).join('') : '<p class="hint">مفيش أحداث.</p>';
    }
    const apps = a.apps||[];
    $('#appsInfo').textContent = apps.length + ' برنامج';
    $('#apps').innerHTML = apps.map(x=>`<a class="mini" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>`).join('') || '<p class="hint">مفيش برامج مسجلة.</p>';
  }catch(e){ $('#state').textContent='خطأ'; }
}
$('#refresh').onclick = loadAll;

function show(o){ $('#tOut').textContent = JSON.stringify(o,null,2).slice(0,2000); }

$('#tSet').onclick = async () => {
  let v = $('#tVal').value.trim();
  try { v = JSON.parse(v); } catch(e) {}
  show(await post({action:'kv.set', app:$('#tApp').value.trim(), key:$('#tKey').value.trim(), value:v}));
  loadAll();
};
$('#tGet').onclick = async () => show(await post({action:'kv.get', app:$('#tApp').value.trim(), key:$('#tKey').value.trim()}));
$('#tList').onclick = async () => show(await post({action:'kv.list', app:$('#tApp').value.trim()}));

/* ---- login gate: name easycode + phone as the password ---- */
const OWNER_PHONE = '201100102398';

function unlocked(){ return localStorage.getItem('core.ok') === '1'; }
function setGate(on){ document.getElementById('gate').classList.toggle('on', on); }

async function tryLogin(){
  const nm = document.getElementById('gName').value.trim().toLowerCase();
  const pw = document.getElementById('gPass').value.replace(/\s+/g,'');
  const err = document.getElementById('gErr');
  err.textContent = '';
  if (nm !== 'easycode') { err.textContent = 'الاسم لازم يكون easycode'; return; }
  if (pw.length < 4) { err.textContent = 'اكتب رقم الموبايل'; return; }
  try{
    const r = await post({ action:'login', phone: OWNER_PHONE, pin: pw });
    if (!r.ok){ err.textContent = r.error || 'البيانات غلط'; return; }
    localStorage.setItem('core.ok','1');
    localStorage.setItem('core.name', r.name || 'easycode');
    setGate(false);
    loadAll();
  }catch(e){ err.textContent = 'مشكلة اتصال'; }
}

document.getElementById('gGo').onclick = tryLogin;
document.getElementById('gPass').addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });

if (!unlocked()) setGate(true); else loadAll();
setInterval(() => { if (unlocked()) loadAll(); }, 60000);
