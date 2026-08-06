# ColorIconLab — Setup Guide (Hinglish)

Ye poora working project hai. Neeche diye steps follow karke ise live kar dein.

## Step 1 — GitHub me upload karein

Is poori `icon-library` folder ke andar jo bhi files/folders hain (`api/`, `public/`,
`examples/`, `package.json`, `vercel.json`, `.gitignore`, `supabase-setup.sql`) —
sabko apni GitHub repository (`your-icon-library`) me upload/commit kar dein,
purani `index.html` aur `vercel.json` ko inse replace kar dein.

GitHub website par ye kar sakte hain: repo kholiye → "Add file" → "Upload files" →
saari files/folders drag karके daal dein → neeche "Commit changes" dabaएं.

## Step 2 — Supabase me table banaएं (sirf ek baar)

1. Supabase.com par apna project (Icon-library) kholें
2. Left sidebar me **SQL Editor** par jाएं
3. **New query** par tap karें
4. Is repo ki `supabase-setup.sql` file ka poora content copy-paste karें
5. **Run** button dabाएं

Ye ek `icons` table bana dega jisme sabhi icons store honge.

**Agar aap pehle se ek baar table bana chuke hain aur ab naye category filters
(Brands, UI, Arrows, etc.) wala update kar rahe hain**, to `supabase-alter-add-groups.sql`
file ka content bhi ek baar SQL Editor me run kar dें — ye ek naya `group_name`
column add karta hai jisके bina category filters kaam nahi karenge.

**CDN Link Manager feature ke liए** (rotating public links, 7-din auto-expiry,
permanent admin link), `supabase-cdn-links.sql` file ka content bhi ek baar
SQL Editor me run karें — ye ek naya `cdn_links` table banata hai.

## Step 3 — Vercel me Environment Variables set karें

Apne Vercel project (`your-icon-library`) → **Settings → Environment Variables**
me jाके ye 6 variables add karें (Production aur Preview, dono ke liye).

**Security ke liye actual values yahan README me nahi likhी gaई** — ye sirf
aapke aur Vercel ke beech honी chahiye, kisi bhi file/repo me nahi. Neeche
sirf naam (Key) diye hain, values aapke paas already alag se maujood hain
(pichle conversation me diye gaए the):

| Key (Vercel me ye exact naam use karें) | Value kaहां se lें |
|---|---|
| `SUPABASE_URL` | Supabase project ka URL |
| `SUPABASE_SECRET_KEY` | Supabase ka service_role secret key |
| `ADMIN_EMAIL` | (Purana system — ab use nahi hota, System X ke liye ALLOWED_EMAILS use karें) |
| `ADMIN_PASSWORD_SALT` | (Purana system — ab use nahi hota) |
| `ADMIN_PASSWORD_HASH` | (Purana system — ab use nahi hota) |
| `SESSION_SECRET` | Neeche diya hua random secret |
| `CRON_SECRET` | Koi bhi random string (naya banaइए) — CDN link auto-expiry cron job ko secure rakhता hai |
| `ALLOWED_EMAILS` | System X me login karne wali email(s), comma se separate — jaisे: `youremail1@example.com,youremail2@example.com` |
| `ADMIN_PHONE` | System X me login karne wala phone number (sirf digits), jaisे: `9999999999` |
| `WHATSAPP_ACCESS_TOKEN` | (Optional) Meta WhatsApp Business Cloud API ka access token — na do to bhi wa.me click-link fallback hamesha kaam karega |
| `WHATSAPP_PHONE_NUMBER_ID` | (Optional) Meta se mila hua phone_number_id |
| `WHATSAPP_TEMPLATE_NAME` | (Optional) Meta me approve kiya hua template ka naam |

Salt/Hash/Session secret values Claude ke saath hue chat me diye gae the —
wahaan se copy karके seedha Vercel me paste karें, kisी file me na likhें.

**Important:** `ADMIN_PASSWORD_SALT` aur `ADMIN_PASSWORD_HASH` — ye aapke
asli admin password ka hashed version hai. Actual plain password **is
README ya kisi bhi file me kahin nahi likha hai** (kyunki repo public hai,
password yahan likhna hi galat hoga). Login karte waqt aap wahi password
type karenge jo aapko yaad hai — backend usko verify kar lega hash se
match karके.

`SUPABASE_SECRET_KEY` aur `SESSION_SECRET` — ye dono sirf server-side
(`/api` functions) me use hoते hain, browser ko kabhi nahi bheje jaते. Isliye
security requirement (secret keys frontend me na ho) poori tarah follow ho
raहi hai.

Sab values daalne ke baad **Redeploy** karein (Deployments tab → latest
deployment → "..." menu → Redeploy) taaki naye environment variables load
ho jayein.

## Step 4 — Test karein

Redeploy hone ke baad ye check karें:

1. `https://your-icon-library.vercel.app` — home page khulna chahiye (404 nahi)
2. `https://your-icon-library.vercel.app/cdn/glyphcraft.css` — CSS code dikhna chahiye
3. `https://your-icon-library.vercel.app/cdn/icons.js` — JS code dikhna chahiye
4. `https://your-icon-library.vercel.app/admin/` — admin login page khulna chahiye
   - Email: (jo aapne ADMIN_EMAIL me set kiya hai)
   - Password: (jo aapka asli password hai — README me security ke liye nahi likha)
5. Login karke ek test icon upload karें (koi bhi simple `<svg>...</svg>` code)
6. Home page (`/`) par jाके check करें ki wo icon dikh raha hai ya nahi

## Kisi bhi website me use karne ke liye

```html
<link rel="stylesheet" href="https://your-icon-library.vercel.app/cdn/glyphcraft.css">
<script src="https://your-icon-library.vercel.app/cdn/icons.js" defer></script>

<!-- kahin bhi page ke andar -->
<i class="myicon myicon-home"></i>
```

## React me use karne ke liye

`examples/MyIcon.jsx` file ko apne React project me copy kar lein aur:

```jsx
import MyIcon from './components/MyIcon';
<MyIcon name="home" />
```

## Vue me use karne ke liye

`examples/MyIcon.vue` file ko apne Vue project me copy kar lein aur:

```vue
import MyIcon from './components/MyIcon.vue';
<MyIcon name="home" />
```

## Security notes

- Icon upload/edit/delete sirf System X se login karके hi ho sakta hai —
  backend har request par token verify karta hai.
- `SUPABASE_SECRET_KEY` aur `SESSION_SECRET` kabhi bhi frontend code me nahi
  hain, sirf server-side environment variables me hain.
- Duplicate icon naam automatically reject ho jाते hain.
