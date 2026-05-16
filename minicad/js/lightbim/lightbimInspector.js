'use strict';
(function(global){
  function ready(fn){
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function getBundle(){
    if(typeof global.exportLightBIMJSON === 'function') return global.exportLightBIMJSON();
    const LB = global.LightBIM;
    const state = global.STATE || {};
    const project = LB.adapters.miniCadStateAdapter.normalizeMiniCadState(state);
    const quantities = LB.quantityEngine.calculateProjectQuantities(project);
    const bocEstimateInput = LB.adapters.bocEstimateAdapter.createBOCEstimateInput(project, quantities);
    const aiPromptHints = LB.adapters.aiPromptAdapter.createAIPromptHints(project);
    return { schema:'ECOREAN.LightBIM.v0.1', project, quantities, bocEstimateInput, aiPromptHints };
  }

  function metric(label, value){
    return '<div class="lbim-metric"><span>'+label+'</span><strong>'+value+'</strong></div>';
  }

  function render(panel){
    const body = panel.querySelector('[data-lightbim-body]');
    try{
      const LB = global.LightBIM || {};
      const bundle = getBundle();
      const project = bundle.project || {};
      const quantities = bundle.quantities || {};
      const boc = bundle.bocEstimateInput || {};
      const hints = bundle.aiPromptHints || {};
      body.innerHTML =
        '<div class="lbim-grid">' +
        metric('상태', LB.core ? 'LOADED' : 'MISSING') +
        metric('스키마', bundle.schema || '-') +
        metric('공간', (project.spaces || []).length) +
        metric('벽', (project.walls || []).length) +
        metric('개구부', (project.openings || []).length) +
        metric('총 바닥면적', (quantities.total_floor_area_m2 || 0) + ' m2') +
        metric('순벽면적', (quantities.total_net_wall_area_m2 || 0) + ' m2') +
        metric('BOC 견적유형', boc.estimate_type || '-') +
        '</div>' +
        '<h4>BOC Estimate Input</h4>' +
        '<pre>'+escapeHtml(JSON.stringify(boc, null, 2))+'</pre>' +
        '<h4>AI Prompt Hints</h4>' +
        '<pre>'+escapeHtml(JSON.stringify(hints, null, 2))+'</pre>';
    }catch(error){
      body.innerHTML = '<div class="lbim-error">LightBIM 데이터를 읽지 못했습니다.<br>'+escapeHtml(error.message || String(error))+'</div>';
    }
  }

  function escapeHtml(text){
    return String(text).replace(/[&<>"']/g, function(ch){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch];
    });
  }

  function createInspector(){
    if(document.getElementById('lightbim-inspector')) return;
    const style = document.createElement('style');
    style.textContent =
      '#lightbim-open-btn{position:fixed;right:18px;bottom:18px;z-index:99998;border:0;background:#111827;color:#fff;border-radius:999px;padding:12px 16px;font-weight:800;box-shadow:0 10px 24px rgba(0,0,0,.28);cursor:pointer}' +
      '#lightbim-inspector{position:fixed;right:18px;top:18px;width:min(520px,calc(100vw - 36px));max-height:calc(100vh - 36px);z-index:99999;background:#ffffff;color:#111827;border:1px solid #d1d5db;border-radius:12px;box-shadow:0 18px 48px rgba(0,0,0,.32);overflow:hidden;display:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif}' +
      '#lightbim-inspector.open{display:flex;flex-direction:column}' +
      '.lbim-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#111827;color:#fff}' +
      '.lbim-head strong{font-size:16px}.lbim-head button{border:0;background:#374151;color:#fff;border-radius:8px;padding:6px 10px;cursor:pointer}' +
      '.lbim-actions{display:flex;gap:8px;padding:10px 12px;border-bottom:1px solid #e5e7eb;background:#f9fafb}' +
      '.lbim-actions button{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:7px 10px;cursor:pointer}' +
      '.lbim-body{padding:12px;overflow:auto}.lbim-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}' +
      '.lbim-metric{border:1px solid #e5e7eb;border-radius:8px;padding:9px;background:#f9fafb}.lbim-metric span{display:block;font-size:12px;color:#6b7280}.lbim-metric strong{display:block;margin-top:3px;font-size:15px}' +
      '#lightbim-inspector h4{margin:12px 0 6px;font-size:13px}#lightbim-inspector pre{white-space:pre-wrap;background:#0f172a;color:#e5e7eb;border-radius:8px;padding:10px;font-size:11px;line-height:1.45;max-height:220px;overflow:auto}.lbim-error{color:#b91c1c;font-weight:700}';
    document.head.appendChild(style);

    const openBtn = document.createElement('button');
    openBtn.id = 'lightbim-open-btn';
    openBtn.type = 'button';
    openBtn.textContent = 'LightBIM';

    const panel = document.createElement('aside');
    panel.id = 'lightbim-inspector';
    panel.innerHTML =
      '<div class="lbim-head"><strong>LightBIM Core</strong><button type="button" data-lightbim-close>닫기</button></div>' +
      '<div class="lbim-actions">' +
      '<button type="button" data-lightbim-refresh>새로고침</button>' +
      '<button type="button" data-lightbim-smoke>Smoke Test</button>' +
      '<button type="button" data-lightbim-copy>JSON 복사</button>' +
      '</div>' +
      '<div class="lbim-body" data-lightbim-body></div>';

    document.body.appendChild(openBtn);
    document.body.appendChild(panel);

    function openPanel(){
      panel.classList.add('open');
      render(panel);
    }
    function closePanel(){ panel.classList.remove('open'); }
    openBtn.addEventListener('click', openPanel);
    panel.querySelector('[data-lightbim-close]').addEventListener('click', closePanel);
    panel.querySelector('[data-lightbim-refresh]').addEventListener('click', function(){ render(panel); });
    panel.querySelector('[data-lightbim-smoke]').addEventListener('click', function(){
      if(typeof global.runLightBIMSmokeTest === 'function') global.runLightBIMSmokeTest();
      render(panel);
    });
    panel.querySelector('[data-lightbim-copy]').addEventListener('click', function(){
      const text = JSON.stringify(getBundle(), null, 2);
      if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text);
    });

    global.openLightBIMPanel = openPanel;
    if(global.location && global.location.hash === '#lightbim') openPanel();
  }

  ready(createInspector);
})(window);
