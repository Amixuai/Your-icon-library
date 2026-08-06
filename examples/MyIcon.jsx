// MyIcon.jsx
//
// HOW TO USE THIS IN YOUR REACT PROJECT:
// 1. Copy this file into your project, e.g. src/components/MyIcon.jsx
// 2. Import and use it anywhere:
//      import MyIcon from './components/MyIcon';
//      <MyIcon name="home" />
//      <MyIcon name="sparkles" size="2em" />
//
// This is NOT an npm package — it's a small self-contained component that
// fetches the icon list from your permanent CDN once, and caches it in memory.

import { useEffect, useState } from 'react';

const ICON_CDN_BASE = 'https://your-icon-library.vercel.app';

let iconCache = null;
let iconPromise = null;

function loadIcons() {
  if (iconCache) return Promise.resolve(iconCache);
  if (!iconPromise) {
    iconPromise = fetch(`${ICON_CDN_BASE}/api/icons`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load icons from server');
        return res.json();
      })
      .then((data) => {
        iconCache = {};
        (data.icons || []).forEach((icon) => {
          iconCache[icon.name] = icon.svg_code;
        });
        return iconCache;
      });
  }
  return iconPromise;
}

export default function MyIcon({ name, size = '1em', className = '' }) {
  const [svg, setSvg] = useState(null);

  useEffect(() => {
    let active = true;
    loadIcons().then((icons) => {
      if (active) setSvg(icons[name] || null);
    });
    return () => {
      active = false;
    };
  }, [name]);

  if (!svg) return null;

  return (
    <span
      className={`myicon ${className}`}
      style={{ width: size, height: size, display: 'inline-flex' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
