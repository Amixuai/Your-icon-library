/*
 * GlyphCraft Icons — permanent CDN script
 * https://your-icon-library.vercel.app/cdn/icons.js
 *
 * Usage in any HTML page:
 *   <link rel="stylesheet" href="https://your-icon-library.vercel.app/cdn/glyphcraft.css">
 *   <script src="https://your-icon-library.vercel.app/cdn/icons.js" defer></script>
 *   ...
 *   <i class="myicon myicon-home"></i>
 */
(function () {
  var API_BASE = (function () {
    try {
      var src = document.currentScript && document.currentScript.src;
      if (!src) return '';
      return new URL(src).origin;
    } catch (e) {
      return '';
    }
  })();

  function extractIconName(classList) {
    for (var i = 0; i < classList.length; i++) {
      if (classList[i].indexOf('myicon-') === 0) {
        var candidate = classList[i].slice('myicon-'.length);
        // ignore the built-in size/utility helper classes
        if (['sm', 'lg', 'xl', '2x', '3x', 'spin'].indexOf(candidate) === -1) {
          return candidate;
        }
      }
    }
    return null;
  }

  function renderIcon(el, svgMarkup) {
    el.innerHTML = svgMarkup;
    var svg = el.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
    }
  }

  function applyIcons(icons) {
    var map = {};
    icons.forEach(function (icon) {
      map[icon.name] = icon.svg_code;
    });

    var elements = document.querySelectorAll('.myicon');
    elements.forEach(function (el) {
      var name = extractIconName(el.classList);
      if (!name) return;
      if (map[name]) {
        renderIcon(el, map[name]);
      } else {
        console.warn('[GlyphCraft] Icon not found: "' + name + '"');
      }
    });
  }

  function loadAndRender() {
    fetch(API_BASE + '/api/icons')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load icons from server');
        return res.json();
      })
      .then(function (data) {
        applyIcons(data.icons || []);
      })
      .catch(function (err) {
        console.error('[GlyphCraft] ' + err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAndRender);
  } else {
    loadAndRender();
  }

  // expose a manual reload hook, useful after dynamically adding new <i> tags
  window.GlyphCraft = { reload: loadAndRender };
})();
