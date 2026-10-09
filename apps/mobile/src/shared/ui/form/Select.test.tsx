import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { actionSheet } from '../actionSheet/actionSheet';
import { Select } from './Select';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));
jest.mock('../actionSheet/actionSheet', () => ({ actionSheet: jest.fn() }));

const mockActionSheet = jest.mocked(actionSheet);

const DATA = [
  { value: 'all', label: 'Todos' },
  { value: 'movie', label: 'Películas' },
  { value: 'tv', label: 'Series' },
] as const;

type Value = (typeof DATA)[number]['value'];

describe('Select', () => {
  beforeEach(() => mockActionSheet.mockReset());

  it('muestra el valor actual y lo anuncia con el nombre del campo', () => {
    render(<Select<Value> data={DATA} value="movie" onChange={jest.fn()} accessibilityLabel="Tipo" />);

    expect(screen.getByText('Películas')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tipo: Películas' })).toBeTruthy();
  });

  it('abre el actionSheet con las opciones y la actual, y avisa la elegida', async () => {
    mockActionSheet.mockResolvedValue('tv');
    const onChange = jest.fn();
    render(<Select<Value> data={DATA} value="all" onChange={onChange} label="Tipo" />);

    await act(async () => fireEvent.press(screen.getByRole('button', { name: 'Tipo: Todos' })));

    expect(mockActionSheet).toHaveBeenCalledWith({ title: 'Tipo', options: DATA, value: 'all' });
    expect(onChange).toHaveBeenCalledWith('tv');
  });

  it('cancelar o elegir la misma opción no llama a onChange', async () => {
    const onChange = jest.fn();
    render(<Select<Value> data={DATA} value="all" onChange={onChange} accessibilityLabel="Tipo" />);
    const trigger = screen.getByRole('button', { name: 'Tipo: Todos' });

    mockActionSheet.mockResolvedValueOnce(null);
    await act(async () => fireEvent.press(trigger));
    mockActionSheet.mockResolvedValueOnce('all');
    await act(async () => fireEvent.press(trigger));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('deshabilitado no abre las opciones', () => {
    render(<Select<Value> data={DATA} value="all" onChange={jest.fn()} accessibilityLabel="Tipo" disabled />);

    fireEvent.press(screen.getByRole('button', { name: 'Tipo: Todos' }));
    expect(mockActionSheet).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Tipo: Todos' })).toBeDisabled();
  });
});
