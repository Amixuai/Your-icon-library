(function () {
  let allIcons = [];
  let activeCategory = ''; // colorful | mono | ''
  let activeGroup = ''; // brands | ui-simple | ... | ''
  let currentIcon = null; // icon object currently open in modal
  let currentColor = ''; // '' means default/no override
  let currentSize = 48;
  let currentFmt = 'html';

  const grid = document.getElementById('grid');
  const status = document.getElementById('status');
  const searchInput = document.getElementById('searchInput');

  // ---------- Grid rendering ----------

  function render() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allIcons.filter((icon) => {
      const matchesCat = !activeCategory || icon.category === activeCategory;
      const matchesGroup = !activeGroup || icon.group_name === activeGroup;
      const matchesQ = !q || icon.name.toLowerCase().includes(q);
      return matchesCat && matchesGroup && matchesQ;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      status.style.display = 'block';
      status.textContent =
        allIcons.length === 0
          ? 'No icons uploaded yet. Go to the Admin Panel to add some.'
          : 'No icons match your search/filters.';
      return;
    }

    status.style.display = 'none';
    grid.innerHTML = filtered
      .map(
        (icon) => `
      <div class="icon-card" data-name="${icon.name}">
        <div class="myicon myicon-${icon.name}"></div>
        <div class="name">${icon.name}</div>
      </div>
    `
      )
      .join('');

    if (window.ColorIconLab) window.ColorIconLab.reload();

    grid.querySelectorAll('.icon-card').forEach((card) => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        const icon = allIcons.find((i) => i.name === name);
        if (icon) openModal(icon);
      });
    });
  }

  document.querySelectorAll('#styleTabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#styleTabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      render();
    });
  });

  document.querySelectorAll('#groupTabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#groupTabs .tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeGroup = tab.dataset.group;
      render();
    });
  });

  searchInput.addEventListener('input', render);

  fetch('/api/icons')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to load icons from server');
      return res.json();
    })
    .then((data) => {
      allIcons = data.icons || [];
      render();
    })
    .catch((err) => {
      status.textContent = err.message;
    });

  // ---------- Modal ----------

  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalIcon = document.getElementById('modalIcon');
  const modalPreview = document.getElementById('modalPreview');
  const colorCaveat = document.getElementById('colorCaveat');
  const hexInput = document.getElementById('hexInput');
  const colorPicker = document.getElementById('colorPicker');
  const customSizeInput = document.getElementById('customSize');
  const codeBox = document.getElementById('codeBox');

  function openModal(icon) {
    currentIcon = icon;
    currentColor = '';
    currentSize = 48;
    currentFmt = 'html';

    modalTitle.textContent = icon.name;
    modalIcon.className = 'myicon myicon-' + icon.name;
    if (window.ColorIconLab) window.ColorIconLab.reload();

    colorCaveat.textContent =
      icon.category === 'colorful'
        ? 'Note: this is a multi-color icon — a single color override may not visibly change every part of it.'
        : '';

    hexInput.value = '';
    colorPicker.value = '#ffffff';
    customSizeInput.value = '';
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.size-btn[data-size="48"]').classList.add('active');
    document.querySelectorAll('.code-tab').forEach((t) => t.classList.remove('active'));
    document.querySelector('.code-tab[data-fmt="html"]').classList.add('active');

    applyPreview();
    updateCode();
    modalOverlay.classList.add('open');
  }

  function closeModal() {
    modalOverlay.classList.remove('open');
    currentIcon = null;
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  function applyPreview() {
    modalPreview.style.setProperty('--preview-size', currentSize + 'px');
    modalIcon.style.color = currentColor || '';
  }

  document.querySelectorAll('.swatch').forEach((sw) => {
    sw.addEventListener('click', () => {
      currentColor = sw.dataset.color;
      hexInput.value = currentColor;
      applyPreview();
      updateCode();
    });
  });

  colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
    hexInput.value = currentColor;
    applyPreview();
    updateCode();
  });

  hexInput.addEventListener('input', () => {
    const v = hexInput.value.trim();
    currentColor = v;
    applyPreview();
    updateCode();
  });

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size, 10);
      customSizeInput.value = '';
      applyPreview();
      updateCode();
    });
  });

  customSizeInput.addEventListener('input', () => {
    const v = parseInt(customSizeInput.value, 10);
    if (!isNaN(v) && v > 0) {
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
      currentSize = v;
      applyPreview();
      updateCode();
    }
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    currentColor = '';
    currentSize = 48;
    hexInput.value = '';
    colorPicker.value = '#ffffff';
    customSizeInput.value = '';
    document.querySelectorAll('.size-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.size-btn[data-size="48"]').classList.add('active');
    applyPreview();
    updateCode();
  });

  document.querySelectorAll('.code-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.code-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFmt = tab.dataset.fmt;
      updateCode();
    });
  });

  function buildStyleString() {
    const parts = ['font-size:' + currentSize + 'px'];
    if (currentColor) parts.push('color:' + currentColor);
    return parts.join(';');
  }

  function updateCode() {
    if (!currentIcon) return;
    const name = currentIcon.name;
    const styleStr = buildStyleString();
    let code = '';

    if (currentFmt === 'html') {
      code = `<i class="myicon myicon-${name}" style="${styleStr}"></i>`;
    } else if (currentFmt === 'react') {
      const styleObj = currentColor
        ? `{{ fontSize: ${currentSize}, color: '${currentColor}' }}`
        : `{{ fontSize: ${currentSize} }}`;
      code = `<MyIcon name="${name}" style={${styleObj}} />`;
    } else if (currentFmt === 'vue') {
      code = `<MyIcon name="${name}" :style="{ fontSize: '${currentSize}px'${
        currentColor ? `, color: '${currentColor}'` : ''
      } }" />`;
    } else if (currentFmt === 'css') {
      code = `.myicon-${name} {\n  font-size: ${currentSize}px;${
        currentColor ? `\n  color: ${currentColor};` : ''
      }\n}`;
    }

    codeBox.textContent = code;
  }

  document.getElementById('copyCodeBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(codeBox.textContent).then(() => {
      const btn = document.getElementById('copyCodeBtn');
      const old = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => {
        btn.textContent = old;
      }, 1200);
    });
  });
})();
