import { fireEvent, render, screen } from '@testing-library/react-native';
import { TextInput } from 'react-native';

import { FormFields, FormScrollProvider } from './FormContext';
import { PasswordField } from './PasswordField';
import { TextField } from './TextField';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

afterEach(() => focusSpy.mockClear());

/** Label del campo que recibió el último `focus()`. */
function focusedLabel() {
  return (focusSpy.mock.contexts.at(-1) as { props: { accessibilityLabel?: string } }).props.accessibilityLabel;
}

describe('FormFields', () => {
  it('"Siguiente" salta al próximo campo y el último queda con "Listo"', () => {
    render(
      <FormFields>
        <TextField label="Usuario" />
        <TextField label="Nombre" />
        <PasswordField label="Contraseña" />
      </FormFields>
    );

    expect(screen.getByLabelText('Usuario')).toHaveProp('returnKeyType', 'next');
    expect(screen.getByLabelText('Usuario')).toHaveProp('submitBehavior', 'submit');
    expect(screen.getByLabelText('Nombre')).toHaveProp('returnKeyType', 'next');
    expect(screen.getByLabelText('Contraseña')).toHaveProp('returnKeyType', 'done');
    expect(screen.getByLabelText('Contraseña').props.submitBehavior).toBeUndefined();

    fireEvent(screen.getByLabelText('Usuario'), 'submitEditing');
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusedLabel()).toBe('Nombre');
  });

  it('saltea los campos deshabilitados', () => {
    render(
      <FormFields>
        <TextField label="Nombre" disabled />
        <TextField label="Teléfono" />
        <TextField label="Email" disabled />
        <TextField label="Nacimiento" />
      </FormFields>
    );

    expect(screen.getByLabelText('Teléfono')).toHaveProp('returnKeyType', 'next');
    expect(screen.getByLabelText('Nacimiento')).toHaveProp('returnKeyType', 'done');

    fireEvent(screen.getByLabelText('Teléfono'), 'submitEditing');
    expect(focusedLabel()).toBe('Nacimiento');
  });

  it('un returnKeyType u onSubmitEditing propio tiene prioridad', () => {
    const onSubmitEditing = jest.fn();
    render(
      <FormFields>
        <TextField label="Contraseña" />
        <TextField label="Confirmar" returnKeyType="go" onSubmitEditing={onSubmitEditing} />
        <TextField label="Notas" />
      </FormFields>
    );

    expect(screen.getByLabelText('Confirmar')).toHaveProp('returnKeyType', 'go');
    fireEvent(screen.getByLabelText('Confirmar'), 'submitEditing');

    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('fuera de un formulario no cambia el comportamiento del teclado', () => {
    render(<TextField label="Buscar" />);

    expect(screen.getByLabelText('Buscar').props.returnKeyType).toBeUndefined();
    expect(screen.getByLabelText('Buscar').props.submitBehavior).toBeUndefined();
  });
});

describe('FormScrollProvider', () => {
  it('al enfocar un campo pide scrollearlo a la vista, sin pisar el onFocus propio', () => {
    const scrollIntoView = jest.fn();
    const onFocus = jest.fn();
    render(
      <FormScrollProvider scrollIntoView={scrollIntoView}>
        <TextField label="Teléfono" onFocus={onFocus} />
      </FormScrollProvider>
    );

    fireEvent(screen.getByLabelText('Teléfono'), 'focus');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
