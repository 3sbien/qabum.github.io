const QABUM_URL='https://qabum.com';
const QABUM_BLUE='#012169';
const QABUM_RED='#C8102E';
const QABUM_WHITE='#ffffff';
const QABUM_BLACK='#000000';

async function qabumLogoPng(){
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src='qabum-logo.svg'});
  const c=document.createElement('canvas');c.width=690;c.height=386;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);return c.toDataURL('image/png');
}

async function generateQabumPdf(){
  const selected=items.filter(i=>catalogSelection.has(i.id));
  if(!selected.length)return toast('Selecciona al menos un artículo');
  if(!window.jspdf)return toast('El generador PDF aún está cargando');
  const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});const s=getSettings();const logo=await qabumLogoPng();
  for(let idx=0;idx<selected.length;idx++){
    if(idx>0)doc.addPage();const i=selected[idx];
    doc.setFillColor(255,255,255);doc.rect(0,0,210,30,'F');
    doc.setDrawColor(1,33,105);doc.setLineWidth(1.2);doc.line(12,25,198,25);
    doc.setDrawColor(200,16,46);doc.setLineWidth(.8);doc.line(12,28,82,28);
    doc.setTextColor(1,33,105);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text("Paz's Sale",12,16);
    doc.addImage(logo,'PNG',153,5,45,25);doc.link(153,5,45,25,{url:QABUM_URL});
    let y=36;
    if(i.photos?.[0]){try{const im=await imageInfo(i.photos[0]);const boxW=186,boxH=142;const ratio=Math.min(boxW/im.width,boxH/im.height);const w=im.width*ratio,h=im.height*ratio;doc.addImage(i.photos[0],'JPEG',12+(boxW-w)/2,y,w,h,undefined,'FAST');y+=boxH+10}catch(e){y+=8}}
    doc.setTextColor(0,0,0);doc.setFontSize(19);doc.setFont('helvetica','bold');doc.text(i.title,12,y,{maxWidth:186});y+=12;
    doc.setFontSize(11);doc.setFont('helvetica','normal');const lines=doc.splitTextToSize(i.description||`${conditionLabel(i.condition)} · ${i.category||''}`,186);doc.text(lines,12,y);y+=Math.min(28,lines.length*5)+7;
    doc.setFontSize(24);doc.setFont('helvetica','bold');doc.setTextColor(1,33,105);doc.text(money(i.askingPrice),12,y);y+=10;
    doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(0,0,0);const contact=[s.locationText,s.contactName,s.contactPhone].filter(Boolean).join(' · ');if(contact)doc.text(contact,12,y,{maxWidth:186});
    doc.setTextColor(1,33,105);doc.text('qabum.com',198,286,{align:'right'});doc.link(174,280,24,8,{url:QABUM_URL});
  }
  doc.save(`Pazs_Sale_Catalogo_${today()}.pdf`);toast('PDF generado');
}

async function makeQabumCard(i){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');x.fillStyle=QABUM_WHITE;x.fillRect(0,0,1080,1350);x.fillStyle=QABUM_BLUE;x.fillRect(0,0,1080,118);x.fillStyle=QABUM_RED;x.fillRect(0,118,280,9);x.fillStyle=QABUM_WHITE;x.font='800 36px Arial';x.fillText("Paz's Sale",60,72);
  const logo=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src='qabum-logo.svg'});x.fillStyle=QABUM_WHITE;x.roundRect(760,18,260,82,18);x.fill();x.drawImage(logo,770,23,240,72);
  let photoBottom=790;if(i.photos?.[0]){const im=await imageInfo(i.photos[0]);const box={x:60,y:170,w:960,h:600};const scale=Math.max(box.w/im.width,box.h/im.height);const w=im.width*scale,h=im.height*scale;x.save();x.beginPath();x.roundRect(box.x,box.y,box.w,box.h,24);x.clip();x.drawImage(im,box.x+(box.w-w)/2,box.y+(box.h-h)/2,w,h);x.restore()}
  x.fillStyle=QABUM_BLUE;x.font='800 55px Arial';wrapCanvasText(x,i.title,60,photoBottom+65,960,66,2);x.fillStyle=QABUM_BLACK;x.font='400 31px Arial';wrapCanvasText(x,i.description||`${conditionLabel(i.condition)} · ${i.category||''}`,60,photoBottom+200,960,42,3);x.fillStyle=QABUM_BLUE;x.font='900 78px Arial';x.fillText(money(i.askingPrice),60,1220);const s=getSettings();x.fillStyle=QABUM_BLACK;x.font='500 24px Arial';const contact=[s.locationText,s.contactName,s.contactPhone].filter(Boolean).join(' · ');x.fillText(contact.slice(0,78),60,1280);x.fillStyle=QABUM_BLUE;x.font='700 24px Arial';x.fillText('qabum.com',855,1280);
  return new Promise(resolve=>c.toBlob(resolve,'image/png'));
}

window.downloadCard=async(id)=>{const i=items.find(x=>x.id===id);if(!i)return;const blob=await makeQabumCard(i);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${i.title.replace(/[^a-z0-9]+/gi,'_').slice(0,50)}_Qabum.png`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('Tarjeta descargada')};

document.addEventListener('click',async e=>{
  if(e.target.closest('#generatePdf')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();await generateQabumPdf();return}
  if(e.target.closest('#exportBackup')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const payload={app:"Qabum Paz's Sale",version:1,exportedAt:new Date().toISOString(),settings:getSettings(),items:await dbGetAll()};const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Qabum_Pazs_Sale_Respaldo_${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);localStorage.setItem(BACKUP_KEY,new Date().toISOString());renderStorageNotice();renderSettings();toast('Respaldo descargado')}
},true);

document.title="Qabum | Paz's Sale";
