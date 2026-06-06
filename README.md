# Stickman Commando

A simple top-down browser shooter. Move with arrow keys, shoot with spacebar, survive the stickman horde.

Play locally by opening `index.html`, or deploy to [GitHub Pages](https://pages.github.com/) from the `main` branch (root `/`).

## Controls

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Move (also sets aim direction) |
| Space | Shoot |
| Space / Click | Start / redeploy |

## Features (v0.1)

- Health, score, and per-browser high score (`localStorage`)
- Enemies spawn from the edges and chase you
- Difficulty ramps up over time
- Intro sting on load (synthesized — no audio files)

## GitHub Pages setup

1. Push this repo to GitHub
2. **Settings → Pages → Build and deployment**
3. Source: **Deploy from a branch**
4. Branch: `main`, folder: `/ (root)`
5. Save — the game will be live at `https://<username>.github.io/stickmancommando/`

## Ideas for later

- Enemy types (shooters, rushers, tanks)
- Cover / obstacles on the map
- Waves and boss fights
- Power-ups (medkits, rapid fire)
- Centralized leaderboard
- More sfx and music
