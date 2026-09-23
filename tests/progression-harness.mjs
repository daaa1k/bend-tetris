import Rules from "../game.bend";
import { createPlayerProgression } from "../player-progression.mjs";
window.createActualProgression = (seed, time) => createPlayerProgression(Rules, seed, time);
