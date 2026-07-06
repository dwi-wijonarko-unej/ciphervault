const SecurityUI = (() => {
  function renderScoreModal(fileName, score, metrics, container) {
    container.innerHTML = `
      <div class="page-enter">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold">Security Analysis</h2>
            <p class="text-sm text-muted mt-1">${fileName}</p>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}">${score}</div>
            <div class="text-xs text-muted">/ 100</div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-6">
          ${[
            { label: 'Entropy', value: metrics.entropy, max: 8, good: '>7.9', color: metrics.entropy > 7.9 ? 'emerald' : metrics.entropy > 7.5 ? 'amber' : 'red' },
            { label: 'Correlation', value: metrics.correlation, max: 1, good: '<0.01', color: Math.abs(metrics.correlation) < 0.01 ? 'emerald' : Math.abs(metrics.correlation) < 0.05 ? 'amber' : 'red' },
            { label: 'Avalanche', value: metrics.avalanche + '%', max: 100, good: '~50%', color: metrics.avalanche > 45 && metrics.avalanche < 55 ? 'emerald' : 'amber' },
            { label: 'NPCR', value: metrics.npcr + '%', max: 100, good: '>99%', color: metrics.npcr > 99 ? 'emerald' : 'amber' },
            { label: 'UACI', value: metrics.uaci + '%', max: 50, good: '~33%', color: metrics.uaci > 30 && metrics.uaci < 36 ? 'emerald' : 'amber' },
            { label: 'Bit Change', value: metrics.bit_change + '%', max: 100, good: '~50%', color: metrics.bit_change > 45 && metrics.bit_change < 55 ? 'emerald' : 'amber' },
          ].map(m => `
            <div class="bg-surface border border-border rounded-lg p-4">
              <div class="text-xs text-muted mb-1">${m.label}</div>
              <div class="text-lg font-bold text-${m.color}-400">${m.value}</div>
              <div class="w-full h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
                <div class="h-full rounded-full bg-${m.color}-500" style="width: ${Math.min(parseFloat(m.value) / m.max * 100, 100)}%"></div>
              </div>
              <div class="text-[10px] text-muted mt-1">Target: ${m.good}</div>
            </div>
          `).join('')}
        </div>
        <div class="bg-surface border border-border rounded-lg p-4">
          <div class="text-xs text-muted mb-2">Rating</div>
          <div class="text-lg font-bold ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}">
            ${score >= 80 ? '✅ Excellent' : score >= 60 ? '⚠️ Good' : '❌ Needs Improvement'}
          </div>
          <p class="text-xs text-muted mt-1">
            ${score >= 80 ? 'Strong encryption with excellent diffusion and randomness.' : score >= 60 ? 'Adequate security but some metrics can be improved.' : 'Review encryption parameters for better security.'}
          </p>
        </div>
      </div>
    `;
  }

  function renderFileAnalysis(fileId) {
    const overlay = UI.modal(
      'Security Analysis',
      '<div id="analysis-content"><div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border border-t-blue-500 rounded-full animate-spin mx-auto"></div></div></div>',
      '<button class="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-[#e2e8f0] hover:bg-[rgba(59,130,246,0.08)] transition-all cursor-pointer bg-transparent border-none" onclick="this.closest(\'.fixed.inset-0\').remove()">Close</button>'
    );

    setTimeout(async () => {
      const content = document.getElementById('analysis-content');
      if (!content) return;
      try {
        const res = await API.request('POST', `/files/${fileId}/analyze`);
        renderScoreModal(res.filename || 'File', res.score, res.metrics, content);
      } catch {
        content.innerHTML = '<p class="text-red-400 text-center py-10">Analysis failed. The file may no longer exist.</p>';
      }
    }, 100);

    return overlay;
  }

  return { renderScoreModal, renderFileAnalysis };
})();
