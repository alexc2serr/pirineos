<div align="center">

# 🏔️ PIRINEOS 3D

**Interactive 3D Geospatial Explorer of the Spanish & French Pyrenees**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)](./LICENSE)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Falexc2serr%2Fpirineos)

</div>

---

## ✨ Highlights

- **Real Elevation Terrain (DEM):** Generates a high-resolution 3D mesh of the entire Pyrenees mountain range directly from AWS Terrarium elevation tiles, rendered with a custom GLSL alpine shader (deep valley forests, granite/limestone ridges, slope-aware snowfields, topographic contour lines, and precomputed long cast shadows).
- **Dynamic Alpine Lighting:** Smoothly animate the sun, sky, haze, and cast shadows across **Amanecer (Dawn)**, **Mediodía (Noon)**, and **Atardecer (Sunset)**.
- **209 Peaks & 174 Mountain Huts (OpenStreetMap + Curated Data):**
  - Covers the full range from Navarra/Basque Country to Catalonia and the French Pyrénées-Orientales, including iconic 3,000m giants (*Aneto, Posets, Monte Perdido, Vignemale, Balaitús, Pica d'Estats*) and beloved 2,000m summits (*Pico de la Estiva, Peña Telera, Anayet, Bisaurín, Pedraforca*).
  - Guarded & free/bivouac huts (*La Renclusa, Góriz, Respomuso, Bayssellance, Refugio de La Estiva, Refugio de La Larri*, etc.) with capacity, winter capacity, service grids (meals, showers, electricity, WiFi/radio, water, hearth), and access notes.
- **360° Summit Panorama & Drone Navigation:**
  - Click any peak to fly smoothly in an arc over the ridges and enter **360° Summit Mode** with real line-of-sight horizon labels (distance & compass bearing to visible neighboring peaks).
  - Free aerial navigation with mouse/touch (`Left-drag` rotate, `Right-drag` pan, `Scroll` zoom) and keyboard (`WASD` / Arrow keys + `Shift` boost).
  - Cinematic **"Sobrevolar Cordillera"** west-to-east auto-tour + quick massif jump bar + real-time 60 FPS Telemetry HUD (camera altitude, target GPS, compass heading).
- **3D Ascent Routes & Parking Access:**
  - Separate **"Desde Parking (Coche)"** and **"Desde Refugios"** route tabs with parking locations, access/fee notes, distance, elevation gain, and animated 3D route lines draped directly onto the DEM relief.
  - **"Ver Ruta Completa en 3D"** frames the entire ascent from trailhead to summit.
- **🎬 Cozy Relive 3D Video Mode (MP4 / WebM Export):**
  - Watch an animated 3D alpine hiker walk your selected route step-by-step, lighting up a golden trail behind them, followed by a cozy drone camera and a summit celebration.
  - Captures a 60 FPS composite video (3D canvas + live progress HUD + cozy summit summary card) and downloads it directly from your browser.

---

## 🎮 Controls

| Input | Action |
| :--- | :--- |
| **Left Drag** | Orbit / Look around 360° (Summit Mode) |
| **Right Drag / Two-Finger Drag** | Pan horizontally across the range |
| **Scroll / Pinch** | Zoom in / out |
| **W A S D / Arrow Keys** | Free drone flight across valleys & ridges (`Shift` for 2.5× speed) |
| **Click Peak / Hut** | Fly to destination and open technical sheet |
| **Esc** | Return to Aerial Overview / Exit Video Mode |

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript + Vite
- **3D Engine:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Animation:** GSAP (camera flights, sun/atmosphere transitions, cinematic tour)
- **Styling:** Tailwind CSS v4 (`Cinzel`, `Plus Jakarta Sans`, `JetBrains Mono`)
- **Geospatial Data:** AWS Terrain Tiles (Terrarium DEM) + OpenStreetMap (Overpass / QLever OSM Planet)

---

## 🚀 Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/alexc2serr/pirineos.git
cd pirineos

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

### Production Build

```bash
npm run build
npm run preview
```

### Refresh OpenStreetMap Dataset

To re-fetch real peaks and mountain huts across the Pyrenees bounding box from OpenStreetMap:

```bash
node scripts/fetchPyreneesData.mjs
```

---

## ☁️ Deploying on Vercel

This repository is pre-configured for zero-config deployment on **Vercel** (`vercel.json` included):

1. Click the **Deploy with Vercel** button above, or import `https://github.com/alexc2serr/pirineos` in the [Vercel Dashboard](https://vercel.com/new).
2. Vercel will automatically detect **Vite** (`npm run build` → output directory `dist`).
3. Deploy — no environment variables or API keys required.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for more information.
