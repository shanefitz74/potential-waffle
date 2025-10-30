import { Ghost } from "./Ghost.js";
import { GHOST_BASE_SPEED } from "../constants.js";

const GLITCH_TYPES = {
  static: { variant: "static", color: "#a36bff", speed: GHOST_BASE_SPEED * 0.9 },
  neon: { variant: "neon", color: "#ff4fd8", speed: GHOST_BASE_SPEED * 1.05 },
  crystal: { variant: "crystal", color: "#5fe0ff", speed: GHOST_BASE_SPEED },
  inferno: { variant: "inferno", color: "#ff7830", speed: GHOST_BASE_SPEED * 1.1 },
};

export class Glitch extends Ghost {
  constructor(maze, options = {}, random = Math.random) {
    const preset = GLITCH_TYPES[options.kind ?? "static"] ?? GLITCH_TYPES.static;
    super(
      maze,
      {
        ...options,
        color: options.color ?? preset.color,
        name: options.name ?? options.kind ?? preset.variant,
        spawn: options.spawn,
      },
      random,
    );
    this.kind = preset.variant;
    this.baseSpeed = preset.speed;
    this.syncSpeed();
  }
}
