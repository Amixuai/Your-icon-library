// Server-side SVG sanitizer.
//
// Why this exists: uploaded icons are rendered via innerHTML on every website
// that uses the CDN script. If a malicious <script> tag or an event handler
// like onload="..." were stored as-is, it would execute on every visitor's
// browser on every site using this icon library (stored XSS). This module
// strips known dangerous patterns before anything is saved to the database.
//
// This is a deliberately dependency-free, regex-based sanitizer (no npm
// packages required so the build never depends on network access at deploy
// time). It is not a full XML parser, so treat it as a strong first line of
// defense rather than an absolute guarantee — but it directly blocks every
// attack vector described: <script> tags, on*="" event handlers,
// javascript: URIs, and non-SVG content disguised as SVG.

function sanitizeSvg(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('SVG code is empty');
  }

  const MAX_LENGTH = 200000; // 200KB — generous for an icon, blocks abuse/huge payloads
  if (input.length > MAX_LENGTH) {
    throw new Error('SVG code is too large (max 200KB)');
  }

  let svg = input.trim();

  // Must actually be an SVG — reject anything else outright (blocks someone
  // pasting arbitrary script/HTML content disguised as an "icon").
  if (!/<svg[\s>]/i.test(svg)) {
    throw new Error('Content does not look like a valid SVG (missing <svg> tag)');
  }

  // Strip HTML/XML comments first — attackers sometimes hide payloads inside
  // comments or use them to break out of attribute contexts.
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');

  // Remove <script>...</script> blocks entirely.
  svg = svg.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  svg = svg.replace(/<script\b[^>]*\/?>/gi, '');

  // Remove other elements that can execute code or pull in external/remote
  // content: foreignObject (can embed arbitrary HTML), iframe, embed, object,
  // link, meta, style (can contain @import url(javascript:...)).
  const dangerousTags = ['foreignObject', 'iframe', 'embed', 'object', 'link', 'meta', 'style'];
  dangerousTags.forEach((tag) => {
    const openClose = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}\\s*>`, 'gi');
    svg = svg.replace(openClose, '');
    const selfClose = new RegExp(`<${tag}\\b[^>]*\\/?>`, 'gi');
    svg = svg.replace(selfClose, '');
  });

  // Remove every on*="..." / on*='...' / on*=unquoted event handler attribute
  // (onload, onclick, onerror, onmouseover, etc.)
  svg = svg.replace(/\son[a-z]+\s*=\s*"(?:[^"\\]|\\.)*"/gi, '');
  svg = svg.replace(/\son[a-z]+\s*=\s*'(?:[^'\\]|\\.)*'/gi, '');
  svg = svg.replace(/\son[a-z]+\s*=\s*[^\s"'>]+/gi, '');

  // Neutralize javascript:/data:text/html URIs used in href, xlink:href, src
  svg = svg.replace(/((?:xlink:)?href|src)\s*=\s*"(\s*(?:javascript:|data:text\/html)[^"]*)"/gi, '$1="#"');
  svg = svg.replace(/((?:xlink:)?href|src)\s*=\s*'(\s*(?:javascript:|data:text\/html)[^']*)'/gi, "$1='#'");

  // Final guard — if anything dangerous somehow survived, reject the whole
  // upload rather than silently serving partially-cleaned content.
  if (/<script/i.test(svg) || /javascript:/i.test(svg) || /\son[a-z]+\s*=/i.test(svg)) {
    throw new Error('SVG contains disallowed script content and was rejected');
  }

  return svg.trim();
}

module.exports = { sanitizeSvg };
