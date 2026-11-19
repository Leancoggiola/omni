import { clearLastGymPlan, readLastGymPlan, saveLastGymPlan } from './lastGymPlan';

jest.mock('expo-secure-store', () => jest.requireActual('@/test/secureStoreMock'));

const secure = jest.requireMock<typeof import('@/test/secureStoreMock')>('expo-secure-store');

beforeEach(() => {
  secure.store.clear();
  jest.clearAllMocks();
});

describe('lastGymPlan', () => {
  it('guarda y lee el plan por persona', async () => {
    await saveLastGymPlan('maria', 'plan-1');

    expect(await readLastGymPlan('maria')).toBe('plan-1');
    expect(await readLastGymPlan('juan')).toBeNull();
  });

  it('null olvida el plan guardado', async () => {
    await saveLastGymPlan('maria', 'plan-1');
    await saveLastGymPlan('maria', null);

    expect(await readLastGymPlan('maria')).toBeNull();
  });

  it('borrar solo borra el plan de esa persona', async () => {
    await saveLastGymPlan('maria', 'plan-1');
    await saveLastGymPlan('juan', 'plan-2');

    await clearLastGymPlan('maria');

    expect(await readLastGymPlan('maria')).toBeNull();
    expect(await readLastGymPlan('juan')).toBe('plan-2');
  });

  it('un fallo de SecureStore se lee como sin plan y no tira al guardar', async () => {
    secure.getItemAsync.mockRejectedValueOnce(new Error('keystore'));
    secure.setItemAsync.mockRejectedValueOnce(new Error('keystore'));

    expect(await readLastGymPlan('maria')).toBeNull();
    await expect(saveLastGymPlan('maria', 'plan-1')).resolves.toBeUndefined();
  });
});
