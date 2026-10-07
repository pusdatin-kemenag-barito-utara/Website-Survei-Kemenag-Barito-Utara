process.env.ASTRO_DEV_BACKGROUND = 'false';
import('./node_modules/astro/dist/cli/index.js').then(m => m.cli(['', '', 'dev', '--port', '3000', '--host']));
