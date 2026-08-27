import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf8');
const layoutSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/components/layout/AppLayout.jsx'),
  'utf8'
);
const sharedSrc = fs.readFileSync(
  path.resolve(__dirname, '../src/pages/SharedCase.jsx'),
  'utf8'
);

describe('iPhone 17 / Air camera-safe layout', () => {
  test('defines camera and safe-area CSS tokens', () => {
    assert.match(css, /--safe-top:\s*env\(safe-area-inset-top/);
    assert.match(css, /--safe-bottom:\s*env\(safe-area-inset-bottom/);
    assert.match(css, /--camera-inset-top:/);
    assert.match(css, /--nav-h:/);
    assert.match(css, /--sheet-offset:/);
  });

  test('iPhone Air 420×912 @3x bumps camera inset to 68px', () => {
    assert.match(css, /device-width:\s*420px/);
    assert.match(css, /device-height:\s*912px/);
    assert.match(css, /-webkit-device-pixel-ratio:\s*3/);
    assert.match(css, /--camera-inset-top:\s*68px/);
  });

  test('viewport fallback (width/height 420×912) also sets 68px inset', () => {
    assert.match(css, /@media\s*\(width:\s*420px\)\s*and\s*\(height:\s*912px\)/);
  });

  test('camera-dead-zone blocks touch', () => {
    assert.match(css, /\.camera-dead-zone\s*\{[^}]*pointer-events:\s*none/);
    assert.match(css, /\.camera-dead-zone\s*\{[^}]*touch-action:\s*none/);
    assert.match(css, /\.touch-below-camera/);
  });

  test('root uses 100dvh', () => {
    assert.match(css, /html[\s\S]*height:\s*100dvh/);
  });

  test('SharedCase loading/error shells use h-dvh not h-screen', () => {
    assert.match(sharedSrc, /h-dvh/);
    assert.ok(!sharedSrc.includes('h-screen'), 'SharedCase must not use h-screen');
  });

  test('AppLayout stacks dead zone above interactive chrome', () => {
    assert.match(layoutSrc, /camera-dead-zone/);
    assert.match(layoutSrc, /touch-below-camera/);
    assert.match(layoutSrc, /h-dvh/);
    const deadIdx = layoutSrc.indexOf('camera-dead-zone');
    const touchIdx = layoutSrc.indexOf('touch-below-camera');
    assert.ok(deadIdx >= 0 && touchIdx > deadIdx);
  });
});
