// v2 → v1 compat shim: restores the old globals the v1 scripts expect.
// Used by the legacy index-v1.html page only. The main v2 entry (js/v2/main.js)
// imports modules directly and never touches this file.
// Re-exports the same constants/functions so old scripts run unchanged.

import { CONFIG, ENEMY_TYPES, NUM_ENEMY_TYPES, RENDER, SHIPS, WEAPONS } from './core/config.js';
import { rand, randInt, clamp, dist, angleTo, lerp } from './core/utils.js';
import { Pool } from './core/Pool.js';
import { SpatialGrid } from './core/SpatialGrid.js';
import { StarField } from '../render/StarField.js';
import { Input } from './core/Input.js';
import { MenuScreen } from '../ui/Menu.js';

// Re-export as globals for legacy scripts
window.CONFIG = CONFIG;
window.rand = rand;
window.randInt = randInt;
window.clamp = clamp;
window.dist = dist;
window.angleTo = angleTo;
window.lerp = lerp;
window.Pool = Pool;
window.SpatialGrid = SpatialGrid;
window.StarField = StarField;
window.Input = Input;
window.MenuScreen = MenuScreen;
window.ENEMY_TYPES = ENEMY_TYPES;
window.NUM_ENEMY_TYPES = NUM_ENEMY_TYPES;
