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
  it('marca el valor actual y cambia al tocar otro', () => {
    const onChange = jest.fn();
    render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} accessibilityLabel="Estado" />);

    expect(screen.getByRole('radio', { name: 'Todos', checked: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Vista', checked: false })).toBeTruthy();

    fireEvent.press(screen.getByRole('radio', { name: 'Vista' }));
    expect(onChange).toHaveBeenCalledWith('watched');
  });

  it('tocar el activo no vuelve a avisar', () => {
    const onChange = jest.fn();
    render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} />);

    fireEvent.press(screen.getByRole('radio', { name: 'Todos' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('acepta strings como data, igual que Mantine', () => {
    const onChange = jest.fn();
    render(<SegmentedControl data={['Claro', 'Oscuro', 'Sistema']} value="Claro" onChange={onChange} />);

    fireEvent.press(screen.getByRole('radio', { name: 'Sistema' }));
    expect(onChange).toHaveBeenCalledWith('Sistema');
  });

  it('deshabilitado no cambia', () => {
    const onChange = jest.fn();
    render(<SegmentedControl data={STATUSES} value="all" onChange={onChange} disabled />);

    fireEvent.press(screen.getByRole('radio', { name: 'Vista', disabled: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
