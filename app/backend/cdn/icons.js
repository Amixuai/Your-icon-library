/* GlyphCraft CDN JS Runtime v1.0.0 */
(function() {
  function initGlyphCraft() {
    const elements = document.querySelectorAll('i[data-icon], i[class*="myicon-"]');
    elements.forEach(el => {
      let iconName = el.getAttribute('data-icon');
      if (!iconName) {
        const cls = Array.from(el.classList).find(c => c.startsWith('myicon-'));
        if (cls) { iconName = cls.replace('myicon-', ''); }
      }
      if (iconName && !el.getAttribute('data-glyphcrafted')) {
        fetch('/api/icons').then(res => res.json()).then(data => {
          const found = data.icons.find(i => i.name === iconName);
          if (found) {
            el.innerHTML = found.svg_code;
            el.setAttribute('data-glyphcrafted', 'true');
            if (found.category === 'colorful') { el.classList.add('colorful'); }
          }
        }).catch(err => console.error('GlyphCraft CDN Error:', err));
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlyphCraft);
  } else {
    initGlyphCraft();
  }
})();
