export const SCAN_REPEAT_WINDOW_MS = 2000;

export type ScanGate = {
  accept: (code: string, now: number) => boolean;
  release: (now: number) => void;
  touch: (now: number) => void;
};

/**
 * Filtro de las lecturas de la cámara, que reporta el mismo código en cada cuadro mientras está a la vista. `accept`
 * deja pasar un código y cierra la puerta hasta `release` (no se procesan dos a la vez). El mismo código que el último
 * se rechaza mientras se lo siga viendo: cada lectura repetida corre la ventana de `windowMs`, así que para sumarlo de
 * nuevo hay que sacarlo de cuadro un momento. Otro código pasa apenas se libera. `touch` corre la ventana sin una
 * lectura: se llama cuando la cámara vuelve a estar lista, porque mientras estuvo apagada no hubo lecturas que la
 * corran y el producto que quedó en cuadro se sumaría otra vez.
 */
export function createScanGate(windowMs = SCAN_REPEAT_WINDOW_MS): ScanGate {
  let locked = false;
  let lastCode: string | null = null;
  let lastSeenAt = Number.NEGATIVE_INFINITY;

  return {
    accept(code, now) {
      if (locked) return false;
      if (code === lastCode && now - lastSeenAt < windowMs) {
        lastSeenAt = now;
        return false;
      }
      locked = true;
      lastCode = code;
      lastSeenAt = now;
      return true;
    },
    release(now) {
      locked = false;
      lastSeenAt = now;
    },
    touch(now) {
      lastSeenAt = now;
    },
  };
}
