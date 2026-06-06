# Stickman Commando

A simple top-down browser shooter. Move with arrow keys, shoot with spacebar, survive the stickman horde.

Play locally by opening `index.html`, or deploy to [GitHub Pages](https://pages.github.com/) from the `main` branch (root `/`).

## Controls

| Key | Action |
|-----|--------|
| ↑ ↓ ← → | Move (also sets aim direction) |
| Space | Shoot |
| Space / Click | Start / redeploy |

## Demo modes

After the intro sting, pick a demo from the grid:

| Mode | What to try |
|------|-------------|
| **Arena** | Original top-down endless survival |
| **Side-scroll** | Run, jump, shoot — enemies march from the right |
| **Enemy fire** | Red stickmen shoot back — dodge their bullets |
| **Waves** | Clear a wave, breather, next wave |
| **Medkits** | Green crosses drop on kills — walk over to heal |
| **Enemy types** | Orange runners, red grunts, purple tanks |
| **Leaderboard demo** | Mock global scoreboard on game over (not live) |

Each mode saves its own high score in your browser.

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
