// v2 Test Suite — verify modules load and initialize
const path = require('path');
const fs = require('fs');

console.log('=== Nebula v2 Test Suite ===\n');

const ROOT = path.resolve(__dirname, '..');

const modules = [
  'js/v2/core/config.js',
  'js/v2/core/utils.js',
  'js/v2/core/GameLoop.js',
  'js/v2/core/Pool.js',
  'js/v2/core/SpatialGrid.js',
  'js/v2/core/MenuScreen.js',
  'js/v2/render/StarField.js',
  'js/v2/render/NebulaBackground.js',
  'js/v2/render/BloomPass.js',
  'js/v2/render/ScreenFX.js',
  'js/v2/render/ShipRenderer.js',
  'js/v2/entities/Player.js',
  'js/v2/entities/Enemy.js',
  'js/v2/entities/Bullet.js',
  'js/v2/entities/Scrap.js',
  'js/v2/entities/Particles.js',
  'js/v2/systems/AudioManager.js',
  'js/v2/systems/MusicEngine.js',
  'js/v2/systems/SfxEngine.js',
  'js/v2/ui/Menu.js',
  'js/v2/main.js',
];

let errors = 0;
let warnings = 0;

for (const mod of modules) {
  const fullPath = path.join(ROOT, mod);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ MISSING: ${mod}`);
    errors++;
    continue;
  }
  console.log(`✓ ${mod}`);
}

console.log(`\nErrors: ${errors}, Warnings: ${warnings}`);
console.log(errors > 0 ? 'FAIL' : 'PASS');
process.exit(errors > 0 ? 1 : 0);
