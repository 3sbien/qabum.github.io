/* Paz's Sale — basic photo cropper. Keeps compressed originals alongside display crops. */
(function installCropUi(){
  if(!document.querySelector('link[href="crop.css"]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='crop.css';document.head.appendChild(link);
  }
  if(!document.getElementById('cropDialog')){
    document.body.insertAdjacentHTML('beforeend',`<dialog id="cropDialog" class="crop-dialog">
      <div class="crop-shell">
        <div class="crop-head"><div><div class="eyebrow" id="cropCounter">Foto</div><h2>Recortar foto</h2></div><button type="button" class="icon-btn" id="cropClose" aria-label="Cerrar">×</button></div>
        <div class="crop-stage"><canvas id="cropCanvas" width="960" height="600"></canvas></div>
        <p class="crop-help">Arrastra la foto para encuadrarla. El recorte coincide con el formato de las tarjetas.</p>
        <div class="crop-controls">
          <label class="crop-zoom">Zoom <input id="cropZoom" type="range" min="1" max="3" step="0.01" value="1"></label>
          <button type="button" class="btn ghost" id="cropRotate">Girar 90°</button>
          <button type="button" class="btn ghost" id="cropReset">Centrar</button>
        </div>
        <div class="crop-actions"><button type="button" class="btn ghost" id="cropUseOriginal">Usar original</button><div class="crop-actions-right"><button type="button" class="btn ghost" id="cropCancel">Cancelar</button><button type="button" class="btn dark" id="cropSave">Guardar recorte</button></div></div>
      </div>
    </dialog>`);
  }
})();
let editingOriginalPhotos = [];
let cropIndex = -1;
let cropSource = '';
let cropImage = null;
let cropRotation = 0;
let cropZoom = 1;
let cropOffsetX = 0;
let cropOffsetY = 0;
let cropDragging = false;
let cropLastX = 0;
let cropLastY = 0;

const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const cropDialog = document.getElementById('cropDialog');
const cropZoomInput = document.getElementById('cropZoom');

function loadCropImage(src){
  return new Promise((resolve,reject)=>{
    const im = new Image();
    im.onload = ()=>resolve(im);
    im.onerror = reject;
    im.src = src;
  });
}

function rotatedSize(){
  if(!cropImage) return {w:1,h:1};
  const turn = ((cropRotation % 180) + 180) % 180;
  return turn === 90 ? {w:cropImage.height,h:cropImage.width} : {w:cropImage.width,h:cropImage.height};
}

function clampCropOffsets(){
  if(!cropImage) return;
  const {w,h}=rotatedSize();
  const base=Math.max(cropCanvas.width/w,cropCanvas.height/h);
  const scale=base*cropZoom;
  const maxX=Math.max(0,(w*scale-cropCanvas.width)/2);
  const maxY=Math.max(0,(h*scale-cropCanvas.height)/2);
  cropOffsetX=Math.max(-maxX,Math.min(maxX,cropOffsetX));
  cropOffsetY=Math.max(-maxY,Math.min(maxY,cropOffsetY));
}

function drawCrop(){
  if(!cropImage) return;
  clampCropOffsets();
  const {w,h}=rotatedSize();
  const base=Math.max(cropCanvas.width/w,cropCanvas.height/h);
  const scale=base*cropZoom;
  cropCtx.save();
  cropCtx.clearRect(0,0,cropCanvas.width,cropCanvas.height);
  cropCtx.fillStyle='#ffffff';
  cropCtx.fillRect(0,0,cropCanvas.width,cropCanvas.height);
  cropCtx.translate(cropCanvas.width/2+cropOffsetX,cropCanvas.height/2+cropOffsetY);
  cropCtx.rotate(cropRotation*Math.PI/180);
  cropCtx.scale(scale,scale);
  cropCtx.drawImage(cropImage,-cropImage.width/2,-cropImage.height/2);
  cropCtx.restore();
}

async function openCropper(index){
  cropIndex=index;
  cropSource=editingOriginalPhotos[index] || editingPhotos[index];
  if(!cropSource) return;
  try{
    cropImage=await loadCropImage(cropSource);
    cropRotation=0;
    cropZoom=1;
    cropOffsetX=0;
    cropOffsetY=0;
    cropZoomInput.value='1';
    document.getElementById('cropCounter').textContent=`Foto ${index+1}`;
    drawCrop();
    cropDialog.showModal();
  }catch(err){
    console.error(err);
    toast('No pude abrir esta foto para editar');
  }
}
window.openCropper=openCropper;

function enhancedPhotoPreview(){
  const host=document.getElementById('photoPreview');
  if(!host) return;
  host.innerHTML=editingPhotos.map((src,idx)=>`<div class="thumb-wrap"><div class="thumb"><img src="${src}" alt="Foto ${idx+1}"><button class="thumb-remove" type="button" onclick="removePhoto(${idx})" aria-label="Eliminar foto">×</button></div><button class="photo-edit-btn" type="button" onclick="openCropper(${idx})">Recortar</button></div>`).join('');
}

renderPhotoPreview = enhancedPhotoPreview;

window.removePhoto=(idx)=>{
  editingOriginalPhotos.splice(idx,1);
  editingPhotos.splice(idx,1);
  enhancedPhotoPreview();
};

document.getElementById('photos').addEventListener('change',async e=>{
  e.stopImmediatePropagation();
  const remaining=5-editingPhotos.length;
  const files=[...e.target.files].slice(0,remaining);
  if(!files.length) return;
  toast('Procesando fotos…');
  try{
    for(const f of files){
      const compressed=await compressFile(f);
      editingOriginalPhotos.push(compressed);
      editingPhotos.push(compressed);
    }
    enhancedPhotoPreview();
    toast('Fotos listas. Puedes recortarlas si quieres.');
  }catch(err){
    console.error(err);
    toast('No pude procesar una de las fotos');
  }finally{
    e.target.value='';
  }
},true);

const baseDbPut=dbPut;
dbPut=async function(item){
  const samePhotoSet=Array.isArray(item?.photos) && item.photos.length===editingPhotos.length && item.photos.every((p,i)=>p===editingPhotos[i]);
  if(samePhotoSet && editingOriginalPhotos.length===editingPhotos.length){
    item.photoOriginals=[...editingOriginalPhotos];
  }
  return baseDbPut(item);
};

const baseEditItem=window.editItem;
window.editItem=(id)=>{
  const item=items.find(x=>x.id===id);
  editingOriginalPhotos=[...(item?.photoOriginals || item?.photos || [])];
  baseEditItem(id);
  enhancedPhotoPreview();
};

const baseResetItemForm=resetItemForm;
resetItemForm=function(){
  editingOriginalPhotos=[];
  baseResetItemForm();
  enhancedPhotoPreview();
};

document.getElementById('cropClose').addEventListener('click',()=>cropDialog.close());
document.getElementById('cropCancel').addEventListener('click',()=>cropDialog.close());

cropZoomInput.addEventListener('input',()=>{
  cropZoom=Number(cropZoomInput.value)||1;
  drawCrop();
});

document.getElementById('cropRotate').addEventListener('click',()=>{
  cropRotation=(cropRotation+90)%360;
  cropOffsetX=0;
  cropOffsetY=0;
  drawCrop();
});

document.getElementById('cropReset').addEventListener('click',()=>{
  cropRotation=0;
  cropZoom=1;
  cropOffsetX=0;
  cropOffsetY=0;
  cropZoomInput.value='1';
  drawCrop();
});

document.getElementById('cropUseOriginal').addEventListener('click',()=>{
  if(cropIndex<0) return;
  editingPhotos[cropIndex]=editingOriginalPhotos[cropIndex] || cropSource;
  enhancedPhotoPreview();
  cropDialog.close();
  toast('Se restauró la foto original');
});

document.getElementById('cropSave').addEventListener('click',()=>{
  if(cropIndex<0 || !cropImage) return;
  editingPhotos[cropIndex]=cropCanvas.toDataURL('image/jpeg',.86);
  enhancedPhotoPreview();
  cropDialog.close();
  toast('Recorte guardado');
});

function pointerPos(e){
  const r=cropCanvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(cropCanvas.width/r.width),y:(e.clientY-r.top)*(cropCanvas.height/r.height)};
}
cropCanvas.addEventListener('pointerdown',e=>{
  cropDragging=true;
  cropCanvas.setPointerCapture(e.pointerId);
  const p=pointerPos(e);cropLastX=p.x;cropLastY=p.y;
});
cropCanvas.addEventListener('pointermove',e=>{
  if(!cropDragging) return;
  const p=pointerPos(e);
  cropOffsetX+=p.x-cropLastX;
  cropOffsetY+=p.y-cropLastY;
  cropLastX=p.x;cropLastY=p.y;
  drawCrop();
});
function endDrag(e){
  cropDragging=false;
  try{cropCanvas.releasePointerCapture(e.pointerId)}catch(_){ }
}
cropCanvas.addEventListener('pointerup',endDrag);
cropCanvas.addEventListener('pointercancel',endDrag);
cropCanvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
