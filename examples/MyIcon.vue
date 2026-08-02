<!--
  MyIcon.vue

  HOW TO USE THIS IN YOUR VUE PROJECT:
  1. Copy this file into your project, e.g. src/components/MyIcon.vue
  2. Import and use it anywhere:
       import MyIcon from './components/MyIcon.vue';
       <MyIcon name="home" />
       <MyIcon name="sparkles" size="2em" />

  This is NOT an npm package — it's a small self-contained component that
  fetches the icon list from your permanent CDN once, and caches it in memory.
-->
<template>
  <span
    class="myicon"
    :style="{ width: size, height: size, display: 'inline-flex' }"
    v-html="svg"
  ></span>
</template>

<script>
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

export default {
  name: 'MyIcon',
  props: {
    name: { type: String, required: true },
    size: { type: String, default: '1em' },
  },
  data() {
    return { svg: null };
  },
  watch: {
    name: { immediate: true, handler() { this.fetchIcon(); } },
  },
  methods: {
    fetchIcon() {
      loadIcons().then((icons) => {
        this.svg = icons[this.name] || null;
      });
    },
  },
};
</script>
