import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';
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

describe('Chip', () => {
  it('es un checkbox que alterna su estado', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <Chip checked={false} onChange={onChange}>
        Películas
      </Chip>
    );

    fireEvent.press(screen.getByRole('checkbox', { name: 'Películas', checked: false }));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(
      <Chip checked onChange={onChange}>
        Películas
      </Chip>
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Películas', checked: true }));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it('deshabilitado no cambia', () => {
    const onChange = jest.fn();
    render(
      <Chip checked={false} onChange={onChange} disabled>
        Series
      </Chip>
    );

    fireEvent.press(screen.getByRole('checkbox', { name: 'Series', disabled: true }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
