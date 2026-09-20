/**
 * Register Deno-style `npm:` remapping for Node (tests / local tooling).
 * Use: node --import ./scripts/registerNpmSpecifierLoader.mjs ...
 */
import { register } from 'node:module';

register('./npmSpecifierLoader.mjs', import.meta.url);
