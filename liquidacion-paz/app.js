const DB_NAME = 'qabum_paz_liquidacion';
const DB_VERSION = 1;
const STORE = 'items';
const SETTINGS_KEY = 'qabum_paz_settings_v1';
const BACKUP_KEY = 'qabum_paz_last_backup';
let db;
let items = [];
let editingPhotos = [];
let catalogSelection = new Set();
let activeSaleItem = null;

const $ = (id) => document.getElementById(id);
const money = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n||0));
const today = () => new Date().toISOString().slice(0,10);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const esc = (s='') => String(s).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const num = (v) => Number(v || 0);

function toast(message){
  const el=$('toast'); el.textContent=message; el.classList.add('show');
  clearTimeout(window.__toast); window.__toast=setTimeout(()=>el.classList.remove('show'),2400);
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function dbGetAll(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error)})}
function dbPut(item){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(item);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function dbDelete(id){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}
function dbClear(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)})}

function getSettings(){
  return {catalogTitle:'Objetos disponibles',contactName:'',contactPhone:'',locationText:'Quito, Ecuador',...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};
}
function saveSettings(s){localStorage.setItem(SETTINGS_KEY,JSON.stringify(s))}

function paid(item){return (item.sale?.payments||[]).reduce((s,p)=>s+num(p.amount),0)}
function salePrice(item){return num(item.sale?.price)}
function balance(item){return Math.max(0,salePrice(item)-paid(item))}
function fullyPaid(item){return !!item.sale && salePrice(item)>0 && balance(item)<=0.005}
function paymentState(item){
  if(!item.sale) return 'SIN VENTA';
  if(fullyPaid(item)) return 'PAGADO';
  if(paid(item)>0) return 'ABONO PARCIAL';
  return 'PENDIENTE';
}
function statusLabel(s){return ({DISPONIBLE:'Disponible',PUBLICADO:'Publicado',RESERVADO:'Reservado',VENDIDO:'Vendido'})[s]||s}
function conditionLabel(s){return ({MUY_BUENO:'Muy bueno',BUENO:'Bueno',REGULAR:'Regular',NUEVO:'Nuevo / sin uso'})[s]||s}

async function refresh(){
  items=(await dbGetAll()).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt));
  renderAll();
}
function renderAll(){renderDashboard();renderInventory();renderSales();renderCatalog();renderSettings();renderStorageNotice()}

function renderStorageNotice(){
  const last=localStorage.getItem(BACKUP_KEY);
  const days=last ? Math.floor((Date.now()-new Date(last).getTime())/86400000) : 999;
  const el=$('storageNotice');
  if(days<=3){el.className='notice good';el.textContent=`Datos guardados en este dispositivo. Último respaldo: ${new Date(last).toLocaleString('es-EC')}.`}
  else {el.className='notice';el.innerHTML=`Datos guardados en este dispositivo. <strong>${last?'Conviene hacer un nuevo respaldo.':'Aún no existe respaldo.'}</strong> Usa Ajustes → Exportar respaldo y guárdalo en Drive.`}
}

function renderDashboard(){
  const active=items.filter(i=>i.status!=='VENDIDO');
  const sold=items.filter(i=>i.status==='VENDIDO');
  const potential=active.reduce((s,i)=>s+num(i.askingPrice),0);
  const soldValue=sold.reduce((s,i)=>s+salePrice(i),0);
  const collected=items.reduce((s,i)=>s+paid(i),0);
  const receivable=items.reduce((s,i)=>s+balance(i),0);
  $('metrics').innerHTML=[
    ['Por vender',active.length,'artículos'],
    ['Potencial',money(potential),'a precio publicado'],
    ['Vendido',money(soldValue),`${sold.length} artículos`],
    ['Cobrado',money(collected),'efectivo + transferencias'],
    ['Por cobrar',money(receivable),'saldo pendiente']
  ].map(([l,v,s])=>`<div class="metric"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`).join('');
  $('recentItems').innerHTML=items.slice(0,6).map(itemCard).join('') || empty('Todavía no hay artículos. Usa “+ Nuevo” para empezar.');
}

function empty(text){return `<div class="empty">${esc(text)}</div>`}
function itemCard(i){
  const b=balance(i);
  return `<article class="card">
    <div class="card-image">${i.photos?.[0]?`<img src="${i.photos[0]}" alt="${esc(i.title)}">`:'Sin foto'}<span class="status">${statusLabel(i.status)}</span></div>
    <div class="card-body"><h3>${esc(i.title)}</h3><p>${esc(i.description||`${conditionLabel(i.condition)} · ${i.category||'Sin categoría'}`)}</p>
      <div class="price-row"><div><div class="price-label">${i.status==='VENDIDO'?'Venta':'Publicado'}</div><div class="price">${money(i.status==='VENDIDO'&&i.sale?salePrice(i):i.askingPrice)}</div></div>${i.sale&&b>0?`<div class="balance">Falta ${money(b)}</div>`:''}</div>
    </div>
    <div class="card-actions"><button class="btn ghost" onclick="editItem('${i.id}')">Editar</button><button class="btn ghost" onclick="openSale('${i.id}')">${i.sale?'Cobros':'Venta'}</button><button class="btn ghost" onclick="downloadCard('${i.id}')">Tarjeta</button><button class="btn danger" onclick="removeItem('${i.id}')">Eliminar</button></div>
  </article>`;
}

function renderInventory(){
  const q=$('searchInput').value.trim().toLowerCase(); const sf=$('statusFilter').value;
  const filtered=items.filter(i=>(sf==='TODOS'||i.status===sf)&&(!q||`${i.title} ${i.description} ${i.category}`.toLowerCase().includes(q)));
  $('inventoryGrid').innerHTML=filtered.map(itemCard).join('')||empty('No hay artículos que coincidan con el filtro.');
}

function renderSales(){
  const list=items.filter(i=>i.sale||i.status==='VENDIDO'||i.status==='RESERVADO');
  $('salesList').innerHTML=list.map(i=>{
    const p=paid(i),b=balance(i),ps=paymentState(i);
    return `<div class="sale-row">
      ${i.photos?.[0]?`<img class="sale-thumb" src="${i.photos[0]}" alt="">`:`<div class="sale-thumb"></div>`}
      <div><h3>${esc(i.title)}</h3><p>${esc(i.sale?.buyerName||'Sin comprador')} · ${ps}</p></div>
      <div class="money-cell secondary"><strong>${money(p)}</strong><span>cobrado</span></div>
      <div class="money-cell"><strong>${money(b)}</strong><span>pendiente</span><div><button class="btn ghost" onclick="openSale('${i.id}')">Abrir</button></div></div>
    </div>`
  }).join('')||empty('Aún no hay ventas ni reservas registradas.');
}

function renderCatalog(){
  const candidates=items.filter(i=>i.status!=='VENDIDO');
  for(const id of [...catalogSelection]) if(!candidates.some(i=>i.id===id)) catalogSelection.delete(id);
  $('catalogGrid').innerHTML=candidates.map(i=>`<label class="catalog-option"><input type="checkbox" data-catalog-id="${i.id}" ${catalogSelection.has(i.id)?'checked':''}>${i.photos?.[0]?`<img src="${i.photos[0]}" alt="">`:`<div></div>`}<div><strong>${esc(i.title)}</strong><span>${money(i.askingPrice)} · ${statusLabel(i.status)}</span></div></label>`).join('')||empty('No hay artículos disponibles para catálogo.');
  document.querySelectorAll('[data-catalog-id]').forEach(cb=>cb.addEventListener('change',e=>{e.target.checked?catalogSelection.add(e.target.dataset.catalogId):catalogSelection.delete(e.target.dataset.catalogId)}));
}

function renderSettings(){
  const s=getSettings(); $('catalogTitle').value=s.catalogTitle||'';$('contactName').value=s.contactName||'';$('contactPhone').value=s.contactPhone||'';$('locationText').value=s.locationText||'';
  const last=localStorage.getItem(BACKUP_KEY); $('backupStatus').textContent=last?`Último respaldo: ${new Date(last).toLocaleString('es-EC')}`:'Todavía no se ha generado un respaldo.';
}

function showTab(id){
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  window.scrollTo({top:0,behavior:'smooth'});
}

async function compressFile(file){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=data});
  const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));
  const w=Math.round(img.width*scale),h=Math.round(img.height*scale);const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);return c.toDataURL('image/jpeg',.78);
}
function renderPhotoPreview(){
  $('photoPreview').innerHTML=editingPhotos.map((src,idx)=>`<div class="thumb"><img src="${src}" alt="Foto ${idx+1}"><button type="button" onclick="removePhoto(${idx})">×</button></div>`).join('');
}
window.removePhoto=(idx)=>{editingPhotos.splice(idx,1);renderPhotoPreview()};

$('photos').addEventListener('change',async e=>{
  const remaining=5-editingPhotos.length;const files=[...e.target.files].slice(0,remaining);
  if(!files.length) return;
  toast('Procesando fotos…');
  for(const f of files) editingPhotos.push(await compressFile(f));
  renderPhotoPreview();e.target.value='';toast('Fotos listas');
});

$('itemForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const id=$('itemId').value||uid();const existing=items.find(i=>i.id===id);
  const item={
    id,createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),
    title:$('title').value.trim(),description:$('description').value.trim(),category:$('category').value.trim(),condition:$('condition').value,
    quickPrice:num($('quickPrice').value),suggestedPrice:num($('suggestedPrice').value),maxPrice:num($('maxPrice').value),askingPrice:num($('askingPrice').value),minimumPrice:num($('minimumPrice').value),
    status:$('itemStatus').value,marketNotes:$('marketNotes').value.trim(),photos:[...editingPhotos],sale:existing?.sale||null,priceHistory:existing?.priceHistory||[]
  };
  if(existing && num(existing.askingPrice)!==item.askingPrice) item.priceHistory.push({type:'PUBLICACION',old:num(existing.askingPrice),new:item.askingPrice,at:new Date().toISOString()});
  if(item.status==='VENDIDO'&&!item.sale) item.sale={buyerName:'',buyerPhone:'',date:today(),price:item.askingPrice,payments:[],priceHistory:[]};
  await dbPut(item);resetItemForm();await refresh();showTab('inventory');toast('Artículo guardado');
});

function resetItemForm(){
  $('itemForm').reset();$('itemId').value='';editingPhotos=[];renderPhotoPreview();$('formTitle').textContent='Nuevo artículo';$('cancelEdit').classList.add('hidden');$('itemStatus').value='DISPONIBLE';$('condition').value='MUY_BUENO';
}
$('cancelEdit').addEventListener('click',()=>{resetItemForm();showTab('inventory')});

window.editItem=(id)=>{
  const i=items.find(x=>x.id===id);if(!i)return;
  $('itemId').value=i.id;$('title').value=i.title||'';$('description').value=i.description||'';$('category').value=i.category||'';$('condition').value=i.condition||'MUY_BUENO';
  $('quickPrice').value=i.quickPrice||'';$('suggestedPrice').value=i.suggestedPrice||'';$('maxPrice').value=i.maxPrice||'';$('askingPrice').value=i.askingPrice||'';$('minimumPrice').value=i.minimumPrice||'';$('itemStatus').value=i.status||'DISPONIBLE';$('marketNotes').value=i.marketNotes||'';
  editingPhotos=[...(i.photos||[])];renderPhotoPreview();$('formTitle').textContent='Editar artículo';$('cancelEdit').classList.remove('hidden');showTab('new');
};
window.removeItem=async(id)=>{const i=items.find(x=>x.id===id);if(!i)return;if(!confirm(`¿Eliminar “${i.title}” y todo su historial de venta/pagos?`))return;await dbDelete(id);await refresh();toast('Artículo eliminado')};

window.openSale=(id)=>{
  const i=items.find(x=>x.id===id);if(!i)return;activeSaleItem=structuredClone(i);activeSaleItem.sale=activeSaleItem.sale||{buyerName:'',buyerPhone:'',date:today(),price:activeSaleItem.askingPrice,payments:[],priceHistory:[]};
  $('saleItemId').value=id;$('saleItemTitle').textContent=i.title;$('buyerName').value=activeSaleItem.sale.buyerName||'';$('buyerPhone').value=activeSaleItem.sale.buyerPhone||'';$('saleDate').value=activeSaleItem.sale.date||today();$('salePrice').value=activeSaleItem.sale.price||i.askingPrice||'';$('paymentDate').value=today();$('paymentAmount').value='';$('paymentReference').value='';
  updateSaleDialog();$('saleDialog').showModal();
};
function updateSaleDialog(){
  const p=paid(activeSaleItem), price=num($('salePrice').value||activeSaleItem.sale.price), b=Math.max(0,price-p), locked=activeSaleItem.sale && salePrice(activeSaleItem)>0 && fullyPaid(activeSaleItem);
  $('salePrice').disabled=locked;$('salePriceRule').textContent=locked?'Pagado al 100%: el precio quedó bloqueado.':'Puede modificarse mientras el artículo no esté pagado al 100%.';
  $('paymentSummary').innerHTML=`<div>Precio<strong>${money(price)}</strong></div><div>Recibido<strong>${money(p)}</strong></div><div>Saldo<strong>${money(b)}</strong></div>`;
  $('paymentsHistory').innerHTML=(activeSaleItem.sale.payments||[]).map(p=>`<div class="payment-line"><span>${esc(p.date)} · ${esc(p.method)}${p.reference?` · ${esc(p.reference)}`:''}</span><span>${money(p.amount)}</span><button type="button" class="btn danger" onclick="deletePendingPayment('${p.id}')">Quitar</button></div>`).join('')||'<small>Sin pagos registrados.</small>';
  $('paymentFieldset').disabled=b<=0.005;
}
$('salePrice').addEventListener('input',updateSaleDialog);
window.deletePendingPayment=(pid)=>{if(!activeSaleItem)return;activeSaleItem.sale.payments=(activeSaleItem.sale.payments||[]).filter(p=>p.id!==pid);updateSaleDialog()};
$('addPayment').addEventListener('click',()=>{
  if(!activeSaleItem)return;const price=num($('salePrice').value),p=paid(activeSaleItem),b=Math.max(0,price-p),amt=num($('paymentAmount').value);
  if(amt<=0)return toast('Ingresa un monto válido');if(amt>b+0.005)return toast(`El pago supera el saldo de ${money(b)}`);
  activeSaleItem.sale.payments.push({id:uid(),date:$('paymentDate').value||today(),amount:amt,method:$('paymentMethod').value,reference:$('paymentReference').value.trim(),createdAt:new Date().toISOString()});
  $('paymentAmount').value='';$('paymentReference').value='';updateSaleDialog();
});
$('saveSale').addEventListener('click',async()=>{
  if(!activeSaleItem)return;const original=items.find(i=>i.id===activeSaleItem.id);const oldPrice=salePrice(original);const newPrice=num($('salePrice').value);const p=paid(activeSaleItem);
  if(newPrice<p-0.005)return toast(`El precio no puede ser menor a lo ya cobrado (${money(p)})`);
  const wasLocked=original?.sale&&fullyPaid(original);if(wasLocked&&Math.abs(newPrice-oldPrice)>.005)return toast('El precio ya está bloqueado porque fue pagado al 100%');
  activeSaleItem.sale.buyerName=$('buyerName').value.trim();activeSaleItem.sale.buyerPhone=$('buyerPhone').value.trim();activeSaleItem.sale.date=$('saleDate').value||today();
  activeSaleItem.sale.price=newPrice;activeSaleItem.sale.priceHistory=activeSaleItem.sale.priceHistory||[];
  if(oldPrice&&Math.abs(oldPrice-newPrice)>.005)activeSaleItem.sale.priceHistory.push({old:oldPrice,new:newPrice,at:new Date().toISOString()});
  activeSaleItem.status='VENDIDO';activeSaleItem.updatedAt=new Date().toISOString();await dbPut(activeSaleItem);$('saleDialog').close();activeSaleItem=null;await refresh();toast('Venta y cobros guardados');
});

$('settingsForm').addEventListener('submit',e=>{e.preventDefault();saveSettings({catalogTitle:$('catalogTitle').value.trim(),contactName:$('contactName').value.trim(),contactPhone:$('contactPhone').value.trim(),locationText:$('locationText').value.trim()});toast('Ajustes guardados')});

$('exportBackup').addEventListener('click',async()=>{
  const payload={app:'Qabum Liquidación Paz',version:1,exportedAt:new Date().toISOString(),settings:getSettings(),items:await dbGetAll()};
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Qabum_Paz_Respaldo_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);localStorage.setItem(BACKUP_KEY,new Date().toISOString());renderStorageNotice();renderSettings();toast('Respaldo descargado');
});
$('importBackup').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.items))throw new Error('Formato inválido');if(!confirm(`Se reemplazarán los datos actuales por ${data.items.length} artículos del respaldo. ¿Continuar?`))return;await dbClear();for(const i of data.items)await dbPut(i);if(data.settings)saveSettings(data.settings);await refresh();toast('Respaldo importado correctamente')}catch(err){alert(`No pude importar el respaldo: ${err.message}`)}finally{e.target.value=''}
});

$('selectAvailable').addEventListener('click',()=>{catalogSelection=new Set(items.filter(i=>i.status==='DISPONIBLE'||i.status==='PUBLICADO').map(i=>i.id));renderCatalog()});
$('clearSelection').addEventListener('click',()=>{catalogSelection.clear();renderCatalog()});

async function imageInfo(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src})}
async function generatePdf(){
  const selected=items.filter(i=>catalogSelection.has(i.id));if(!selected.length)return toast('Selecciona al menos un artículo');if(!window.jspdf)return toast('El generador PDF aún está cargando');
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});const s=getSettings();
  for(let idx=0;idx<selected.length;idx++){
    if(idx>0)doc.addPage();const i=selected[idx];doc.setFillColor(17,17,17);doc.rect(0,0,210,24,'F');doc.setTextColor(255);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text(s.catalogTitle||'Objetos disponibles',12,15);doc.setFontSize(8);doc.setTextColor(244,214,45);doc.text('Powered by Qabum',198,15,{align:'right'});
    let y=33;
    if(i.photos?.[0]){try{const im=await imageInfo(i.photos[0]);const boxW=186,boxH=148;const ratio=Math.min(boxW/im.width,boxH/im.height);const w=im.width*ratio,h=im.height*ratio;doc.addImage(i.photos[0],'JPEG',12+(boxW-w)/2,y,w,h,undefined,'FAST');y+=boxH+10}catch(e){y+=8}}
    doc.setTextColor(17);doc.setFontSize(19);doc.setFont('helvetica','bold');doc.text(i.title,12,y,{maxWidth:186});y+=12;doc.setFontSize(11);doc.setFont('helvetica','normal');const lines=doc.splitTextToSize(i.description||`${conditionLabel(i.condition)} · ${i.category||''}`,186);doc.text(lines,12,y);y+=Math.min(28,lines.length*5)+7;doc.setFontSize(24);doc.setFont('helvetica','bold');doc.text(money(i.askingPrice),12,y);y+=10;doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(95);const contact=[s.locationText,s.contactName,s.contactPhone].filter(Boolean).join(' · ');if(contact)doc.text(contact,12,y,{maxWidth:186});
  }
  doc.save(`Qabum_Catalogo_${today()}.pdf`);toast('PDF generado');
}
$('generatePdf').addEventListener('click',generatePdf);

async function makeCardBlob(i){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const ctx=c.getContext('2d');ctx.fillStyle='#f4f3ef';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#111';ctx.fillRect(0,0,1080,110);ctx.fillStyle='#f4d62d';ctx.font='700 28px Arial';ctx.fillText('Powered by Qabum',730,68);
  let photoBottom=760;if(i.photos?.[0]){const im=await imageInfo(i.photos[0]);const box={x:60,y:160,w:960,h:610};const scale=Math.max(box.w/im.width,box.h/im.height);const w=im.width*scale,h=im.height*scale;ctx.save();ctx.beginPath();ctx.roundRect(box.x,box.y,box.w,box.h,24);ctx.clip();ctx.drawImage(im,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);ctx.restore();photoBottom=790}
  ctx.fillStyle='#111';ctx.font='800 55px Arial';wrapCanvasText(ctx,i.title,60,photoBottom+70,960,66,2);ctx.font='400 32px Arial';ctx.fillStyle='#555';wrapCanvasText(ctx,i.description||`${conditionLabel(i.condition)} · ${i.category||''}`,60,photoBottom+205,960,42,3);ctx.fillStyle='#111';ctx.font='900 76px Arial';ctx.fillText(money(i.askingPrice),60,1230);
  const s=getSettings();ctx.font='500 25px Arial';ctx.fillStyle='#666';const contact=[s.locationText,s.contactName,s.contactPhone].filter(Boolean).join(' · ');ctx.fillText(contact.slice(0,75),60,1290);
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
}
function wrapCanvasText(ctx,text,x,y,maxWidth,lineHeight,maxLines){const words=String(text||'').split(/\s+/);let line='',lines=0;for(let n=0;n<words.length;n++){const test=line+words[n]+' ';if(ctx.measureText(test).width>maxWidth&&n>0){ctx.fillText(line,x,y);line=words[n]+' ';y+=lineHeight;lines++;if(lines>=maxLines-1)break}else line=test}if(lines<maxLines)ctx.fillText(line,x,y)}
window.downloadCard=async(id)=>{const i=items.find(x=>x.id===id);if(!i)return;const blob=await makeCardBlob(i);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${i.title.replace(/[^a-z0-9]+/gi,'_').slice(0,50)}_Qabum.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Tarjeta descargada')};

function bindNav(){
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{if(t.dataset.tab==='new'&&!$('itemId').value)resetItemForm();showTab(t.dataset.tab)}));
  document.querySelectorAll('[data-go-new]').forEach(b=>b.addEventListener('click',()=>{resetItemForm();showTab('new')}));
  $('searchInput').addEventListener('input',renderInventory);$('statusFilter').addEventListener('change',renderInventory);
}

async function init(){
  try{db=await openDb();if(navigator.storage?.persist)await navigator.storage.persist();bindNav();$('saleDate').value=today();$('paymentDate').value=today();await refresh();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});}catch(err){console.error(err);alert('No pude iniciar el almacenamiento local. Revisa que el navegador no esté en modo privado.')}
}
init();