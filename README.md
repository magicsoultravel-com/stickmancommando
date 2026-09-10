# Stickman Commando

A simple top-down browser shooter. Move with arrow keys, shoot with spacebar, survive the stickman horde.

Play locally by opening `index.html` (or `npm run dev`), or deploy to [GitHub Pages](https://pages.github.com/) from the `main` branch (root `/`).

## Controls

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Move (also sets aim direction) |
| Space | Shoot |
| Space / Click | Start / redeploy |

Mode-specific: Jet Side uses ↑ ↓ for lanes + → thrust; Platform uses ← → walk + ↑ ↓ ladders + mouse aim; Stick Tetris uses ← → move, ↑ rotate, ↓ soft drop, SPACE slam; Stick Invaders uses ← → move + SPACE.

## Demo modes

After the intro sting, pick a demo from the grid:

| Mode (id) | File | What to try |
|------|------|-------------|
| **Zombie Arena** (`zombie`) | `js/modes/zombie-arena.js` | Walker horde on grid lanes — kills spray gore (heads, limbs); every 10 kills a brute spawns |
| **Stickman Island** (`stickmanisland`, legacy key `animatedxl`) | `js/modes/animated-xl.js` | 1280×720 scrollable map — hills, rivers, bridges, trees, lean animated stickmen, enemy fire |
| **Drone Drive** (`dronedrive`, legacy key `dronechase`) | `js/modes/drone-drive.js` | Truck bed turret — aim crosshair on a bumpy road, shoot stick-drones |
| **Platform Raid** (`platform`) | `js/modes/platform-raid.js` | Run, climb ladders, shoot — clear levels then reach the exit |
| **Jet Side** (`jetside`, legacy key `sidescroll`) | `js/modes/jet-side.js` | Three-lane jetpack duel — thrust, dodge debris, hostiles shoot back |
| **Stick Invaders** (`stickinvaders`) | `js/modes/stick-invaders.js` | Formation shooter with shields/bunkers — don't let them land |
| **Stick Tetris** (`sticktetris`) | `js/modes/stick-tetris.js` | Falling-block stacker where every block is a stickman corpse |
| **Enemy fire** (`shooters`) | `js/modes/topdown-modes.js` | Red stickmen shoot back — dodge their bullets |
| **Waves** (`waves`) | `js/modes/waves.js` | Clear a wave, breather, next wave |
| **Medkits** (`medkits`) | `js/modes/topdown-modes.js` | Green crosses drop on kills — walk over to heal |
| **Enemy types** (`variants`) | `js/modes/topdown-modes.js` | Orange runners, red grunts, purple tanks |
| **Leaderboard demo** (`leaderboard`, extends `zombie`) | `js/modes/leaderboard.js` | Mock global scoreboard on game over (not live) |

Each mode saves its own high score in your browser (`stickmanCommandoHighScore_<id>`).

## Scripts

Load order matters (`index.html`): `audio → gore → characters → shared → xl-mode → modes/registry → modes/* → game`.

Core banners: use `g.showBanner(text, seconds)` — it is ticked centrally in `game.js` (`tickBanner`). Do not use raw `setTimeout` for banners.

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
