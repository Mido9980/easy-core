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

/* ---- first-run setup / login ---- */
let MODE = 'login';

function setGate(on){ document.getElementById('gate').classList.toggle('on', on); }
function err(m){ document.getElementById('gErr').textContent = m || ''; }

function applyMode(exists, name){
  MODE = exists ? 'login' : 'setup';
  const isSetup = MODE === 'setup';
  document.getElementById('gateHint').textContent = isSetup
    ? 'تسجيل أول مرة — اختار اسمك والباسورد'
    : 'دخول لوحة التحكم';
  document.getElementById('gPass2').style.display = isSetup ? '' : 'none';
  document.querySelector('#setupFields label.lbl:nth-of-type(3)')?.setAttribute('style', isSetup ? '' : 'display:none');
  document.getElementById('gGo').textContent = isSetup ? 'إنشاء الحساب والدخول' : 'دخول';
  if (!isSetup && name) document.getElementById('gName').value = name;
  document.getElementById('gPass').setAttribute('autocomplete', isSetup ? 'new-password' : 'current-password');
}

async function initGate(){
  try{
    const s = await post({ action: 'owner.status' });
    const has = !!s.exists;
    if (has && localStorage.getItem('core.ok') === '1') { setGate(false); loadAll(); return; }
    applyMode(has, s.name || '');
    setGate(true);
  }catch(e){ applyMode(false, ''); setGate(true); err('مشكلة اتصال، جرّب تحديث الصفحة'); }
}

async function submitGate(){
  const nm = document.getElementById('gName').value.trim();
  const pw = document.getElementById('gPass').value;
  const pw2 = document.getElementById('gPass2').value;
  err('');
  if (nm.length < 2) return err('اكتب الاسم');
  if (pw.length < 4) return err('الباسورد 4 حروف أو أرقام على الأقل');
  try{
    if (MODE === 'setup'){
      if (pw !== pw2) return err('الباسوردين مش زي بعض');
      const r = await post({ action: 'owner.setup', name: nm, pin: pw });
      if (!r.ok) return err(r.error || 'فشل الإنشاء');
      localStorage.setItem('core.ok','1'); localStorage.setItem('core.name', r.name || nm);
      setGate(false); loadAll();
    } else {
      const r = await post({ action: 'owner.login', name: nm, pin: pw });
      if (!r.ok) return err(r.error || 'البيانات غلط');
      localStorage.setItem('core.ok','1'); localStorage.setItem('core.name', r.name || nm);
      setGate(false); loadAll();
    }
  }catch(e){ err('مشكلة اتصال'); }
}

document.getElementById('gGo').onclick = submitGate;
['gPass','gPass2'].forEach(id => document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') submitGate(); }));

document.getElementById('logout').onclick = () => {
  localStorage.removeItem('core.ok'); localStorage.removeItem('core.name');
  location.reload();
};

initGate();
setInterval(() => { if (!document.getElementById('gate').classList.contains('on')) loadAll(); }, 60000);
