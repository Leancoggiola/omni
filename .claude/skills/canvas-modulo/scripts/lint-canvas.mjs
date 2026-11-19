/**
 * Lint de un canvas de Omni contra el Design System. Solo lectura.
 *
 * Uso: node lint-canvas.mjs <carpeta project/ del canvas> [--theme omni-theme.css] [--module gym.css]
 *
 * `--theme` y `--module` se resuelven contra la carpeta `project/` (`path.resolve`), y también aceptan rutas absolutas.
 *
 * Revisa: índice (canvas.json), pares claro/oscuro, links entre boards, clases `om-*` y del módulo que no existen,
 * `var(--token)` sin definir, colores sueltos, emoji, botones de ícono sin aria-label, handlers en div/span,
 * huecos `{{...}}` con expresiones, y el contraste AA (4,5:1) de los pares de texto del theme en claro y oscuro.
 * Las clases y variables definidas son las del theme, las del módulo y las del `<style>` dentro de `<helmet>` de cada board.
 * Un `om-*` que no está en el theme pero sí en el módulo o en un `<style>` inline es un aviso (el theme es del DS).
 * Un link con un hueco dinámico que no es `{{sfx}}` no se puede resolver y se omite. Un board que importa el mismo
 * board con `tema="light"` y con `tema="dark"` ya trae su par y no necesita wrapper `-oscuro`.
 * Sale con código 1 si hay errores.
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = path.resolve(args[0] ?? '.');
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const themeFile = path.resolve(dir, opt('--theme', 'omni-theme.css'));
const moduleFile = opt('--module', null) ? path.resolve(dir, opt('--module')) : null;

const errors = [];
const warns = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warns.push(`${file}: ${msg}`);

const index = JSON.parse(fs.readFileSync(path.join(dir, 'canvas.json'), 'utf8'));
const files = fs.readdirSync(dir).filter(f => f.endsWith('.dc.html'));
const boardKeys = new Set(Object.keys(index.boards));
const sources = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));

/** Nombres de board que `src` importa con `tema="light"` y con `tema="dark"` a la vez. */
const importsBothThemes = src => {
  const themes = {};
  for (const m of src.matchAll(/<dc-import\b[^>]*>/g)) {
    const name = m[0].match(/\bname="([^"]+)"/)?.[1];
    const tema = m[0].match(/\btema="(light|dark)"/)?.[1];
    if (name && tema) (themes[name] ??= new Set()).add(tema);
  }
  return Object.values(themes).some(s => s.size === 2);
};

if (index.v !== 3) err('canvas.json', `v debería ser 3 y es ${index.v}`);
for (const key of boardKeys) if (!files.includes(key)) warn('canvas.json', `board sin archivo local: ${key}`);
for (const f of files)
  if (!boardKeys.has(f)) err(f, 'archivo .dc.html que no está en canvas.json (igual se muestra en el canvas)');
const order = new Set(index.order);
for (const key of boardKeys) if (!order.has(key)) err('canvas.json', `board fuera de "order": ${key}`);

const pages = new Set((index.pages ?? []).map(p => p.id));
for (const [key, b] of Object.entries(index.boards)) {
  if (b.page && !pages.has(b.page)) err('canvas.json', `${key}: página inexistente "${b.page}"`);
  if (!key.endsWith('-oscuro.dc.html')) {
    const dark = key.replace('.dc.html', '-oscuro.dc.html');
    if (!boardKeys.has(dark) && !(sources[key] && importsBothThemes(sources[key])))
      err('canvas.json', `${key}: falta el wrapper ${dark}`);
  } else {
    const light = key.replace('-oscuro.dc.html', '.dc.html');
    if (!boardKeys.has(light)) err('canvas.json', `${key}: falta el board base ${light}`);
  }
}
for (const id of Object.keys(index.notes ?? {})) {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) err('canvas.json', `id de nota inválido: ${id}`);
  const n = index.notes[id];
  if (n.w && n.text && n.text.length > 900)
    warn('canvas.json', `nota ${id} de ${n.text.length} caracteres: puede quedar con scroll`);
}
const byPage = {};
for (const [key, b] of Object.entries(index.boards))
  (byPage[b.page ?? pages.values().next().value] ??= []).push({ key, ...b });
for (const [page, list] of Object.entries(byPage)) {
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
        err('canvas.json', `boards superpuestos en ${page}: ${a.key} y ${b.key}`);
    }
}

const readCss = file => (file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '');
const themeCss = readCss(themeFile);
const moduleCss = readCss(moduleFile);
const classesOf = css => new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
const varsOf = css => new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const inlineStyles = src => [...src.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const themeClasses = classesOf(themeCss);
const sharedClasses = new Set([...themeClasses, ...classesOf(moduleCss)]);
const sharedVars = new Set([...varsOf(themeCss), ...varsOf(moduleCss)]);

for (const f of files) {
  const src = sources[f];
  const inline = inlineStyles(src);
  const inlineClasses = classesOf(inline);
  const definedClasses = new Set([...sharedClasses, ...inlineClasses]);
  const definedVars = new Set([...sharedVars, ...varsOf(inline)]);
  if (!src.includes('<script src="./support.js"></script>'))
    err(f, 'falta la línea <script src="./support.js"></script>');
  if (!/<html lang="es"/.test(src)) warn(f, 'html sin lang="es"');
  for (const m of src.matchAll(/\{\{([^}]*)\}\}/g))
    if (/[+\-*/!()?<>=&|]/.test(m[1].trim())) err(f, `hueco con expresión {{${m[1]}}}`);
  for (const m of src.matchAll(/class="([^"]*)"/g)) {
    if (m[1].includes('{{')) continue;
    for (const c of m[1].split(/\s+/).filter(Boolean)) {
      if (!definedClasses.has(c)) err(f, `clase sin definir: ${c}`);
      else if (c.startsWith('om-') && !themeClasses.has(c))
        warn(f, `clase ${c} con prefijo om- que no es del theme (el prefijo es del Design System)`);
    }
  }
  for (const m of src.matchAll(/var\((--[\w-]+)/g)) if (!definedVars.has(m[1])) err(f, `variable sin definir: ${m[1]}`);
  for (const m of src.matchAll(/(?:style="[^"]*|<style>[^<]*)(#[0-9a-fA-F]{3,8})\b/g))
    err(f, `color suelto ${m[1]} (usar var(--token))`);
  if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src.replace(/[↔→←↑↓×·«»“”‘’…—–✓]/g, '')))
    err(f, 'emoji en el markup');
  for (const m of src.matchAll(/<(a|button)\b[^>]*class="[^"]*om-iconbtn[^"]*"[^>]*>/g))
    if (!/aria-label=/.test(m[0])) err(f, 'botón de ícono sin aria-label');
  if (/<(div|span)\b[^>]*(onclick|role="button")/i.test(src))
    err(f, 'handler o role="button" en div/span (usar <button> o <a href>)');
  for (const m of src.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) warn(f, 'img sin alt');
  for (const m of src.matchAll(/href="([^"#]+\.dc\.html)"/g)) {
    const dynamic = [...m[1].matchAll(/\{\{([^}]*)\}\}/g)].some(h => h[1].trim() !== 'sfx');
    if (dynamic) continue;
    const targets = [m[1].replaceAll('{{sfx}}', ''), m[1].replaceAll('{{sfx}}', '-oscuro')];
    for (const t of targets) if (!boardKeys.has(t.replace(/^\//, ''))) err(f, `link a un board que no existe: ${t}`);
  }
  for (const m of src.matchAll(/font-size:\s*(\d+)px/g))
    if (Number(m[1]) < 12) warn(f, `font-size ${m[1]}px (mínimo 12)`);
}

if (moduleCss) {
  for (const m of moduleCss.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) err(path.basename(moduleFile), `color suelto ${m[0]}`);
  for (const m of moduleCss.matchAll(/\b(rgba?|hsla?)\(/g))
    warn(path.basename(moduleFile), `${m[1]}() literal: preferir un token`);
}

const hexToRgb = hex => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  if (h.length !== 6) return null;
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
};
const lum = ([r, g, b]) => {
  const f = v => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const blockOf = selectorRe => {
  const m = themeCss.match(selectorRe);
  if (!m) return {};
  const tokens = {};
  for (const t of m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[t[1]] = t[2].trim();
  return tokens;
};
const light = blockOf(/:root,\s*\[data-theme="light"\]\s*\{([^}]*)\}/);
const dark = { ...light, ...blockOf(/\[data-theme="dark"\]\s*\{([^}]*)\}/) };
const resolve = (tokens, name, depth = 0) => {
  const v = tokens[name];
  if (!v || depth > 6) return null;
  const alias = v.match(/^var\((--[\w-]+)\)$/);
  if (alias) return resolve(tokens, alias[1], depth + 1);
  return v.startsWith('#') ? hexToRgb(v) : null;
};
const PAIRS = [
  ['--text', '--canvas'],
  ['--text', '--surface'],
  ['--text-muted', '--canvas'],
  ['--text-muted', '--surface'],
  ['--on-primary-fill', '--primary-fill'],
  ['--on-primary-surface', '--primary-surface'],
  ['--primary', '--surface'],
  ['--on-destructive-fill', '--destructive-fill'],
  ['--destructive', '--surface'],
  ['--destructive', '--destructive-surface'],
  ['--success', '--success-surface'],
  ['--accent', '--accent-surface'],
  ['--info', '--info-surface'],
  ['--warning', '--warning-surface'],
  ['--text-muted', '--disabled-surface'],
];
let checked = 0;
for (const [label, tokens] of [
  ['claro', light],
  ['oscuro', dark],
]) {
  for (const [fg, bg] of PAIRS) {
    const a = resolve(tokens, fg);
    const b = resolve(tokens, bg);
    if (!a || !b) continue;
    checked++;
    const r = ratio(a, b);
    if (r < 4.5) warn('omni-theme.css', `contraste ${r.toFixed(2)}:1 en ${label}: ${fg} sobre ${bg} (mínimo 4,5)`);
  }
}

console.log(`Boards: ${boardKeys.size} · archivos: ${files.length} · pares de contraste revisados: ${checked}`);
const uniq = list => [...new Set(list)];
for (const e of uniq(errors)) console.log('ERROR ' + e);
for (const w of uniq(warns)) console.log('AVISO ' + w);
console.log(`${uniq(errors).length} errores, ${uniq(warns).length} avisos`);
process.exit(errors.length ? 1 : 0);
