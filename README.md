# Stickman Commando

A simple top-down browser shooter. Move with arrow keys, shoot with spacebar, survive the stickman horde.

Play locally by opening `index.html` (or `npm run dev`), or deploy to [GitHub Pages](https://pages.github.com/) from the `main` branch (root `/`).

## Controls

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Move (also sets aim direction) |
| Space | Shoot |
| P / Esc | Pause / resume |
| ⌂ (during play) | Home — back to the mode menu |
| Space | Start / redeploy |
| Space / Click | Continue (on death) |

> **Continue**: each mode keeps its own checkpoint (`stickmanCommandoSave_<id>`). Die or quit mid-run to save it; **Continue** restores that exact run. A fresh **Deploy** does not wipe it — the checkpoint stays until you reach a better score in that mode (equal-or-better deaths/exits replace it; worse ones leave the old save).

Mode-specific: Jet Side uses ↑ ↓ for lanes + → thrust; Platform uses ← → walk + ↑ ↓ ladders + mouse aim; Stick Tetris uses ← → move, ↑ rotate, ↓ soft drop, SPACE slam; Stick Invaders uses ← → move + SPACE; Sniper Range uses mouse aim + SPACE.

## Demo modes

After the intro sting, pick a demo from the grid:

| Mode (id) | File | What to try |
|------|------|-------------|
| **Horde Survival** (`horde`) | `js/modes/horde-survival.js` | Zombie grid-lane horde + armed grunts/runners/tanks. Brutes every 10 kills, 30% medkit drops, combo+streak bonus, mock ranks on death |
| **Stickman Island** (`stickmanisland`, legacy key `animatedxl`) | `js/modes/animated-xl.js` | 1280x720 scrollable map — hills, rivers, bridges, trees, lean animated stickmen, enemy fire |
| **Drone Drive** (`dronedrive`, legacy key `dronechase`) | `js/modes/drone-drive.js` | Truck bed turret — aim crosshair on a bumpy road, shoot stick-drones |
| **Platform Raid** (`platform`) | `js/modes/platform-raid.js` | Run, climb ladders, shoot — clear levels then reach the exit |
| **Jet Side** (`jetside`, legacy key `sidescroll`) | `js/modes/jet-side.js` | Three-lane jetpack duel — thrust, dodge debris, hostiles shoot back |
| **Stick Invaders** (`stickinvaders`) | `js/modes/stick-invaders.js` | Formation shooter with shields/bunkers — don't let them land |
| **Bomb Tetris** (`sticktetris`) | `js/modes/stick-tetris.js` | Bomb blocks fall — full rows detonate, launching exploding stickmen + flash/shake |
| **Waves** (`waves`) | `js/modes/waves.js` | Clear a wave, breather, next wave. Best wave saved across runs and shown in the HUD |
| **Sniper Range** (`sniperrange`) | `js/modes/sniper-range.js` | Stationary gallery duel — pop-up stickmen telegraph their shots; drop them before they fire |

Retired (merged into Horde, hidden from picker, old saves carry over): `zombie`, `shooters`, `medkits`, `variants`, `leaderboard`.

Each mode saves its own high score in your browser (`stickmanCommandoHighScore_<id>`).

## Scripts

Load order matters (`index.html`): `audio → gore → characters → shared → xl-mode → modes/registry → modes/* → game`.

Core banners: use `g.showBanner(text, seconds)` — it is ticked centrally in `game.js` (`tickBanner`). Do not use raw `setTimeout` for banners.

Favicon: `npm run favicon` regenerates `favicon.png`, `favicon.ico` and `apple-touch-icon.png` from `scripts/make-favicon.js` (pure stdlib, no deps) — a mini sage model shooting on the `#hud h1` background `#58a6ff`; `favicon.svg` is the hand-authored source of truth.

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
