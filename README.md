# Visage

Visage is an interactive, webcam-driven art installation that reads your facial expressions, translates them into emotional telemetry, and adjusts a real-time WebGL space and Spotify playback to match your mood.

The project is hosted live at [visage-beryl.vercel.app](https://visage-beryl.vercel.app/).

---

## How it works

When you first open Visage, you are greeted with an atmospheric, synchronized soundscape and calibration screen. Once inside:

* **WebGL Neural Core**: The glowing blue sphere in the center of the screen is an organic 3D mesh controlled by a custom vertex shader. It shifts in color, size, and turbulence depending on your emotional state.
* **Real-time Face Landmark Tracking**: Using MediaPipe, Visage tracks facial muscle movements (blendshapes) directly in your browser. It calculates two main metrics: *Valence* (how positive or negative your expression is) and *Arousal* (the intensity of the expression).
* **Spotify Integration**: If you connect your Spotify account, the system identifies your current emotion and plays a matching track on your active Spotify device.
* **The Transition**: When you trigger the neural override, the core collapses inward like a black hole, pulling you through a cinematic warp transition into a generative, procedurally modeled 3D neon city grid.

---

## Technical Stack

The code is built on top of standard vanilla Javascript, HTML5 Canvas, and CSS, using the following libraries:
* **Three.js** & custom GLSL shaders for the 3D environments (the Neural Core and MegaCity).
* **MediaPipe Face Landmarker** for client-side expression detection.
* **GSAP** for the sequencing of cinematic animations.
* **Lenis** for smooth scroll behavior.
* **Vite** as the bundler and dev server.

---

## Running Locally

If you want to run this project on your machine:

1. Clone the repository.
2. In the `public/` directory, configure your Spotify Developer credentials in `config.js`:
   ```javascript
   window.SPOTIFY_CLIENT_ID = "YOUR_CLIENT_ID";
   window.SPOTIFY_REDIRECT_URI = "http://localhost:5173/";
   ```
3. Install dependencies and start the local development server:
   ```bash
   npm install
   npm run dev
   ```

To build the static assets for production deployment:
```bash
npm run build
```

---

## Music Credits & Copyright Attribution

This project is a non-commercial, experimental art installation. The ambient soundscapes used in the background are taken from the following works. All rights and copyrights belong to their respective artists, composers, and record labels:

* **Wuthering Waves Main Theme / Soundtrack** (Assets: `WuWa OST.mp3`)
  * Composed and owned by **Kuro Games** / Vanguard Sound.
* **TRON: Legacy Soundtrack** (Assets: `TRON.mp3`)
  * Composed and performed by **Daft Punk** (Walt Disney Records).

*No copyright infringement is intended. These tracks are utilized solely for non-profit artistic, educational, and portfolio purposes.*
