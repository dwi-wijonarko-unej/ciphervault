# CipherVault — UI/UX Design Guide

> Dokumen ini adalah acuan desain ulang frontend CipherVault. Bukan sekadar "tema gelap + kartu membulat", tapi sebuah sistem desain yang punya karakter, otoritas visual, dan menolak klise AI Slop.

---

## Daftar Isi

1. [Filosofi Desain](#1-filosofi-desain)
2. [Anti-Patterns (Banned)](#2-anti-patterns-banned)
3. [Custom Theme — tailwind.config.js](#3-custom-theme--tailwindconfigjs)
4. [Tipografi](#4-tipografi)
5. [Layout System](#5-layout-system)
6. [Komponen & Modulasi](#6-komponen--modulasi)
7. [Halaman Spesifik](#7-halaman-spesifik)
   - 7.1 [Login Page](#71-login-page)
   - 7.2 [Dashboard (My Files)](#72-dashboard-my-files)
   - 7.3 [Upload Flow](#73-upload-flow)
   - 7.4 [Security Analysis Modal](#74-security-analysis-modal)
   - 7.5 [Share Modal](#75-share-modal)
   - 7.6 [Detail Panel (Side Drawer)](#76-detail-panel-side-drawer)
   - 7.7 [Shared with Me Page](#77-shared-with-me-page)
   - 7.8 [System Page](#78-system-page)
   - 7.9 [Activity Log](#79-activity-log)
8. [Micro-interactions](#8-micro-interactions)
9. [Responsive Behavior](#9-responsive-behavior)
10. [Dark/Light Mode](#10-darklight-mode)

---

## 1. Filosofi Desain

**CipherVault adalah produk kemanan.** Setiap piksel harus mengomunikasikan: *ketegasan, enkripsi, kendali.*

| Prinsip | Terjemahan Visual |
|---------|------------------|
| **Authority** | Warna solid berani, border tajam, spacing lega. Tidak ada elemen yang ragu-ragu. |
| **Precision** | Setiap ukuran, jarak, dan radius punya alasan. Tidak ada "asumsi". |
| **Restraint** | Satu aksen per halaman. Tidak ada 3 warna gradien bersaing. |
| **Clarity** | Hierarki visual ekstrem: judul sangat besar, metadata sangat kecil. User tahu mana yang penting. |

---

## 2. Anti-Patterns (Banned)

### ❌ Gradien Ungu-ke-Biru (Indigo-Purple-Pink)
**Dilarang keras.** Alih-alih, gunakan satu warna solid sebagai identitas (primer) dengan variasi opacity atau saturation untuk depth.

> **Contoh buruk:** `bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500`  
> **Gunakan:** Satu warna primer solid dengan layer bayangan atau border sebagai aksen.

### ❌ Centered Hero Layout
Jangan tempatkan judul, subteks, dan tombol di sumbu tengah halaman.

> **Gunakan layout asimetris:** kolom konten (60%) + elemen visual dekoratif (40%) di samping.

### ❌ 3 Kartu Ikon Fitur
Jangan gunakan baris 3 kartu dengan ikon lucide, judul, deskripsi pendek.

> **Gunakan:** Bento grid, accordion horizontal, atau list naratif dengan visual terintegrasi.

### ❌ Seragam rounded-2xl di Semua Elemen
Jangan beri border-radius identik pada card, tombol, input, modal.

> **Aturan border-radius peran:**
> - Tombol aksi utama → **pill (rounded-full)** atau **sharp (rounded-none)**
> - Kartu/kontainer → **rounded-lg** (sedang)
> - Input field → **rounded-md** (kecil)
> - Gambar/visual → **rounded-none** (tegas)
> - Modal → **rounded-xl** (paling besar, hanya satu)

### ❌ Satu Font dengan Ukuran Berdekatan
Jangan gunakan `text-lg` untuk judul dan `text-base` untuk deskripsi.

> **Kontras ekstrem:** Judul `text-4xl font-black`, label `text-xs font-medium`, body `text-sm font-normal`.

### ❌ Tooltip/Toast Generik
Jangan gunakan tooltip bawaan browser atau daisyUI tanpa kustomisasi.

> Toast harus punya border-left 3px solid sesuai tipe, dan animasi slide-in dari kanan dengan kurva custom.

---

## 3. Custom Theme — tailwind.config.js

Jangan gunakan tema default daisyUI (`light`/`dark`). Buat tema kustom dengan warna berani dan terbatas.

```js
// tailwind.config.js — CipherVault Custom Theme
module.exports = {
  content: ['./frontend/**/*.{html,js}'],
  daisyui: {
    themes: [
      {
        ciphervault: {
          // Primer — hijau lumut solid, bukan biru/ungu
          primary: '#2d6a4f',
          'primary-content': '#ffffff',
          // Sekunder — netral hangat
          secondary: '#5c6b73',
          'secondary-content': '#ffffff',
          // Aksen — kuning emas tua, berani tapi tidak menyilaukan
          accent: '#d4a72c',
          'accent-content': '#1a1a1a',
          // Netral — abu-abu hangat solid
          neutral: '#2c3035',
          'neutral-content': '#e2e4e9',
          // Base — off-white hangat untuk mode terang
          'base-100': '#f5f3ef',
          'base-200': '#ebe7e1',
          'base-300': '#d6d0c6',
          'base-content': '#1f2226',
          // Info/Success/Warning/Error — tetap minimal
          info: '#4a9eff',
          success: '#2d6a4f',
          warning: '#d4a72c',
          error: '#c44545',
        },
      },
      {
        'ciphervault-dark': {
          primary: '#40916c',
          'primary-content': '#0f1a14',
          secondary: '#7a8b94',
          'secondary-content': '#0f1114',
          accent: '#e0b94a',
          'accent-content': '#141107',
          neutral: '#1b1d21',
          'neutral-content': '#c8cbd1',
          'base-100': '#13151a',
          'base-200': '#1a1d24',
          'base-300': '#262a33',
          'base-content': '#d6d8dd',
          info: '#4a9eff',
          success: '#40916c',
          warning: '#e0b94a',
          error: '#d15151',
        },
      },
    ],
  },
  theme: {
    extend: {
      fontFamily: {
        // Gunakan font berkarakter kuat
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        // Shadow keras untuk karakter tegas
        sharp: '4px 4px 0px 0px rgba(0,0,0,0.15)',
        'sharp-hover': '6px 6px 0px 0px rgba(0,0,0,0.2)',
        soft: '0 2px 8px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        // Border-radius tidak seragam
        sharp: '0',
        pill: '9999px',
      },
    },
  },
}
```

### CSS Variables untuk Mode Gelap/Terang

```css
/* Mode terang (default) */
:root {
  --bg-body: #f5f3ef;
  --surface-card: #ffffff;
  --surface: #ebe7e1;
  --surface-hover: #e3dfd7;
  --surface-input: #f0ede8;
  --border: #d6d0c6;
  --text-primary: #1f2226;
  --text-secondary: #5c6b73;
  --muted: #8f968e;
  --accent: #d4a72c;
  --primary: #2d6a4f;
}

/* Mode gelap */
.dark {
  --bg-body: #13151a;
  --surface-card: #1a1d24;
  --surface: #1b1d21;
  --surface-hover: #262a33;
  --surface-input: #1e2128;
  --border: #262a33;
  --text-primary: #d6d8dd;
  --text-secondary: #7a8b94;
  --muted: #545a64;
  --accent: #e0b94a;
  --primary: #40916c;
}
```

### Color Palette Reference

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `#2d6a4f` | `#40916c` | Buttons, links, active states |
| `accent` | `#d4a72c` | `#e0b94a` | Security score high, premium badge |
| `neutral` | `#2c3035` | `#1b1d21` | Navbar, footer, dark containers |
| `base-100` | `#f5f3ef` | `#13151a` | Page background |
| `surface-card` | `#ffffff` | `#1a1d24` | Card, modal, dropdown |
| `error` | `#c44545` | `#d15151` | Delete button, alert, integrity fail |
| `success` | `#2d6a4f` | `#40916c` | Status OK, verified badge |

---

## 4. Tipografi

### Font Stack

- **Heading:** Space Grotesk — geometris, tegas, karakter huruf `R` dan `K` yang ikonik.
- **Body:** Inter — keterbacaan tinggi di ukuran kecil, ideal untuk data-dense UI.
- **Mono:** JetBrains Mono — untuk file ID, hash, token, dan metadata teknis.

### Scale Tipografi

```css
/* Hierarki vertikal ekstrem */
h1 { @apply text-[2.5rem] font-black tracking-tight; }   /* Judul halaman */
h2 { @apply text-xl font-bold; }                          /* Section header */
h3 { @apply text-base font-semibold; }                    /* Card title */
p  { @apply text-sm font-normal leading-relaxed; }        /* Body text */
label { @apply text-xs font-medium uppercase tracking-wider; } /* Field label */
.meta { @apply text-[11px] font-normal text-muted; }      /* Metadata, timestamp */
.code { @apply text-xs font-mono; }                       /* Technical values */
```

### Aturan Kontras

- Judul halaman minimal `text-3xl` atau `text-4xl` dengan `font-black`.
- Metadata (ukuran file, tanggal) maksimal `text-xs` dan `text-muted`.
- Jangan pernah gunakan ukuran yang berdekatan untuk elemen dengan peran berbeda.
- **Contoh baik:** Judul `2.5rem` → subjudul `1rem` → body `0.875rem` → meta `0.6875rem`.

---

## 5. Layout System

### Grid Utama

```
Desktop (>1024px):
┌─────────────────────────────────────────────────────┐
│ Navbar (full-width, height 64px)                    │
├─────────────────────────────────────────────────────┤
│ Tabs Bar (full-width, height 52px)                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────────────┬──────────────────────┐    │
│   │   Content (70%)      │   Optional Sidebar   │    │
│   │                      │   (30%)              │    │
│   │                      │                      │    │
│   └──────────────────────┴──────────────────────┘    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Aturan Asimetri

- Jangan pernah bagi layout menjadi 50/50.
- Gunakan rasio 65/35 atau 70/30 untuk konten utama vs sekunder.
- Sidebar bersifat opsional (detail panel). Saat tidak aktif, konten melebar penuh.

### Spacing

```css
--page-padding: 1.5rem;    /* 24px horizontal padding */
--section-gap: 1.5rem;     /* 24px antar section */
--card-padding: 1.25rem;   /* 20px dalam card */
--element-gap: 0.75rem;    /* 12px antar elemen dalam card */
```

---

## 6. Komponen & Modulasi

### 6.1 Button

| Varian | Bentuk | Border | Shadow | Hover |
|--------|--------|--------|--------|-------|
| Primary | `rounded-none` | none | `shadow-sharp` | `hover:-translate-y-0.5 hover:shadow-sharp-hover` |
| Outline | `rounded-full` | `border-2` | none | `hover:bg-primary hover:text-primary-content` |
| Ghost | `rounded-md` | none | none | `hover:bg-surface-hover` |
| Danger | `rounded-none` | none | `shadow-sharp` | `hover:bg-error hover:text-white` |
| Icon-only | `rounded-md` | none | none | `hover:bg-surface-hover` |

### 6.2 Card

```html
<!-- Bukan card rounded-2xl generik -->
<div class="bg-surface-card border border-border rounded-lg p-5 
            transition-all duration-200 hover:shadow-soft">
  <!-- Konten -->
</div>
```

**Aturan card:**
- Border selalu `1px solid var(--border)`.
- Hover hanya mengubah shadow, bukan border color.
- Padding konsisten `p-5` (20px).
- Radius `rounded-lg` (8px), bukan `rounded-2xl`.

### 6.3 Input Field

```html
<input class="w-full px-3.5 py-2.5 
              bg-surface-input border border-border rounded-md 
              text-sm text-primary placeholder-muted
              outline-none transition-all
              focus:border-primary focus:ring-[3px] focus:ring-primary/10" />
```

**Aturan input:**
- Background: `surface-input`
- Border radius: `rounded-md` (6px) — lebih kecil dari card.
- Focus: border berubah ke primary, tambahkan ring tipis.
- Placeholder: `text-muted`, jangan pernah `text-primary`.

### 6.4 Table

Bukan tabel Bootstrap/daftar striping generik.

```html
<div class="bg-surface-card border border-border rounded-lg overflow-hidden">
  <table class="w-full">
    <thead>
      <tr class="bg-surface border-b border-border">
        <th class="text-left px-4 py-3 text-xs font-semibold text-secondary uppercase">...</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-border last:border-0 
                hover:bg-surface-hover transition-colors duration-150">
        <td class="px-4 py-3">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### 6.5 Modal

```html
<!-- Overlay -->
<div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[8000] flex items-center justify-center p-5">
  <!-- Container modal — rounded-xl hanya di sini -->
  <div class="bg-surface-card border border-border rounded-xl shadow-2xl w-full max-w-[480px] max-h-[80vh] overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border">
      <h3 class="text-lg font-bold">Title</h3>
      <button class="p-2 rounded-md text-muted hover:bg-surface-hover transition-colors">✕</button>
    </div>
    <!-- Body -->
    <div class="px-6 py-5">...</div>
    <!-- Footer -->
    <div class="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">...</div>
  </div>
</div>
```

### 6.6 Toast

```html
<div class="flex items-center gap-3 px-4 py-3.5 
            bg-surface-card border border-border rounded-lg shadow-2xl 
            min-w-[320px] max-w-[420px]
            border-l-[3px] border-l-success
            animate-[slideInRight_0.3s_ease]">
  <span class="flex-shrink-0">[icon]</span>
  <span class="flex-1 text-sm">Message</span>
  <button class="flex-shrink-0 text-muted hover:text-primary p-1">✕</button>
</div>
```

**Keyframe animasi:**
```css
@keyframes slideInRight {
  from { transform: translateX(100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

## 7. Halaman Spesifik

### 7.1 Login Page

**Layout:** Asimetris. Bukan hero center.

```
Desktop:
┌──────────────────────────────────────────────────────────┐
│ ┌──────────────┐  ┌──────────────────────────────────┐  │
│ │  Dekoratif   │  │  Form Card                       │  │
│ │  (40%)       │  │  (60%)                           │  │
│ │              │  │  ┌──────────────────────────┐    │  │
│ │  Logo besar  │  │  │  Sign In / Create        │    │  │
│ │  Ilustrasi   │  │  │  Account tabs            │    │  │
│ │  atau grid   │  │  │                          │    │  │
│ │  pattern     │  │  │  Username                │    │  │
│ │              │  │  │  Password                │    │  │
│ │              │  │  │  [Sign In]               │    │  │
│ │              │  │  │  Forgot Password?        │    │  │
│ │              │  │  └──────────────────────────┘    │  │
│ └──────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Design decisions:**
- Form card tidak di tengah, tapi di kanan (60%).
- Sisi kiri berisi elemen dekoratif — bisa berupa grid pattern abstrak, ilustrasi teknis, atau animasi partikel sederhana.
- Tab switcher (Sign In / Create Account) menggunakan pill-style dengan underline aktif, bukan background block penuh.
- "Forgot Password?" adalah text link kecil di bawah tombol, bukan link terpisah di footer card.
- Tidak ada gradien di background atau card.

**Border-radius:**
- Card form: `rounded-lg`
- Tombol Sign In: `rounded-none` dengan shadow-sharp
- Input: `rounded-md`
- Tab pills: `rounded-full`

### 7.2 Dashboard (My Files)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│ [H1] My Files          [Stats: 12 files] [Upload]   │
├─────────────────────────────────────────────────────┤
│ Stats row: 4 metric cards kompak                     │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                │
│ │Total │ │Enc.  │ │Store │ │Status│                │
│ │12    │ │UHC+..│ │ZK    │ │ ✓    │                │
│ └──────┘ └──────┘ └──────┘ └──────┘                │
├─────────────────────────────────────────────────────┤
│ [Search bar]                                         │
├─────────────────────────────────────────────────────┤
│ Table file list — border card, no rounded-2xl        │
│ Name  │ Size  │ Type │ Date │ Actions [DL][Share].. │
│ ...   │ ...   │ ...  │ ...  │ ...                   │
└─────────────────────────────────────────────────────┘
```

**Design decisions:**
- Search bar menggunakan input dengan icon di kiri, bukan search terpisah dengan tombol.
- Stats ditampilkan sebagai 4 kotak kecil di baris horizontal (bukan card besar).
- Nama file punya icon berdasarkan tipe — icon ini adalah SVG inline, bukan font icon.
- Encryption type ditampilkan sebagai tag kecil (`text-[10px]`) dengan border emerald.
- Actions adalah icon buttons tanpa label — hanya muncul di hover baris atau selalu terlihat dengan opacity rendah.

**Empty state:**
```
┌─────────────────────────────────────────────────────┐
│                                                       │
│            [Illustration: empty folder]               │
│            No files yet                               │
│            Upload your first file to get started.     │
│                                                       │
└─────────────────────────────────────────────────────┘
```
Bukan teks center membosankan. Tambahkan ilustrasi dan CTA yang jelas.

### 7.3 Upload Flow

**Bukan drag-drop zone generik:**

```
┌─────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │   [Icon upload]                                 │ │
│ │   Drop files here or click to browse            │ │
│ │   Max file size: 50 MB                          │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [Progress bar] — muncul setelah file dipilih          │
│ filename.txt                              ██████░░ 45%│
│                                                       │
│ [Success card] — muncul setelah upload selesai        │
│ ┌──────────────────────────────────────────────────┐ │
│ │ ✓ Upload complete                                │ │
│ │ File: report.pdf                                 │ │
│ │ Security Score: 78/100                    [View] │ │
│ └──────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Design decisions:**
- Drop zone memiliki border dashed, bukan solid.
- Setelah file dipilih, muncul progress bar per file — bukan spinner global.
- Setelah selesai, card hasil upload muncul di bawah form, bukan modal.
- Security score ditampilkan sebagai angka besar dengan progress bar radial kecil di sebelahnya.

### 7.4 Security Analysis Modal

```
┌───────────────────────────────────────────────┐
│ Security Analysis                     [✕]    │
├───────────────────────────────────────────────┤
│                                               │
│  File: financial_report.xlsx                  │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │  Score: 78/100                         │  │
│  │  ┌─────┬──────┬──────┬──────┬──────┐  │  │
│  │  │Entr.│Corr. │Aval. │NPCR  │UACI  │  │  │
│  │  │7.99 │0.003 │44.2% │99.9% │34.5% │  │  │
│  │  │ ✅  │  ✅  │ ⚠️   │ ✅   │ ✅   │  │  │
│  │  └─────┴──────┴──────┴──────┴──────┘  │  │
│  │                                        │  │
│  │  Rating: Good                          │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  AI Decision Trace:                           │
│  ┌─ Strategy: multi_feature_adaptive        ─┐│
│  ├─ File Class: spreadsheet                  ├│
│  ├─ Matrix: 8x8 (adaptive_r=3.97)           ├│
│  ├─ Reasoning: low entropy → larger matrix  ─┤│
│  └───────────────────────────────────────────┘│
│                                               │
└───────────────────────────────────────────────┘
```

**Design decisions:**
- Bukan tabel 2 kolom kiri-kanan. Gunakan layout grid metric cards.
- Setiap metrik punya indikator visual (✅ ⚠️ ❌) bukan hanya angka.
- Score ditampilkan di bagian atas dengan progress bar melingkar.
- AI Decision trace adalah accordion yang bisa di-expand — tidak langsung terlihat semua.

### 7.5 Share Modal

```
┌───────────────────────────────────────────────┐
│ Share File                           [✕]    │
├───────────────────────────────────────────────┤
│                                               │
│ Share "financial_report.xlsx"                 │
│                                               │
│ Recipient Username                            │
│ ┌─────────────────────────────────────────┐  │
│ │ Enter username...              [Share]  │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ Expires in (hours) — optional                 │
│ ┌─────────────────────────────────────────┐  │
│ │ 24                                       │  │
│ └─────────────────────────────────────────┘  │
│                                               │
│ ── Shared With ──                             │
│ bob   · Jan 15, 2026   [Revoke]              │
│ ─────────────────────────────────────────     │
│                                               │
└───────────────────────────────────────────────┘
```

**Design decisions:**
- Input recipient dan tombol Share dalam satu baris (inline), bukan stacked.
- List "Shared With" muncul di bawah — menampilkan siapa saja yang sudah diberi akses.
- Tombol Revoke menggunakan varian ghost dengan warna error, bukan merah solid.
- Tidak ada confirm dialog untuk revoke — cukup sekali klik dengan toast "Access revoked".

### 7.6 Detail Panel (Side Drawer)

```
┌──── Main Content ────┬─── Detail Panel ──────┐
│                      │                        │
│     (dimmed/peek)    │  File: report.pdf  [✕] │
│                      │                        │
│                      │  ┌─ Encryption ──────┐ │
│                      │  │ Layer 1: UHC      │ │
│                      │  │ Layer 2: AES + RSA│ │
│                      │  │ Key Wrap: RSA     │ │
│                      │  │ AI Mode: adaptive │ │
│                      │  │ Matrix: 8x8       │ │
│                      │  │ R: 3.97           │ │
│                      │  └───────────────────┘ │
│                      │                        │
│                      │  ┌─ File Info ────────┐ │
│                      │  │ Size: 2.4 MB       │ │
│                      │  │ Encrypted: 2.5 MB  │ │
│                      │  │ Type: application/ │ │
│                      │  │ Created: Jan 15    │ │
│                      │  │ ID: #1024          │ │
│                      │  └───────────────────┘ │
│                      │                        │
│                      │  [Download] [Analyze]  │
│                      │                        │
└──────────────────────┴────────────────────────┘
```

**Design decisions:**
- Side drawer muncul dari kanan, lebar 400px.
- Konten utama di belakang mendapat overlay redup (backdrop).
- Bukan full-screen modal. Detail panel adalah slide-in drawer.
- Informasi dikelompokkan dalam card-card kecil dengan border, bukan list panjang tanpa pemisah.

### 7.7 Shared with Me Page

Menggunakan layout yang sama dengan dashboard, tapi:
- Header: "Shared with Me" dengan subtitle berbeda.
- Kolom tambahan: "Shared By" dengan avatar initial.
- Tidak ada tombol Share di row actions (hanya Download).
- Empty state: "No shared files. Files shared with you will appear here."

### 7.8 System Page

Layout dua kolom asimetris:

```
┌─── 60% ───────────────────┬─── 40% ─────────────┐
│                           │                      │
│ Configuration             │ RSA Key Status       │
│ ┌─────────────────────┐   │ ┌──────────────────┐ │
│ │ AI Strategy: multi  │   │ │ Key Size: 2048   │ │
│ │ Adaptive R: true    │   │ │ Fingerprint: ... │ │
│ │ UHC Modulus: 257    │   │ │ Generated: ...   │ │
│ │ Matrix: 8           │   │ └──────────────────┘ │
│ │ R: 3.923            │   │                      │
│ │ Session Key: 32B    │   │ Storage Usage        │
│ │ PBKDF2: 100K iters  │   │ ┌──────────────────┐ │
│ └─────────────────────┘   │ │ [progress bar]   │ │
│                           │ │ 2.4 MB / 100 MB  │ │
│ Database Status           │ └──────────────────┘ │
│ ┌─────────────────────┐   │                      │
│ │ Type: SQLite        │   │ Uptime              │
│ │ Status: Connected   │   │ ┌──────────────────┐ │
│ └─────────────────────┘   │ │ 2.3 hours        │ │
│                           │ └──────────────────┘ │
└───────────────────────────┴──────────────────────┘
```

### 7.9 Activity Log

Layout timeline vertikal — bukan tabel.

```
┌─────────────────────────────────────────────────┐
│  Activity Log                         12 events │
├─────────────────────────────────────────────────┤
│                                                 │
│  [Icon] Downloaded report.pdf       Jan 15, 2026│
│  [Icon] Shared report.pdf with bob  Jan 15, 2026│
│  [Icon] Uploaded photo.jpg          Jan 14, 2026│
│  [Icon] Deleted draft.txt           Jan 14, 2026│
│  ...                                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Design decisions:**
- Setiap item punya icon berdasarkan action type (upload/download/share/delete).
- Icon di-wrapped dalam container `w-9 h-9 rounded-lg` dengan warna sesuai action.
- Timestamp di kanan, bukan di bawah.
- Tidak ada border antar item — cukup spacing `py-3` dan separator tipis `border-b border-border`.

---

## 8. Micro-interactions

| Elemen | Interaksi | CSS |
|--------|-----------|-----|
| Button primary | Angkat ke atas + shadow membesar | `hover:-translate-y-0.5 hover:shadow-sharp-hover transition-all duration-200` |
| Table row | Background berubah halus | `hover:bg-surface-hover transition-colors duration-150` |
| Card | Shadow lembut muncul | `hover:shadow-soft transition-shadow duration-200` |
| Icon button | Background muncul di hover | `hover:bg-surface-hover transition-colors duration-150` |
| Modal overlay | Backdrop blur fade-in | `animate-[fadeIn_0.2s_ease]` |
| Modal content | Scale-in dari 95% | `animate-[scaleIn_0.25s_ease]` |
| Toast | Slide dari kanan + fade out | `animate-[slideInRight_0.3s_ease]`, `transition-all duration-300` untuk keluar |
| Side drawer | Slide dari kanan | `animate-[slideInRight_0.25s_ease-out]` |
| Page transition | Fade in + translateY(8px) | `animate-[pageEnter_0.3s_ease]` |
| Tab switch | Underline bergeser | `transition-all duration-200` |

### Keyframes yang diperlukan

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes slideInRight {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## 9. Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| `>=1024px` | Layout asimetris penuh (70/30), side drawer tampil, tabel penuh |
| `768-1023px` | Side drawer menjadi overlay penuh, tabel tetap horizontal dengan scroll |
| `480-767px` | Single column, tabs jadi hamburger menu, stats 2x2 grid, table jadi list cards |
| `<480px` | Padding dikurangi (16px), font size turun 1 step, action buttons jadi icon-only |

### Mobile-specific

- Table dikonversi menjadi list cards untuk mobile (<640px):
  ```
  ┌────────────────────────────────────┐
  │ [icon] report.pdf                  │
  │ 2.4 MB · PDF · Jan 15             │
  │ [DL] [Share] [⋮]                  │
  └────────────────────────────────────┘
  ```
- Navbar tabs menjadi hamburger dropdown.
- Upload zone full-width tanpa border-radius.

---

## 10. Dark/Light Mode

### Aturan

- Default: **Dark mode** (cocok untuk produk security).
- Toggle di navbar kiri atas — icon sun/moon.
- Transisi mode menggunakan `transition-colors duration-300` di `body` dan elemen utama.
- Gunakan CSS variables untuk warna, jangan ubah tailwind class secara manual.

### Implementation

```html
<!-- Toggle button -->
<button onclick="document.documentElement.classList.toggle('dark')"
        class="p-2 rounded-md text-muted hover:bg-surface-hover transition-all">
  <!-- Sun icon (visible in dark mode) -->
  <svg class="hidden dark:block" ...>☀️</svg>
  <!-- Moon icon (visible in light mode) -->
  <svg class="block dark:hidden" ...>🌙</svg>
</button>
```

### Test Checklist Dark/Light Mode

- [ ] Semua teks terbaca di kedua mode
- [ ] Input field memiliki kontras cukup
- [ ] Border dan shadow terlihat jelas
- [ ] Icon dan SVG memiliki warna yang sesuai
- [ ] Toast dan modal tidak kehilangan kontras
- [ ] Security badge/score tetap terbaca

---

## Lampiran: Design Review Checklist

Sebelum deploy, pastikan:

- [ ] Tidak ada gradien ungu-biru
- [ ] Tidak ada 3 kartu ikon sejajar
- [ ] Tidak ada hero section center
- [ ] Border-radius bervariasi sesuai peran elemen
- [ ] Tipografi punya kontras ekstrem
- [ ] Hover states ada di semua elemen interaktif
- [ ] Animasi halus dan tidak mengganggu (<300ms)
- [ ] Mode gelap/terang berfungsi penuh
- [ ] Mobile layout tidak pecah
- [ ] Empty state ditangani dengan baik
- [ ] Error state menampilkan pesan yang membantu
- [ ] Loading state tidak menggunakan spinner generic saja
