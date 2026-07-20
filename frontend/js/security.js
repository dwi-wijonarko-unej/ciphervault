const SecurityUI = (() => {
  function renderScoreModal(fileName, score, metrics, container) {
    // Per design guide: inline metric badges instead of 2-col grid
    const metricsList = [
      {
        label: "Entropy",
        value: metrics.entropy,
        max: 8,
        good: ">7.9",
        status:
          metrics.entropy > 7.9
            ? "pass"
            : metrics.entropy > 7.5
              ? "warn"
              : "fail",
      },
      {
        label: "Correlation",
        value: metrics.correlation,
        max: 1,
        good: "<0.01",
        status:
          Math.abs(metrics.correlation) < 0.01
            ? "pass"
            : Math.abs(metrics.correlation) < 0.05
              ? "warn"
              : "fail",
      },
      {
        label: "Avalanche",
        value: metrics.avalanche + "%",
        max: 100,
        good: "~50%",
        status:
          metrics.avalanche > 45 && metrics.avalanche < 55 ? "pass" : "warn",
      },
      {
        label: "NPCR",
        value: metrics.npcr + "%",
        max: 100,
        good: ">99%",
        status: metrics.npcr > 99 ? "pass" : "warn",
      },
      {
        label: "UACI",
        value: metrics.uaci + "%",
        max: 50,
        good: "~33%",
        status: metrics.uaci > 30 && metrics.uaci < 36 ? "pass" : "warn",
      },
      {
        label: "Bit Change",
        value: metrics.bit_change + "%",
        max: 100,
        good: "~50%",
        status:
          metrics.bit_change > 45 && metrics.bit_change < 55 ? "pass" : "warn",
      },
    ];

    const statusIcons = {
      pass: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
      warn: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      fail: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    };

    const statusColors = {
      pass: "var(--success)",
      warn: "var(--warning)",
      fail: "var(--error)",
    };

    container.innerHTML = `
      <div class="page-enter">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-xl font-bold font-heading">Security Analysis</h2>
            <p class="text-sm text-muted mt-1">${fileName}</p>
          </div>
          <div class="text-center">
            <div class="text-4xl font-black tracking-tight" style="color: ${score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--error)"}">${score}</div>
            <div class="meta">/ 100</div>
          </div>
        </div>

        <!-- Inline metric badges per design guide -->
        <div class="flex flex-wrap gap-2 mb-6">
          ${metricsList
            .map(
              (m) => `
            <div class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border"
                 style="border-color: var(--border); background: var(--surface);">
              <span>${statusIcons[m.status]}</span>
              <span class="text-xs text-muted">${m.label}</span>
              <span class="text-sm font-semibold" style="color: ${statusColors[m.status]}">${m.value}</span>
              <span class="text-[10px] text-muted ml-0.5">(${m.good})</span>
            </div>
          `,
            )
            .join("")}
        </div>

        <div class="bg-surface border border-border rounded-lg p-4">
          <div class="text-xs text-muted mb-2">Rating</div>
          <div class="text-lg font-bold" style="color: ${score >= 80 ? "var(--success)" : score >= 60 ? "var(--warning)" : "var(--error)"}">
            ${score >= 80 ? "✅ Excellent" : score >= 60 ? "⚠️ Good" : "❌ Needs Improvement"}
          </div>
          <p class="text-xs text-muted mt-1">
            ${score >= 80 ? "Strong encryption with excellent diffusion and randomness." : score >= 60 ? "Adequate security but some metrics can be improved." : "Review encryption parameters for better security."}
          </p>
        </div>
      </div>
    `;
  }

  function renderUploadAnalysis(fileName, score, metrics) {
    const overlay = UI.modal(
      "Upload Security Analysis",
      '<div id="upload-analysis-content"></div>',
      '<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest(\'.fixed.inset-0\').remove()">Close</button>',
    );

    const content = document.getElementById("upload-analysis-content");
    if (content) {
      renderScoreModal(fileName, score, metrics, content);
    }

    return overlay;
  }

  function renderFileAnalysis(fileId) {
    const overlay = UI.modal(
      "Security Analysis",
      '<div id="analysis-content"><div class="py-10 text-center"><div class="w-10 h-10 border-2 border-border animate-spin mx-auto" style="border-top-color: var(--primary); border-radius: 50%;"></div></div></div>',
      '<button class="px-4 py-2 rounded-md text-sm font-medium text-muted hover:text-primary hover:bg-surface-hover transition-all cursor-pointer bg-transparent border-none" onclick="this.closest(\'.fixed.inset-0\').remove()">Close</button>',
    );

    setTimeout(async () => {
      const content = document.getElementById("analysis-content");
      if (!content) return;
      try {
        const res = await API.request("POST", `/files/${fileId}/analyze`);
        renderScoreModal(
          res.filename || "File",
          res.score,
          res.metrics,
          content,
        );
      } catch {
        content.innerHTML =
          '<p class="text-error text-center py-10">Analysis failed. The file may no longer exist.</p>';
      }
    }, 100);

    return overlay;
  }

  return { renderScoreModal, renderUploadAnalysis, renderFileAnalysis };
})();
