# APE ASCENT: Ironworks

A polished, self-contained browser arcade game built with HTML5 Canvas, CSS, and vanilla JavaScript.

This is an **original early-1980s arcade tribute**. It recreates the classic single-screen climbing, ladder, rolling-hazard, rescue, hammer, score, lives, and bonus-timer gameplay loop without using Nintendo code, names, characters, music, sprites, or other copyrighted assets.

## Play

After this branch is merged and GitHub Pages is enabled, the game can run at:

`https://shanefitz74.github.io/potential-waffle/`

You can also download `index.html` and open it directly in a modern browser. No build step, package manager, server, or external asset download is required.

## Features

- Four escalating arcade stages
- Sloped steel girders and climbable ladders
- Rolling barrels that can fall or descend ladders
- Conveyor platforms and roaming fire hazards
- Hammer power-up, particles, screen shake, scoring, lives, and timed bonuses
- Persistent local high score
- Procedurally drawn original characters and effects
- Synthesized Web Audio sound effects
- Keyboard, gamepad, touchscreen, fullscreen, and mute controls
- Responsive arcade-cabinet interface for desktop and mobile
- Zero dependencies and zero external assets

## Controls

| Action | Keyboard | Gamepad / Touch |
|---|---|---|
| Move | Arrow keys or WASD | D-pad / left stick / on-screen D-pad |
| Climb | Up/Down or W/S | D-pad / left stick |
| Jump | Space, Z, or J | A button / red on-screen button |
| Start/Pause | Enter or P | On-screen Start button |
| Mute | M | Sound button |
| Fullscreen | — | Full button |

## Development

The complete game is intentionally contained in `index.html` so it is easy to inspect, modify, host locally, or deploy as a static site.

Basic local server:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Originality and trademark notice

APE ASCENT: Ironworks, Rivet, Nova, Brassback, all artwork, sound effects, level layouts, and code in this project are original. Donkey Kong and Nintendo are trademarks of their respective owners and are not affiliated with this project.
