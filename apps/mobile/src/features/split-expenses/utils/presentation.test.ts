import { API_KEYS } from '@/shared/api/keys';

import { gatheringDetail } from '../fixtures';
import {
  buildShareMessage,
  describeFriendBalance,
  describeLastExpense,
  describeTransfers,
  formatLastExpenseTime,
  gatheringTotals,
  toneForName,
} from './presentation';
import { isSplitKey } from './splitKeys';

jest.mock('@/shared/api', () => jest.requireActual('@/shared/api/keys'));

const local = (day: number, hours = 13, minutes = 20) => new Date(2026, 9, day, hours, minutes);

describe('gatheringTotals', () => {
  it('cuenta las personas o dice que estás solo', () => {
    expect(gatheringTotals({ participantCount: 4, totalAmount: 96000 })).toBe('4 personas · $96.000,00');
    expect(gatheringTotals({ participantCount: 1, totalAmount: 0 })).toBe('Solo vos · $0,00');
  });
});

describe('describeLastExpense', () => {
  const base = { participantName: 'Ana Gómez', amount: 10, description: null, createdAt: '' };

  it('nombra a quien pagó, o "Vos", y suple el detalle vacío', () => {
    expect(describeLastExpense({ ...base, isSelf: false })).toBe('Ana Gómez: Gasto sin detalle · $10,00');
    expect(describeLastExpense({ ...base, isSelf: true, description: 'Hielo' })).toBe('Vos: Hielo · $10,00');
  });
});

describe('formatLastExpenseTime', () => {
  const now = local(18, 20);

  it('de hoy muestra la hora', () => {
    expect(formatLastExpenseTime(local(18).toISOString(), now)).toBe('13:20');
  });

  it('dentro de la semana muestra el día', () => {
    expect(formatLastExpenseTime(local(12).toISOString(), now)).toBe('lun');
  });

  it('más viejo muestra la fecha', () => {
    expect(formatLastExpenseTime(local(11).toISOString(), now)).toBe('11/10');
  });
});

describe('toneForName', () => {
  it('es estable para un mismo nombre', () => {
    expect(toneForName('Martín')).toBe(toneForName('Martín'));
  });
});

describe('describeFriendBalance', () => {
  it('dice el saldo contra el grupo', () => {
    expect(describeFriendBalance(750)).toEqual({ label: 'Le deben $750,00', tone: 'success' });
    expect(describeFriendBalance(-12500)).toEqual({ label: 'Debe $12.500,00', tone: 'accent' });
    expect(describeFriendBalance(0)).toEqual({ label: 'Al día', tone: 'success' });
  });
});

describe('describeTransfers', () => {
  const [settlement] = gatheringDetail().settlements;

  it('cuenta las transferencias y suma su total', () => {
    expect(describeTransfers([settlement!])).toBe('1 transferencia · $13.500,00');
    expect(describeTransfers([settlement!, settlement!])).toBe('2 transferencias · $27.000,00');
  });

  it('sin transferencias nadie debe', () => {
    expect(describeTransfers([])).toBe('Nadie le debe nada a nadie.');
  });
});

describe('buildShareMessage', () => {
  it('resume la juntada con los nombres reales de todos', () => {
    expect(buildShareMessage(gatheringDetail())).toBe(
      [
        'Asado del sábado · 18/10',
        '2 personas · $27.000,00',
        '',
        'Cómo se saldan las cuentas:',
        'Ana Gómez → Martín: $13.500,00',
      ].join('\n')
    );
  });

  it('sin transferencias lo dice', () => {
    expect(buildShareMessage(gatheringDetail({ settlements: [] }))).toContain('Nadie le debe nada a nadie.');
  });
});

describe('isSplitKey', () => {
  const { splitExpenses } = API_KEYS;

  it.each([
    `${splitExpenses.gatherings}?page=1&limit=50`,
    splitExpenses.gathering('g1'),
    splitExpenses.balance,
    splitExpenses.friends,
  ])('%s es del módulo', key => {
    expect(isSplitKey(key)).toBe(true);
  });

  it('las keys de otros módulos y las que no son texto no', () => {
    expect(isSplitKey(API_KEYS.media.list)).toBe(false);
    expect(isSplitKey(['x'])).toBe(false);
  });
});
