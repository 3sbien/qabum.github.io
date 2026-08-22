/* Paz's Sale — AI analysis UI */
(function(){
  if(window.__pazAiUiInstalled)return;
  window.__pazAiUiInstalled=true;

  function install(){
    const notes=document.getElementById('marketNotes');
    if(!notes || document.getElementById('aiAnalysisPanel'))return;
    const field=notes.closest('.field');
    if(!field)return;

    const panel=document.createElement('div');
    panel.id='aiAnalysisPanel';
    panel.style.cssText='grid-column:1/-1;border:1px solid rgba(1,33,105,.18);border-radius:14px;padding:14px 16px;background:#f8faff;display:flex;gap:14px;align-items:center;justify-content:space-between;flex-wrap:wrap';
    panel.innerHTML=`
      <div style="min-width:240px;flex:1">
        <strong style="display:block;color:#012169;margin-bottom:4px">Análisis con IA</strong>
        <span style="font-size:13px;line-height:1.45;color:#333">Analiza las fotos y datos del artículo para sugerir categoría, descripción y rangos de precio.</span>
        <div style="margin-top:7px;font-size:12px;font-weight:700;color:#C8102E">Costo estimado: USD 0,05 por análisis/búsqueda IA. Solo se genera costo cuando presionas “Analizar con IA”.</div>
      </div>
      <button type="button" id="runAiAnalysis" class="btn dark">Analizar con IA</button>`;
    field.parentElement.insertBefore(panel,field);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
