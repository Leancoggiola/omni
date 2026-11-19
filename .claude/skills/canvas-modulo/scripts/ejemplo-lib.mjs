/**
 * Parciales de ejemplo (Gimnasio) para generar boards .dc.html: boardFile, darkWrapper y piezas om-* / gy-*. Copiar a un directorio de trabajo y adaptar las clases del módulo.
 */

export const PATHS = {
  back: "M15 6l-6 6 6 6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  close: "M6 6l12 12M18 6 6 18",
  dumbbell: "M4 9v6M8 7v10M16 7v10M20 9v6M8 12h8",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  pencil: "M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4",
  archive: "M4 7h16v4H4zM6 11v9h12v-9M10 15h4",
  unarchive: "M4 7h16v4H4zM6 11v9h12v-9M12 18v-5M9.5 15.5 12 13l2.5 2.5",
  sort: "M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4",
  moveday: "M4 12h14M13 7l5 5-5 5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  chevd: "m6 9 6 6 6-6",
  chevr: "m9 6 6 6-6 6",
  check: "M5 12.5l4.5 4.5L19 7",
  handle: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  refresh:
    "M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5",
  wifioff:
    "M3 3l18 18M8.5 8.5A9 9 0 0 1 21 12M5 12a9 9 0 0 1 2.6-3.4M9 16a4 4 0 0 1 6 0M12 20h.01",
  search: "M11 17a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM20 20l-4.5-4.5",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  media: "M3 5h18v14H3zM10 9l5 3-5 3z",
  pantry: "M4 7h16v13H4zM8 7V4h8v3",
  wallet: "M4 6h16v12H4zM4 10h16M8 15h3",
  pc: "M3 5h18v11H3zM8 20h8M12 16v4",
  split:
    "M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c.6-3 3-4.5 6-4.5s5.4 1.5 6 4.5M15 15c2.6-.4 5 .8 5.6 3.5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  admin:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1",
  moon: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
};

export function ic(name, size = 24, extra = "") {
  const sz = size === 24 ? "" : ` width="${size}" height="${size}"`;
  const st = extra ? ` style="${extra}"` : "";
  const d = PATHS[name];
  if (!d) throw new Error("ícono desconocido: " + name);
  return `<svg class="om-icon" aria-hidden="true" viewBox="0 0 24 24"${sz}${st}><path d="${d}"></path></svg>`;
}

export const alertIcon = (size = 24) =>
  `<svg class="om-icon" aria-hidden="true" viewBox="0 0 24 24"${size === 24 ? "" : ` width="${size}" height="${size}"`}><circle cx="12" cy="12" r="9"></circle><path d="M12 8v5M12 16.5v.5"></path></svg>`;
export const infoIcon = (size = 24) =>
  `<svg class="om-icon" aria-hidden="true" viewBox="0 0 24 24"${size === 24 ? "" : ` width="${size}" height="${size}"`}><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 7.5v.5"></path></svg>`;

const HELMET_STYLE = `
          body {
            margin: 0;
          }
          a {
            color: inherit;
          }
          a:hover {
            color: inherit;
          }
          a.om-btn--filled.om-link,
          a.om-btn--filled.om-link:hover {
            color: var(--on-primary-fill);
          }
          a.om-btn--light.om-link,
          a.om-btn--light.om-link:hover {
            color: var(--on-primary-surface);
          }
          a.om-btn--outline.om-link,
          a.om-btn--outline.om-link:hover,
          a.om-btn--subtle.om-link,
          a.om-btn--subtle.om-link:hover {
            color: var(--primary);
          }
          a.om-btn--destructive.om-btn--filled.om-link,
          a.om-btn--destructive.om-btn--filled.om-link:hover {
            color: var(--on-destructive-fill);
          }
          a.om-btn--destructive.om-btn--outline.om-link,
          a.om-btn--destructive.om-btn--outline.om-link:hover {
            color: var(--destructive);
          }
          a.om-fab.om-link,
          a.om-fab.om-link:hover {
            color: var(--on-primary-fill);
          }
          a.om-iconbtn--light.om-link,
          a.om-iconbtn--light.om-link:hover {
            color: var(--on-primary-surface);
          }
          a.om-iconbtn--filled.om-link,
          a.om-iconbtn--filled.om-link:hover {
            color: var(--on-primary-fill);
          }
          a.om-tab.om-link {
            color: var(--text-muted);
          }
          a.om-tab[aria-current="page"].om-link {
            color: var(--on-primary-surface);
          }
          a.gy-action--danger,
          a.gy-action--danger:hover {
            color: var(--destructive);
          }
          a.om-navitem--soon.om-link {
            color: var(--text-muted);
          }
          a.om-navitem[aria-current="page"].om-link {
            color: var(--on-primary-surface);
          }`;

const FONTS =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&amp;family=Montserrat:wght@400;500;600;700&amp;display=swap" />';

/** Archivo base de un board: `inner` va dentro de <x-dc>. `w`/`h` solo para $preview. */
export function boardFile({ title, inner, w, h }) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <script src="./support.js"></script>
    <link rel="stylesheet" href="./omni-theme.css" />
    <link rel="stylesheet" href="./gym.css" />
  </head>
  <body>
    <x-dc>
      <helmet>
        ${FONTS}
        <style>${HELMET_STYLE}
        </style>
      </helmet>
${inner}
    </x-dc>
    <script
      type="text/x-dc"
      data-dc-script
      data-props='{"tema":{"editor":"enum","options":["light","dark"],"default":"light"},"$preview":{"width":${w},"height":${h}}}'
    >
      class Component extends DCLogic {
        renderVals() {
          var tema = this.props.tema ?? 'light';
          return { tema: tema, sfx: tema === 'dark' ? '-oscuro' : '' };
        }
      }
    </script>
  </body>
</html>
`;
}

/** Wrapper "-oscuro": importa el board base con tema=dark. */
export function darkWrapper({ base, title, w, h }) {
  const fill =
    w === "100%"
      ? "width: 100%; min-height: " + h + "px"
      : `width: ${w}px; height: ${h}px`;
  const hint = w === "100%" ? `100%,${h}px` : `${w}px,${h}px`;
  const pw = w === "100%" ? 1440 : w;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title} (oscuro)</title>
    <script src="./support.js"></script>
    <link rel="stylesheet" href="./omni-theme.css" />
    <link rel="stylesheet" href="./gym.css" />
  </head>
  <body>
    <x-dc>
      <helmet>
        <style>
          body {
            margin: 0;
          }
        </style>
      </helmet>
      <div data-theme="{{tema}}" style="${fill}">
        <dc-import name="${base}" tema="{{tema}}" hint-size="${hint}"></dc-import>
      </div>
    </x-dc>
    <script
      type="text/x-dc"
      data-dc-script
      data-props='{"tema":{"editor":"enum","options":["light","dark"],"default":"dark"},"$preview":{"width":${pw},"height":${h}}}'
    >
      class Component extends DCLogic {
        renderVals() {
          return { tema: this.props.tema ?? 'dark' };
        }
      }
    </script>
  </body>
</html>
`;
}


/** Botón <a> (navega entre boards) o <button>. kind: filled|outline|light|subtle; dest: true = destructivo. */
export function btn({
  label,
  kind = "filled",
  href,
  size = "",
  full = false,
  dest = false,
  icon = "",
  disabled = false,
  aria = "",
}) {
  const cls = [
    "om-btn",
    `om-btn--${kind}`,
    size && `om-btn--${size}`,
    full && "om-btn--full",
    dest && "om-btn--destructive",
  ]
    .filter(Boolean)
    .join(" ");
  const ico = icon
    ? ic(icon, 16, kind === "filled" ? "stroke-width: 2.4" : "")
    : "";
  const a = aria ? ` aria-label="${aria}"` : "";
  if (href && !disabled)
    return `<a class="${cls} om-link" href="${href}"${a}>${ico}${label}</a>`;
  return `<button type="button" class="${cls}"${disabled ? " disabled" : ""}${a}>${ico}${label}</button>`;
}

export function field({
  id,
  label,
  value = "",
  placeholder = "",
  req = false,
  maxlength,
  error = "",
  counter = "",
  type = "text",
  hint = "",
  extra = "",
}) {
  const lbl = `<label class="om-label" for="${id}">${label}${req ? ' <span class="om-req" aria-hidden="true">*</span>' : ""}</label>`;
  const head = counter
    ? `<div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px">${lbl}<span class="gy-count">${counter}</span></div>`
    : lbl;
  const ml = maxlength ? ` maxlength="${maxlength}"` : "";
  const err = error ? ` aria-invalid="true" aria-describedby="${id}-e"` : "";
  const cls = "om-input" + (error ? " om-input--error" : "");
  return `<div class="om-field">${head}<input class="${cls}" id="${id}" type="${type}"${ml} value="${value}" placeholder="${placeholder}"${err}${extra} />${error ? `<span class="om-error" id="${id}-e" role="alert">${error}</span>` : ""}${hint ? `<span class="om-desc">${hint}</span>` : ""}</div>`;
}

export function select({
  id,
  label,
  options,
  selected,
  req = false,
  disabledSet = [],
  disabledLabel = "ya tiene ejercicios",
  hint = "",
  error = "",
}) {
  const opts = options
    .map((o) => {
      const dis = disabledSet.includes(o);
      return `<option${o === selected ? " selected" : ""}${dis ? " disabled" : ""}>${o}${dis ? " · " + disabledLabel : ""}</option>`;
    })
    .join("");
  return `<div class="om-field"><label class="om-label" for="${id}">${label}${req ? ' <span class="om-req" aria-hidden="true">*</span>' : ""}</label><div class="gy-select"><select class="om-input${error ? " om-input--error" : ""}" id="${id}">${opts}</select>${ic("chevd", 16)}</div>${hint ? `<span class="om-desc">${hint}</span>` : ""}</div>`;
}

export const DAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function banner(kind, text, { strong = "", role, action = "" } = {}) {
  const r = role ?? (kind === "destructive" ? "alert" : "status");
  const icon =
    kind === "warning"
      ? ic("archive")
      : kind === "destructive"
        ? alertIcon()
        : infoIcon();
  const body = strong
    ? `<div><strong>${strong}</strong><p>${text}</p>${action}</div>`
    : `<div style="flex: 1; min-width: 0"><p>${text}</p>${action}</div>`;
  return `<div class="om-banner om-banner--${kind}" role="${r}">${icon}${body}</div>`;
}


export function mHeader({
  a,
  b,
  sub,
  back = "Main{{sfx}}.dc.html",
  menu = "",
}) {
  return `<header class="om-header" style="align-items: center">
  <a class="om-iconbtn om-iconbtn--glass om-link" href="${back}" aria-label="Volver">${ic("back")}</a>
  <div class="om-header__titles"><h1 class="om-display om-display-md">${a} <em>${b}</em></h1><span class="om-header__sub">${sub}</span></div>${menu}
</header>`;
}

export const moreBtn = (href, label) =>
  `<a class="om-iconbtn om-iconbtn--glass om-link" href="${href}" aria-label="${label}">${ic("more", 24, "stroke-width: 3")}</a>`;

export function planChip(name = "Fuerza 3 días") {
  return `<a class="om-chip om-link" href="Planes{{sfx}}.dc.html" aria-label="Cambiar de plan" style="align-self: flex-start">${name}${ic("chevd", 16)}</a>`;
}

const WD = [
  ["Lun", "Lunes"],
  ["Mar", "Martes"],
  ["Mié", "Miércoles"],
  ["Jue", "Jueves"],
  ["Vie", "Viernes"],
  ["Sáb", "Sábado"],
  ["Dom", "Domingo"],
];
export function weekStrip(on = [0, 2, 4]) {
  return `<div class="gy-week" role="list" aria-label="Días con ejercicios">${WD.map((d, i) => `<span class="gy-wd${on.includes(i) ? " gy-wd--on" : ""}" role="listitem" aria-label="${d[1]}${on.includes(i) ? ", con ejercicios" : ", sin ejercicios"}">${d[0]}<i></i></span>`).join("")}</div>`;
}

export const exMeta = (sets, reps) =>
  (sets ? (sets === 1 ? "1 serie" : sets + " series") + " · " : "") +
  reps +
  (/^\d+$/.test(reps) ? " repeticiones" : "");

export function mRow({
  name,
  sets,
  reps,
  kg,
  ro = false,
  href = "",
  kgHref = "Peso{{sfx}}.dc.html",
}) {
  const meta = exMeta(sets, reps);
  const chip = ro
    ? `<a class="gy-kgbadge om-link" href="Pe-m-solo-lectura{{sfx}}.dc.html" aria-label="Ver historial de ${name}">${kg === null ? "Sin peso" : kg + " kg"}</a>`
    : `<a class="om-chip${kg === null ? " om-chip--dashed" : ""} om-link" href="${kgHref}" aria-label="${kg === null ? "Cargar peso de " + name : "Peso de " + name + ": " + kg + " kilos"}">${kg === null ? "Cargar peso" : kg + " kg"}</a>`;
  const body = href
    ? `<a class="gy-body om-link" href="${href}" aria-label="Opciones de ${name}"><span class="gy-name">${name}</span><span class="gy-meta">${meta}</span></a>`
    : `<span class="gy-body"><span class="gy-name">${name}</span><span class="gy-meta">${meta}</span></span>`;
  return `<div class="om-card om-card--solid gy-row"><span class="gy-tile" aria-hidden="true">${ic("dumbbell", 22)}</span>${body}${chip}</div>`;
}

const DAYS_DATA = [
  {
    label: "Lunes",
    items: [
      ["Sentadilla", 4, "12", "60"],
      ["Press de banca", 4, "10", "40"],
      ["Remo con barra", 3, "10", "35"],
    ],
  },
  {
    label: "Miércoles",
    items: [
      ["Peso muerto", 3, "8", "80"],
      ["Dominadas", 3, "AMRAP", null],
      ["Plancha", 3, "60 s", null],
    ],
  },
  {
    label: "Viernes",
    items: [
      ["Sentadilla", 4, "12", "60"],
      ["Press militar", 3, "10", "25"],
    ],
  },
];

/** Lista por días del plan (fondo de hojas y menús). opts: ro, dayMenu (href del ⋯ del día), rowMenu (href al tocar la fila). */
export function mDays({
  ro = false,
  dayMenu = "",
  rowMenu = "",
  only = null,
} = {}) {
  const days = only
    ? DAYS_DATA.filter((d) => only.includes(d.label))
    : DAYS_DATA;
  return `<div class="gy-list">${days
    .map(
      (d) =>
        `<section class="gy-group" aria-label="${d.label}"><div class="gy-dayhead"><span class="om-overline">${d.label}</span><span style="display: flex; align-items: center; gap: 4px"><span class="gy-count">${d.items.length} ejercicios</span>${dayMenu && !ro ? `<a class="om-iconbtn om-iconbtn--sm om-link" href="${dayMenu}" aria-label="Opciones del ${d.label.toLowerCase()}">${ic("more", 20, "stroke-width: 3")}</a>` : ""}</span></div>${d.items.map((i) => mRow({ name: i[0], sets: i[1], reps: i[2], kg: i[3], ro, href: rowMenu && !ro ? rowMenu : "" })).join("")}</section>`,
    )
    .join("")}</div>`;
}

/** Pantalla completa del plan como fondo: header + chip + semana + días. */
export function mPlanScreen({
  ro = false,
  menuHref = "",
  dayMenu = "",
  rowMenu = "",
  title = ["Tu", "gimnasio"],
  sub = "3 días · 8 ejercicios",
  fab = true,
  only = null,
} = {}) {
  return `<div class="gy-stack">
${mHeader({ a: title[0], b: title[1], sub: ro ? "Archivado · " + sub : sub, menu: menuHref ? moreBtn(menuHref, "Acciones del plan") : "" })}
${planChip()}
${ro ? banner("warning", "Solo podés mirarlo. Para editarlo, desarchivalo.", { strong: "Plan archivado" }) : ""}
${weekStrip()}
${mDays({ ro, dayMenu, rowMenu, only })}
</div>
${fab && !ro ? `<div class="om-fabdock" style="bottom: 32px"><a class="om-fab om-link" href="Agregar{{sfx}}.dc.html">${ic("plus", 24, "stroke-width: 2.4")}Agregar ejercicio</a></div>` : ""}`;
}

export function mScreen(inner, { aria = "" } = {}) {
  return `      <div class="om-screen" data-theme="{{tema}}"${aria}>
${inner}
      </div>`;
}

export const scrim = () => '<div class="om-scrim" aria-hidden="true"></div>';

/** Hoja inferior. head: HTML del encabezado (usar sheetHead). */
export function sheet({ id, head, body, foot = "", gap = 16 }) {
  return `${scrim()}<section class="om-sheet gy-sheet" role="dialog" aria-modal="true" aria-labelledby="${id}" style="gap: ${gap}px"><span class="om-sheet__grabber" aria-hidden="true"></span>${head}${body}${foot}</section>`;
}

export function sheetHead({
  id,
  title,
  sub = "",
  close = "Main{{sfx}}.dc.html",
  tile = false,
}) {
  const t = `<h2 class="om-display om-display-md" id="${id}">${title}</h2>${sub ? `<span class="om-caption">${sub}</span>` : ""}`;
  const left = tile
    ? `<div style="display: flex; align-items: center; gap: 12px; min-width: 0"><span class="gy-tile" aria-hidden="true">${ic("dumbbell", 22)}</span><div style="min-width: 0">${t}</div></div>`
    : `<div style="min-width: 0">${t}</div>`;
  return `<div class="gy-sheethead">${left}<a class="om-iconbtn om-iconbtn--light om-link" href="${close}" aria-label="Cerrar">${ic("close")}</a></div>`;
}

/** Lista de acciones de una hoja (menú). items: {label, sub, icon, href, danger}. */
export function actionList(items) {
  return `<div class="gy-actions">${items
    .map(
      (i) =>
        `<a class="gy-action om-link${i.danger ? " gy-action--danger" : ""}" href="${i.href}"><span class="gy-action__ic">${ic(i.icon, 20)}</span><span style="flex: 1; min-width: 0">${i.label}${i.sub ? `<small>${i.sub}</small>` : ""}</span></a>`,
    )
    .join("")}</div>`;
}

/** confirm() mobile: tarjeta centrada, botones apilados. */
export function mConfirm({
  id,
  title,
  text,
  extra = "",
  confirmLabel,
  cancelHref = "Main{{sfx}}.dc.html",
  okHref = "Main{{sfx}}.dc.html",
  dest = true,
}) {
  return `${scrim()}<section class="gy-confirm" role="alertdialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="${id}-d"><span class="gy-confirm__ic${dest ? "" : " gy-confirm__ic--brand"}" aria-hidden="true">${dest ? ic("trash", 24) : ic("archive", 24)}</span><h2 class="om-display om-display-md" id="${id}">${title}</h2><p class="gy-confirm__text" id="${id}-d">${text}</p>${extra}<div style="display: flex; flex-direction: column; gap: 12px; margin-top: 8px">${btn({ label: confirmLabel, kind: "filled", href: okHref, full: true, size: "lg", dest })}${btn({ label: "Cancelar", kind: "outline", href: cancelHref, full: true, size: "lg" })}</div></section>`;
}

export function toast(kind, title, text = "", extraStyle = "") {
  const ico = kind === "success" ? ic("check", 20) : alertIcon(20);
  return `<div class="om-toast om-toast--${kind}" role="${kind === "error" ? "alert" : "status"}" style="max-width: none;${extraStyle}"><span class="om-toast__dot">${ico}</span><div style="min-width: 0"><strong>${title}</strong>${text ? `<span>${text}</span>` : ""}</div></div>`;
}

export const mToasts = (html) => `<div class="gy-toasts">${html}</div>`;

export function mTabbar(active = "Más") {
  const tabs = [
    ["Inicio", "home"],
    ["Media", "media"],
    ["Alacena", "pantry"],
    ["Más", "more"],
  ];
  return `<nav class="om-tabdock" aria-label="Principal"><div class="om-tabbar">${tabs
    .map(
      (t) =>
        `<a class="om-tab om-link" href="#"${t[0] === active ? ' aria-current="page"' : ""}><span class="om-tab__pill">${ic(t[1], 22, t[1] === "more" ? "stroke-width: 3" : "")}</span>${t[0]}</a>`,
    )
    .join("")}</div></nav>`;
}

export function state({
  icon = "dumbbell",
  title,
  text,
  buttons = "",
  error = false,
  pad = 48,
}) {
  const ico = error ? alertIcon(28) : ic(icon, 28);
  return `<div class="om-state" style="padding-top: ${pad}px" role="${error ? "alert" : "status"}"><span class="om-state__icon${error ? " om-state__icon--error" : ""}">${ico}</span><h2 class="om-state__title">${title}</h2>${text ? `<p class="om-state__text">${text}</p>` : ""}${buttons}</div>`;
}

export function skelRows(n = 3) {
  const w = ["180px", "140px", "200px", "160px"];
  return Array.from(
    { length: n },
    (_, i) =>
      `<div class="om-card om-card--solid gy-row"><span class="om-skel" style="width: 44px; height: 44px; flex: none"></span><span class="gy-body"><span class="om-skel" style="height: 20px; max-width: ${w[i % 4]}"></span><span class="om-skel" style="height: 16px; max-width: 140px"></span></span></div>`,
  ).join("");
}


const NAV = [
  ["Inicio", "home", false],
  ["Películas", "media", false],
  ["Gimnasio", "dumbbell", false],
  ["Gastos", "wallet", true],
  ["PC Control", "pc", true],
  ["Alacena", "pantry", false],
  ["Dividir gastos", "split", false],
  ["Perfil", "user", false],
];

export function wNavbar({ gymSoon = false } = {}) {
  return `<aside class="om-navbar" aria-label="Módulos" style="flex: 1 1 240px; max-width: 304px; width: auto; align-self: flex-start">
<div style="display: flex; align-items: center; gap: 12px; padding: 0 8px 16px; border-bottom: 1px solid var(--hairline); margin-bottom: 8px"><img src="./logo.png" alt="" width="44" height="44" style="border-radius: 50%" /><div style="display: flex; flex-direction: column"><span class="om-display om-display-md">Omni</span><span class="om-caption">Hub personal</span></div></div>
<nav aria-label="Principal" style="display: flex; flex-direction: column; gap: 4px">${NAV.map(
    (n) => {
      const soon = n[2] || (gymSoon && n[0] === "Gimnasio");
      const cur = n[0] === "Gimnasio" && !gymSoon;
      return `<a class="om-navitem om-link${soon ? " om-navitem--soon" : ""}" href="${n[0] === "Gimnasio" && !soon ? "Web-plan{{sfx}}.dc.html" : "#"}"${cur ? ' aria-current="page"' : ""}${soon ? ' aria-disabled="true"' : ""}><span class="om-navitem__icon">${ic(n[1])}</span><span style="flex: 1">${n[0]}</span>${soon ? '<span class="om-badge om-badge--dimmed">Pronto</span>' : ""}</a>`;
    },
  ).join(
    "",
  )}<span class="om-overline" style="padding: 12px 8px 4px">Admin</span><a class="om-navitem om-link" href="#"><span class="om-navitem__icon">${ic("admin")}</span><span style="flex: 1">Administración</span></a></nav>
<div style="margin-top: 12px; padding: 12px; border-radius: var(--radius-lg); background: var(--surface); border: 1px solid var(--hairline); display: flex; align-items: center; gap: 12px"><span class="om-avatar">AG</span><div style="display: flex; flex-direction: column; flex: 1; min-width: 0"><span style="font-size: 14px; line-height: 20px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">Ana Gómez</span><span class="om-caption" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis">ana@ejemplo.com</span></div><button type="button" class="om-iconbtn" aria-label="Cambiar tema">${ic("moon")}</button><button type="button" class="om-iconbtn" aria-label="Cerrar sesión">${ic("logout")}</button></div>
</aside>`;
}

/** Cabecera web: título + acciones (HTML). */
export function wHeader({
  sub = "Tus planes por día de la semana y el peso de cada ejercicio",
  actions = "",
  title = ["Tu", "gimnasio"],
}) {
  return `<header style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px"><div style="display: flex; align-items: center; gap: 16px; min-width: 0"><span class="om-iconbtn om-iconbtn--light" aria-hidden="true" style="width: 56px; height: 56px; border-radius: var(--radius-lg); cursor: default">${ic("dumbbell", 26)}</span><div class="om-header__titles"><h1 class="om-display om-display-xl">${title[0]} <em>${title[1]}</em></h1><span class="om-header__sub">${sub}</span></div></div>${actions ? `<div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; position: relative">${actions}</div>` : ""}</header>`;
}

export const wMoreBtn = (href, label, pressed = false) =>
  `<a class="om-iconbtn om-link" href="${href}" aria-label="${label}" aria-haspopup="menu" aria-expanded="${pressed}" style="${pressed ? "background: var(--primary-surface); color: var(--on-primary-surface)" : ""}">${ic("more", 24, "stroke-width: 3")}</a>`;

/** Menú desplegable web (Mantine Menu). items: {label, icon, href, danger, sep}. */
export function wMenu(items, { style = "", label = "Acciones" } = {}) {
  return `<div class="gy-menu" role="menu" aria-label="${label}" style="${style}">${items
    .map((i) =>
      i.sep
        ? '<hr class="om-divider" style="margin: 4px 0" />'
        : `<a class="gy-menu__item om-link${i.danger ? " gy-menu__item--danger" : ""}" role="menuitem" href="${i.href}">${ic(i.icon, 18)}<span>${i.label}</span></a>`,
    )
    .join("")}</div>`;
}

export function wStats({ days = 3, ex = 8, nokg = 2 } = {}) {
  const s = (n, l) =>
    `<div class="om-card gy-wstat" role="group" aria-label="${n} ${l}"><span class="gy-wstat__n">${n}</span><span class="gy-wstat__l">${l}</span></div>`;
  return `<div class="gy-wstats">${s(days, "Días de entrenamiento")}${s(ex, "Ejercicios")}${s(nokg, "Sin peso cargado")}</div>`;
}

export function wToolbar({ plan = "Fuerza 3 días", archived = false } = {}) {
  return `<div class="om-card gy-wtoolbar"><div class="gy-wselect"><label class="om-sr" for="w-plan">Plan</label><select class="om-input" id="w-plan"><option>${plan}</option><option>Hipertrofia</option><option>Vuelta a la rutina</option></select>${ic("chevd", 16)}</div><div class="om-segmented" role="tablist" aria-label="Estado del plan" style="min-width: 260px"><button type="button" role="tab" aria-selected="${!archived}">Activos</button><button type="button" role="tab" aria-selected="${archived}">Archivados</button></div></div>`;
}

export function wRow({
  name,
  sets,
  reps,
  kg,
  ro = false,
  menu = "",
  menuOpen = "",
}) {
  const meta = exMeta(sets, reps);
  const chip = ro
    ? `<a class="gy-kgbadge om-link" href="Peso-w-solo-lectura{{sfx}}.dc.html" aria-label="Ver historial de ${name}">${kg === null ? "Sin peso" : kg + " kg"}</a>`
    : `<a class="om-chip${kg === null ? " om-chip--dashed" : ""} om-link" href="Web-peso{{sfx}}.dc.html" aria-label="${kg === null ? "Cargar peso de " + name : "Peso de " + name + ": " + kg + " kilos"}">${kg === null ? "Cargar peso" : kg + " kg"}</a>`;
  const kebab = ro
    ? ""
    : `<span style="position: relative"><a class="om-iconbtn om-link" href="${menu || "#"}" aria-label="Opciones de ${name}" aria-haspopup="menu" style="${menuOpen ? "background: var(--primary-surface); color: var(--on-primary-surface)" : ""}">${ic("more", 24, "stroke-width: 3")}</a>${menuOpen}</span>`;
  return `<div class="gy-wrow"><span class="gy-tile" aria-hidden="true">${ic("dumbbell", 22)}</span><span class="gy-body"><span class="gy-name">${name}</span><span class="gy-meta">${meta}</span></span>${chip}${kebab}</div>`;
}

/** Tarjeta de día web. mode: 'normal' | 'order' (modo ordenar). */
export function wDayCard({
  label,
  items,
  ro = false,
  menu = "",
  rowMenu = "",
  rowMenuOpen = "",
  mode = "normal",
  orderError = "",
  orderDisabled = false,
  menuOpen = "",
}) {
  const head =
    mode === "order"
      ? `<div class="gy-wcardhead"><div><h2 class="om-display om-display-md">${label}</h2><span class="om-caption">Ordená con las flechas</span></div><div style="display: flex; gap: 8px">${btn({ label: "Cancelar", kind: "outline", size: "sm", href: "Web-plan{{sfx}}.dc.html" })}${btn({ label: "Guardar orden", kind: "filled", size: "sm", href: "Web-plan{{sfx}}.dc.html", disabled: orderDisabled })}</div></div>`
      : `<div class="gy-wcardhead"><div><h2 class="om-display om-display-md">${label}</h2><span class="om-caption">${items.length} ejercicios</span></div>${ro ? "" : `<span style="position: relative">${wMoreBtn(menu || "#", "Opciones del " + label.toLowerCase())}${menuOpen}</span>`}</div>`;
  const rows = items
    .map((i, idx) => {
      if (mode === "order") {
        const up = idx === 0;
        const dn = idx === items.length - 1;
        return `<div class="gy-wrow"><span class="gy-body"><span class="gy-name">${i[0]}</span><span class="gy-meta">${exMeta(i[1], i[2])}</span></span><button type="button" class="om-iconbtn om-iconbtn--light" aria-label="Subir ${i[0]}" aria-disabled="${up}" style="opacity: ${up ? ".4" : "1"}">${ic("up")}</button><button type="button" class="om-iconbtn om-iconbtn--light" aria-label="Bajar ${i[0]}" aria-disabled="${dn}" style="opacity: ${dn ? ".4" : "1"}">${ic("down")}</button></div>`;
      }
      return wRow({
        name: i[0],
        sets: i[1],
        reps: i[2],
        kg: i[3],
        ro,
        menu: rowMenu,
        menuOpen: idx === 0 ? rowMenuOpen : "",
      });
    })
    .join("");
  return `<section class="om-card om-card--solid gy-wcard" aria-label="${label}">${head}${orderError}${rows}</section>`;
}

export const DAYS_WEB = DAYS_DATA;

export function wPage(main, { overlay = "", gymSoon = false } = {}) {
  return `      <div class="om-page" data-theme="{{tema}}" style="position: relative; display: flex; flex-wrap: wrap; gap: 24px; padding: 16px">
${wNavbar({ gymSoon })}
<main style="flex: 999 1 640px; min-width: 0; display: flex; flex-direction: column; gap: 24px; padding: 16px 8px 32px 0">
${main}
</main>
${overlay}
      </div>`;
}

/** Overlay modal web: top = padding superior. */
export function wOverlay(inner, top = 96) {
  return `<div style="position: absolute; inset: 0; background: var(--overlay); display: flex; align-items: flex-start; justify-content: center; padding: ${top}px 16px 16px">${inner}</div>`;
}

export function wModal({
  id,
  title,
  sub = "",
  body,
  foot,
  tile = false,
  max = "",
}) {
  const t = `<h2 class="om-display om-display-md" id="${id}">${title}</h2>${sub ? `<span class="om-caption">${sub}</span>` : ""}`;
  const head = tile
    ? `<div style="display: flex; align-items: center; gap: 12px; min-width: 0"><span class="gy-tile" aria-hidden="true">${ic("dumbbell", 22)}</span><div style="min-width: 0">${t}</div></div>`
    : `<div style="min-width: 0">${t}</div>`;
  return `<section class="gy-modal" role="dialog" aria-modal="true" aria-labelledby="${id}"${max ? ` style="max-width: ${max}px"` : ""}><div class="gy-sheethead">${head}</div>${body}<div class="gy-modal__foot">${foot}</div></section>`;
}

/** Alertdialog web (patrón al-modal de Alacena): título + texto + Cancelar/Confirmar a la derecha. */
export function wAlert({
  id,
  title,
  text,
  extra = "",
  confirmLabel,
  okHref = "Web-plan{{sfx}}.dc.html",
  cancelHref = "Web-plan{{sfx}}.dc.html",
  dest = true,
  icon = "trash",
}) {
  return `<section class="gy-dialog" role="alertdialog" aria-modal="true" aria-labelledby="${id}" aria-describedby="${id}-d"><div style="display: flex; gap: 16px; align-items: flex-start"><span class="gy-confirm__ic${dest ? "" : " gy-confirm__ic--brand"}" aria-hidden="true">${ic(icon, 24)}</span><div style="display: flex; flex-direction: column; gap: 8px; min-width: 0"><h2 class="om-display om-display-md" id="${id}">${title}</h2><p class="gy-confirm__text" style="text-align: left" id="${id}-d">${text}</p>${extra}</div></div><div class="gy-modal__foot">${btn({ label: "Cancelar", kind: "outline", href: cancelHref })}${btn({ label: confirmLabel, kind: "filled", href: okHref, dest })}</div></section>`;
}

export const wToasts = (html) => `<div class="gy-wtoasts">${html}</div>`;

export function wFullState({
  icon = "dumbbell",
  title,
  text,
  buttons = "",
  error = false,
}) {
  return `<div class="om-card" style="max-width: 520px; align-self: center; width: 100%; margin-top: 24px"><div class="om-state" role="${error ? "alert" : "status"}"><span class="om-state__icon${error ? " om-state__icon--error" : ""}">${error ? alertIcon(28) : ic(icon, 28)}</span><h2 class="om-state__title">${title}</h2>${text ? `<p class="om-state__text" style="max-width: 360px">${text}</p>` : ""}<div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 8px">${buttons}</div></div></div>`;
}
