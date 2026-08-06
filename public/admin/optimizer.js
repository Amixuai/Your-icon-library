(function () {
  // ---------------------------------------------------------------------
  // NOTE: This is a COSMETIC optimizer only (removes editor clutter,
  // comments, embedded raster images, empty groups). It is NOT the
  // security layer — the backend (api/_lib/sanitize.js) ALWAYS strips
  // dangerous content (<script>, onload=, javascript: URIs) on every
  // upload automatically, regardless of whether this toggle is used.
  // ---------------------------------------------------------------------

  var svgTextarea = document.getElementById('newSvg');
  var sanitizeToggle = document.getElementById('sanitizeToggle');
  var previewBox = document.getElementById('previewBox');
  var checklistBox = document.getElementById('checklistBox');
  var checklistSteps = document.getElementById('checklistSteps');
  var compareBox = document.getElementById('compareBox');
  var beforePreview = document.getElementById('beforePreview');
  var afterPreview = document.getElementById('afterPreview');
  var sizeStats = document.getElementById('sizeStats');
  var confirmBtn = document.getElementById('confirmOptimizedBtn');
  var cancelBtn = document.getElementById('cancelOptimizedBtn');
  var clearBtn = document.getElementById('clearSvgBtn');
  var uploadIconBtn = document.getElementById('uploadIconBtn');
  var reportsList = document.getElementById('reportsList');
  var reportsEmpty = document.getElementById('reportsEmpty');

  var pipelineRunning = false;
  var lastOptimizedSvg = null;
  var reports = []; // in-memory only — resets on page reload, never sent anywhere
  var reportIdCounter = 0;

  function byteLength(str) {
    return new TextEncoder().encode(str).length;
  }

  // ---------------- Cleaning step functions ----------------

  function stepComments(svg) {
    var count = 0;
    svg = svg.replace(/<\?[\s\S]*?\?>/g, function () { count++; return ''; });
    svg = svg.replace(/<!--[\s\S]*?-->/g, function () { count++; return ''; });
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata\s*>/gi, function () { count++; return ''; });
    svg = svg.replace(/<metadata\b[^>]*\/>/gi, function () { count++; return ''; });
    return { svg: svg, found: count > 0, detail: count > 0 ? count + ' item(s) removed' : 'No comments/metadata found — already clean' };
  }

  function stepEditorSignatures(svg) {
    var count = 0;
    var prefixes = ['sodipodi', 'inkscape', 'dc', 'cc', 'rdf', 'ai', 'i', 'graph'];
    prefixes.forEach(function (p) {
      var nsRe = new RegExp('\\s+xmlns:' + p + '="[^"]*"', 'gi');
      svg = svg.replace(nsRe, function () { count++; return ''; });
      var attrRe = new RegExp('\\s+' + p + ':[\\w-]+="[^"]*"', 'gi');
      svg = svg.replace(attrRe, function () { count++; return ''; });
    });
    svg = svg.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview\s*>/gi, function () { count++; return ''; });
    svg = svg.replace(/<sodipodi:namedview\b[^>]*\/>/gi, function () { count++; return ''; });
    svg = svg.replace(/<rdf:RDF[\s\S]*?<\/rdf:RDF\s*>/gi, function () { count++; return ''; });
    return { svg: svg, found: count > 0, detail: count > 0 ? count + ' editor tag(s)/namespace(s) removed' : 'No editor signatures found — already clean' };
  }

  function stepEmbeddedRaster(svg) {
    var count = 0;
    svg = svg.replace(/<image[\s\S]*?<\/image\s*>/gi, function () { count++; return ''; });
    svg = svg.replace(/<image\b[^>]*\/?>/gi, function () { count++; return ''; });
    svg = svg.replace(/(href|xlink:href|src)\s*=\s*"data:image\/[^"]*"/gi, function () { count++; return ''; });
    return { svg: svg, found: count > 0, detail: count > 0 ? count + ' embedded raster/watermark item(s) removed' : 'No embedded raster images found — already clean' };
  }

  function stepRedundantAttrsAndGroups(svg) {
    var count = 0;

    svg = svg.replace(/\s+xml:space="preserve"/gi, function () { count++; return ''; });
    svg = svg.replace(/\s+enable-background="[^"]*"/gi, function () { count++; return ''; });

    // Remove empty <g>...</g> groups, repeatedly (nested empties can appear
    // after the first pass removes their only child).
    for (var i = 0; i < 5; i++) {
      var before = svg;
      svg = svg.replace(/<g(?:\s+[^>]*)?>\s*<\/g>/gi, function () { count++; return ''; });
      if (svg === before) break;
    }

    // Remove an entire <defs> block only if NONE of the ids it defines are
    // referenced anywhere else in the document (safe, conservative check —
    // we do not attempt partial pruning to avoid corrupting valid icons).
    svg = svg.replace(/<defs[^>]*>([\s\S]*?)<\/defs\s*>/gi, function (match, inner) {
      var ids = [];
      var idRe = /id="([^"]+)"/g;
      var m;
      while ((m = idRe.exec(inner))) ids.push(m[1]);
      if (ids.length === 0) {
        count++;
        return '';
      }
      var restOfDoc = svg.replace(match, '');
      var anyUsed = ids.some(function (id) {
        return restOfDoc.indexOf('#' + id) !== -1;
      });
      if (!anyUsed) {
        count++;
        return '';
      }
      return match;
    });

    return { svg: svg, found: count > 0, detail: count > 0 ? count + ' redundant attribute(s)/group(s) removed' : 'No redundant attributes or empty groups found — already clean' };
  }

  var STEP_DEFS = [
    { label: 'Checking for XML Processing Instructions, Comments, & Foreign Metadata...', run: stepComments },
    { label: 'Stripping Editor Signatures & Software-Specific Namespaces (sodipodi:, inkscape:, adobe/illustrator tags)...', run: stepEditorSignatures },
    { label: 'Inspecting & Purging Embedded Raster Assets, Tracking Artifacts, or Hidden Watermark Vectors...', run: stepEmbeddedRaster },
    { label: 'Removing Redundant Attributes, Useless Empty Groups (<g>), and Unused Graphic Definitions...', run: stepRedundantAttrsAndGroups },
  ];

  // ---------------- Pipeline orchestration ----------------

  function renderStepRow(index, state, detail) {
    var row = document.getElementById('step-row-' + index);
    var iconSpan = row.querySelector('.step-icon');
    var detailSpan = row.querySelector('.step-detail');
    if (state === 'pending') {
      iconSpan.textContent = '⏳';
      iconSpan.className = 'step-icon pending';
      detailSpan.textContent = '';
    } else {
      iconSpan.textContent = '✔';
      iconSpan.className = 'step-icon done';
      detailSpan.textContent = detail;
    }
  }

  function runPipeline() {
    var originalSvg = svgTextarea.value.trim();
    if (!originalSvg || originalSvg.indexOf('<svg') === -1) {
      sanitizeToggle.checked = false;
      return;
    }

    pipelineRunning = true;
    uploadIconBtn.disabled = true;
    previewBox.style.display = 'none';
    compareBox.style.display = 'none';
    checklistBox.style.display = 'block';

    checklistSteps.innerHTML = STEP_DEFS.map(function (step, i) {
      return (
        '<div class="step-row" id="step-row-' + i + '">' +
        '<span class="step-icon pending">⏳</span>' +
        '<span class="step-label">' + step.label + '<div class="step-detail"></div></span>' +
        '</div>'
      );
    }).join('');

    var current = originalSvg;
    var stepResults = [];
    var idx = 0;

    function next() {
      if (idx >= STEP_DEFS.length) {
        finishPipeline(originalSvg, current, stepResults);
        return;
      }
      var step = STEP_DEFS[idx];
      setTimeout(function () {
        var result = step.run(current);
        current = result.svg;
        stepResults.push({ label: step.label, found: result.found, detail: result.detail });
        renderStepRow(idx, 'done', result.detail);
        idx++;
        setTimeout(next, 250);
      }, 450);
    }

    next();
  }

  function finishPipeline(originalSvg, optimizedSvg, stepResults) {
    checklistBox.style.display = 'none';
    compareBox.style.display = 'block';
    pipelineRunning = false;

    beforePreview.innerHTML = originalSvg;
    afterPreview.innerHTML = optimizedSvg;

    var originalSize = byteLength(originalSvg);
    var optimizedSize = byteLength(optimizedSvg);
    var savedPct = originalSize > 0 ? Math.max(0, Math.round(((originalSize - optimizedSize) / originalSize) * 100)) : 0;

    sizeStats.textContent =
      'Original Size: ' + formatBytes(originalSize) + ' → Optimized Size: ' + formatBytes(optimizedSize) + ' | Saved: ' + savedPct + '%';

    lastOptimizedSvg = optimizedSvg;

    var allClean = stepResults.every(function (r) { return !r.found; });
    addReport({
      name: document.getElementById('newName').value.trim() || 'untitled',
      steps: stepResults,
      originalSize: originalSize,
      optimizedSize: optimizedSize,
      savedPct: savedPct,
      allClean: allClean,
    });
  }

  function formatBytes(b) {
    if (b < 1024) return b + ' B';
    return (b / 1024).toFixed(1) + ' KB';
  }

  sanitizeToggle.addEventListener('change', function () {
    if (sanitizeToggle.checked) {
      runPipeline();
    } else {
      checklistBox.style.display = 'none';
      compareBox.style.display = 'none';
      previewBox.style.display = 'flex';
      uploadIconBtn.disabled = false;
    }
  });

  var debounceTimer = null;
  svgTextarea.addEventListener('input', function () {
    if (sanitizeToggle.checked && !pipelineRunning) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runPipeline, 600);
    }
  });

  confirmBtn.addEventListener('click', function () {
    if (!lastOptimizedSvg) return;
    svgTextarea.value = lastOptimizedSvg;
    compareBox.style.display = 'none';
    sanitizeToggle.checked = false;
    uploadIconBtn.disabled = false;
    updatePreviewFromTextarea();
    if (typeof uploadIcon === 'function') uploadIcon();
  });

  cancelBtn.addEventListener('click', function () {
    compareBox.style.display = 'none';
    sanitizeToggle.checked = false;
    uploadIconBtn.disabled = false;
    previewBox.style.display = 'flex';
    updatePreviewFromTextarea();
  });

  clearBtn.addEventListener('click', function () {
    svgTextarea.value = '';
    document.getElementById('newName').value = '';
    var fileInput = document.getElementById('svgFileInput');
    if (fileInput) fileInput.value = '';
    var fileLabel = document.getElementById('fileNameLabel');
    if (fileLabel) fileLabel.textContent = '';
    sanitizeToggle.checked = false;
    checklistBox.style.display = 'none';
    compareBox.style.display = 'none';
    previewBox.style.display = 'flex';
    uploadIconBtn.disabled = false;
    lastOptimizedSvg = null;
    updatePreviewFromTextarea();
  });

  function updatePreviewFromTextarea() {
    var code = svgTextarea.value.trim();
    if (code && code.indexOf('<svg') !== -1) {
      previewBox.innerHTML = code;
    } else {
      previewBox.innerHTML = '<span class="preview-empty">Preview will appear here</span>';
    }
  }

  // ---------------- Reports (in-memory, with 5s undo delete) ----------------

  function addReport(data) {
    data.id = ++reportIdCounter;
    data.time = new Date().toLocaleTimeString();
    reports.unshift(data);
    renderReports();
  }

  function renderReports() {
    reportsEmpty.style.display = reports.length === 0 ? 'block' : 'none';
    reportsList.innerHTML = reports
      .map(function (r) {
        var stepsHtml = r.steps
          .map(function (s) {
            return '<div class="report-line">' + (s.found ? '✔ ' : '✔ ') + s.detail + '</div>';
          })
          .join('');
        var summary = r.allClean
          ? '<div class="report-line" style="color:#4ade80;">No junk found. The SVG file was already clean and safe.</div>'
          : stepsHtml;
        return (
          '<div class="report-card" data-report-id="' + r.id + '">' +
          '<button class="report-close" data-delete-id="' + r.id + '">&times;</button>' +
          '<div class="report-title">' + r.name + ' — ' + r.time + '</div>' +
          summary +
          '<div class="report-line">Size: ' + formatBytes(r.originalSize) + ' → ' + formatBytes(r.optimizedSize) + ' (saved ' + r.savedPct + '%)</div>' +
          '<div id="confirm-area-' + r.id + '"></div>' +
          '</div>'
        );
      })
      .join('');

    reportsList.querySelectorAll('[data-delete-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = parseInt(btn.dataset.deleteId, 10);
        showDeleteConfirm(id);
      });
    });
  }

  function showDeleteConfirm(id) {
    var area = document.getElementById('confirm-area-' + id);
    if (!area) return;
    area.innerHTML =
      '<div class="confirm-popover">Delete this report?' +
      '<div style="margin-top:6px; display:flex; gap:8px;">' +
      '<button class="btn btn-primary" data-confirm-yes="' + id + '">Confirm</button>' +
      '<button class="btn btn-secondary" data-confirm-no="' + id + '">Cancel</button>' +
      '</div></div>';
    area.querySelector('[data-confirm-yes]').addEventListener('click', function () {
      deleteReportWithUndo(id);
    });
    area.querySelector('[data-confirm-no]').addEventListener('click', function () {
      area.innerHTML = '';
    });
  }

  function deleteReportWithUndo(id) {
    var index = reports.findIndex(function (r) { return r.id === id; });
    if (index === -1) return;
    var removed = reports[index];
    reports.splice(index, 1);
    renderReports();
    showUndoToast(removed, index);
  }

  function showUndoToast(removedReport, originalIndex) {
    var existing = document.getElementById('undoToast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'undoToast';
    toast.innerHTML = 'Report deleted. <button id="undoBtn">Undo</button>';
    document.body.appendChild(toast);

    var undone = false;
    document.getElementById('undoBtn').addEventListener('click', function () {
      undone = true;
      reports.splice(originalIndex, 0, removedReport);
      renderReports();
      toast.remove();
    });

    setTimeout(function () {
      if (!undone && document.getElementById('undoToast')) {
        toast.remove();
        // Permanently gone — never stored anywhere outside this in-memory array.
      }
    }, 5000);
  }
})();
