import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from './SegmentedControl';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

const STATUSES = [
  { value: 'all', label: 'Todos' },
  { value: 'to_watch', label: 'Pendiente' },
  { value: 'watched', label: 'Vista' },
] as const;

describe('SegmentedControl', () => {
  it('marca el valor actual y cambia al tocar otro', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} accessibilityLabel="Estado" />);

    expect(screen.getByRole('radio', { name: 'Todos', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Vista', checked: false })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Vista' }));
    expect(onChange).toHaveBeenCalledWith('watched');
  });

  it('las etiquetas no son seleccionables: Android las recortaría en un segmento del ancho justo (#328)', async () => {
    await render(<SegmentedControl data={STATUSES} value="all" onChange={jest.fn()} />);
    expect(screen.getByText('Pendiente')).toHaveProp('userSelect', 'none');
  });

  it('tocar el activo no vuelve a avisar', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Todos' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('acepta strings como data, igual que Mantine', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl data={['Claro', 'Oscuro', 'Sistema']} value="Claro" onChange={onChange} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Sistema' }));
    expect(onChange).toHaveBeenCalledWith('Sistema');
  });

  it('deshabilitado no cambia', async () => {
    const onChange = jest.fn();
    await render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} disabled />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Vista', disabled: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
