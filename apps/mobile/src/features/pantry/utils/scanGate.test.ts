import { createScanGate, SCAN_REPEAT_WINDOW_MS } from './scanGate';

const COKE = '7790895000997';
const OREO = '7622210449283';

describe('createScanGate', () => {
  it('deja pasar un código y cierra la puerta hasta liberarla', () => {
    const gate = createScanGate();

    expect(gate.accept(COKE, 0)).toBe(true);
    expect(gate.accept(OREO, 10)).toBe(false);
    gate.release(20);
    expect(gate.accept(OREO, 30)).toBe(true);
  });

  it('rechaza el mismo código mientras se lo siga viendo y lo acepta tras sacarlo de cuadro', () => {
    const gate = createScanGate();
    gate.accept(COKE, 0);
    gate.release(100);

    expect(gate.accept(COKE, 100 + SCAN_REPEAT_WINDOW_MS - 1)).toBe(false);
    expect(gate.accept(COKE, 100 + SCAN_REPEAT_WINDOW_MS * 2 - 2)).toBe(false);
    expect(gate.accept(COKE, 100 + SCAN_REPEAT_WINDOW_MS * 3 + 10)).toBe(true);
  });

  it('la ventana corre desde que se libera, no desde la primera lectura', () => {
    const gate = createScanGate(1000);
    gate.accept(COKE, 0);
    gate.release(5000);

    expect(gate.accept(COKE, 5500)).toBe(false);
  });

  it('otro código pasa apenas se libera', () => {
    const gate = createScanGate();
    gate.accept(COKE, 0);
    gate.release(1);

    expect(gate.accept(OREO, 2)).toBe(true);
  });

  it('touch corre la ventana del último código sin una lectura', () => {
    const gate = createScanGate(1000);
    gate.accept(COKE, 0);
    gate.release(0);
    gate.touch(5000);

    expect(gate.accept(COKE, 5500)).toBe(false);
    expect(gate.accept(OREO, 5600)).toBe(true);
  });
});
