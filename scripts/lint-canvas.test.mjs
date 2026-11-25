import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../.claude/skills/canvas-modulo/scripts/lint-canvas.mjs',
);

const THEME = ':root, [data-theme="light"] { --text: #111111; --canvas: #ffffff; }\n.om-card { color: var(--text); }\n';

let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-canvas-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Arma un `project/` temporal: `boards` es `{ archivo: html }`; `extra` son archivos sueltos (CSS). */
function project(boards, extra = {}) {
  const entries = Object.fromEntries(
    Object.keys(boards).map((key, i) => [key, { x: i * 2000, y: 0, w: 390, h: 844, page: 'p' }]),
  );
  fs.writeFileSync(
    path.join(dir, 'canvas.json'),
    JSON.stringify({ v: 3, pages: [{ id: 'p' }], boards: entries, order: Object.keys(boards) }),
  );
  fs.writeFileSync(path.join(dir, 'omni-theme.css'), THEME);
  for (const [name, html] of Object.entries(boards)) fs.writeFileSync(path.join(dir, name), html);
  for (const [name, content] of Object.entries(extra)) fs.writeFileSync(path.join(dir, name), content);
}

/** Board mínimo válido con `head` extra (helmet) y `body` dentro de `<x-dc>`. */
function board({ helmet = '', body = '' } = {}) {
  return `<!doctype html>
<html lang="es"><head><script src="./support.js"></script></head>
<body><x-dc>${helmet ? `<helmet><style>${helmet}</style></helmet>` : ''}${body}</x-dc></body></html>`;
}

const wrapper = base =>
  board({ body: `<dc-import name="${base}" tema="{{tema}}"></dc-import>` });

/** Corre el lint y devuelve `{ status, out }`. */
function lint(...extra) {
  const r = spawnSync('node', [script, dir, ...extra], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout };
}

describe('lint-canvas', () => {
  it('toma las clases y variables del <style> dentro de <helmet>', () => {
    project({
      'A.dc.html': board({ helmet: '.lg-box { color: var(--lg-ink); } :root { --lg-ink: var(--text); }', body: '<div class="lg-box om-card"></div>' }),
      'A-oscuro.dc.html': wrapper('A'),
    });
    const { status, out } = lint();
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /sin definir/);
  });

  it('sigue marcando una clase que no está en ningún CSS', () => {
    project({
      'A.dc.html': board({ body: '<div class="fantasma"></div>' }),
      'A-oscuro.dc.html': wrapper('A'),
    });
    const { status, out } = lint();
    assert.equal(status, 1);
    assert.match(out, /clase sin definir: fantasma/);
  });

  it('omite un href con un hueco dinámico distinto de {{sfx}}', () => {
    project({
      'A.dc.html': board({ body: '<a href="{{volver}}{{sfx}}.dc.html">x</a><a href="Rota{{sfx}}.dc.html">y</a>' }),
      'A-oscuro.dc.html': wrapper('A'),
    });
    const { out } = lint();
    assert.doesNotMatch(out, /volver/);
    assert.match(out, /link a un board que no existe: Rota\.dc\.html/);
  });

  it('no exige wrapper -oscuro si el board importa el mismo board en light y dark', () => {
    project({
      'Compartida.dc.html': board({
        body: '<dc-import name="Base" tema="light"></dc-import><dc-import name="Base" tema="dark"></dc-import>',
      }),
      'Base.dc.html': board(),
      'Base-oscuro.dc.html': wrapper('Base'),
    });
    const { status, out } = lint();
    assert.equal(status, 0, out);
    assert.doesNotMatch(out, /falta el wrapper/);
  });

  it('exige wrapper -oscuro si no importa ambos temas', () => {
    project({ 'A.dc.html': board() });
    const { status, out } = lint();
    assert.equal(status, 1);
    assert.match(out, /falta el wrapper A-oscuro\.dc\.html/);
  });

  it('acepta --theme y --module como rutas absolutas fuera de project/', () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-canvas-css-'));
    try {
      fs.writeFileSync(path.join(other, 'theme.css'), THEME);
      fs.writeFileSync(path.join(other, 'mod.css'), '.md-x { color: var(--text); }\n');
      project({
        'A.dc.html': board({ body: '<div class="md-x om-card"></div>' }),
        'A-oscuro.dc.html': wrapper('A'),
      });
      fs.rmSync(path.join(dir, 'omni-theme.css'));
      const { status, out } = lint('--theme', path.join(other, 'theme.css'), '--module', path.join(other, 'mod.css'));
      assert.equal(status, 0, out);
    } finally {
      fs.rmSync(other, { recursive: true, force: true });
    }
  });

  it('avisa (no error) un om-* que no es del theme', () => {
    project({
      'A.dc.html': board({ helmet: '.om-hl-mark { color: var(--text); }', body: '<span class="om-hl-mark"></span>' }),
      'A-oscuro.dc.html': wrapper('A'),
    });
    const { status, out } = lint();
    assert.equal(status, 0, out);
    assert.match(out, /AVISO .*om-hl-mark.*no es del theme/);
  });
});
