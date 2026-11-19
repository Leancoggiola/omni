/**
 * Ejemplo de build: escribe cada board y su wrapper "-oscuro", calcula posiciones (fila clara arriba, oscura abajo) y arma canvas.json con páginas y notas.
 * Las rutas SP/OUT y los imports (boards, layout) son del caso Gimnasio: adaptar.
 */
import fs from "node:fs";
import path from "node:path";
import { BOARDS } from "./boards.mjs";
import "./boards-estados.mjs";
import { boardFile, darkWrapper } from "./lib.mjs";
import { PAGES_NEW, ESTADOS_ROWS, NOTES_EXTRA } from "./layout.mjs";

const SP =
  "/private/tmp/claude-502/-Users-leonardocoggiola-Proyectos-omni/fc331231-85e3-4345-9da7-592cf54fdbc5/scratchpad";
const OUT = path.join(SP, "canvas/project");
const orig = JSON.parse(
  fs.readFileSync(
    path.join(
      SP,
      "artifact-files/d40bc4e9-e331-4bcf-897f-795584ffc352/project/canvas.json",
    ),
    "utf8",
  ),
);

const byId = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
const used = new Set();
const written = [];
const TALL = new Set(["Pl-w-archivado", "Peso-w-solo-lectura", "Er-w-archivado-409", "Di-w-ordenar-409"]);
const dim = (kind, id) => (kind === "m" ? { w: 390, h: 844 } : { w: 1440, h: TALL.has(id) ? 1120 : 980 });

function writeBoard(b) {
  const { w, h } = dim(b.kind, b.id);
  const inner = b.build();
  fs.writeFileSync(
    path.join(OUT, `${b.id}.dc.html`),
    boardFile({ title: `Gimnasio · ${b.title}`, inner, w, h }),
  );
  fs.writeFileSync(
    path.join(OUT, `${b.id}-oscuro.dc.html`),
    darkWrapper({
      base: b.id,
      title: `Gimnasio · ${b.title}`,
      w: b.kind === "m" ? 390 : "100%",
      h,
    }),
  );
  written.push(`${b.id}.dc.html`, `${b.id}-oscuro.dc.html`);
}

let rowCounter = 0;
const boards = { ...orig.boards };
const order = [...orig.order];
const notes = { ...orig.notes };
const pages = [...orig.pages];

/** Coloca una fila (claro arriba, oscuro abajo) y devuelve el y siguiente. */
function placeRow({ page, kind, ids, label, y, noteList = [], noteX }) {
  const { w } = dim(kind, "");
  const h = Math.max(...ids.map((i) => dim(kind, i).h));
  const width = ids.length * (w + 80) - 80;
  const yDark = y + h + 360;
  const key = `${page.slice(0, 10)}-r${++rowCounter}`;
  ids.forEach((id, i) => {
    const b = byId[id];
    if (!b) throw new Error("board inexistente: " + id);
    if (used.has(id)) throw new Error("board repetido: " + id);
    used.add(id);
    writeBoard(b);
    boards[`${id}.dc.html`] = {
      x: i * (w + 80),
      y,
      w,
      h: dim(kind, id).h,
      page,
      title: b.title,
      is_interactive: true,
    };
    boards[`${id}-oscuro.dc.html`] = {
      x: i * (w + 80),
      y: yDark,
      w,
      h: dim(kind, id).h,
      page,
      title: b.title,
      is_interactive: true,
    };
    order.push(`${id}.dc.html`, `${id}-oscuro.dc.html`);
  });
  notes[`t-${key}-c`] = {
    x: 0,
    y: y - 240,
    text: `${label} · claro`,
    kind: "title1",
    maxW: width,
    page,
  };
  notes[`t-${key}-o`] = {
    x: 0,
    y: yDark - 240,
    text: `${label} · oscuro`,
    kind: "title1",
    maxW: width,
    page,
  };
  noteList.forEach((text, i) => {
    notes[`n-${key}-${i}`] = {
      x: noteX ?? width + 80,
      y: y + i * 620,
      w: 380,
      text,
      page,
    };
  });
  return yDark + h + 360;
}

for (const p of PAGES_NEW) {
  pages.push({ id: p.id, name: p.name });
  let y = 0;
  for (const r of p.rows)
    y = placeRow({
      page: p.id,
      kind: r.kind,
      ids: r.ids,
      label: r.label,
      y,
      noteList: r.notes ?? [],
    });
}
let y = 5100;
for (const r of ESTADOS_ROWS)
  y = placeRow({
    page: "estados",
    kind: r.kind,
    ids: r.ids,
    label: r.label,
    y,
    noteList: r.notes ?? [],
    noteX: r.noteX,
  });
for (const [id, n] of Object.entries(NOTES_EXTRA)) notes[id] = n;

const unused = BOARDS.filter((b) => !used.has(b.id));
if (unused.length)
  throw new Error("boards sin ubicar: " + unused.map((b) => b.id).join(", "));

const out = { ...orig, pages, boards, order, notes };
fs.writeFileSync(path.join(OUT, "canvas.json"), JSON.stringify(out, null, 2));
fs.writeFileSync(
  path.join(SP, "written.json"),
  JSON.stringify(written, null, 1),
);
console.log(`boards nuevos: ${BOARDS.length} (${written.length} archivos)`);
