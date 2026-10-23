import { fireEvent, render, screen } from '@testing-library/react-native';
import { UserIcon } from 'phosphor-react-native';
import { AccessibilityInfo } from 'react-native';

import { PasswordField } from './PasswordField';
import { Switch } from './Switch';
import { TextField } from './TextField';

jest.mock('tamagui', () => jest.requireActual('@/test/tamaguiMock'));
jest.mock('@/core/theme', () => jest.requireActual('@/test/themeMock'));

describe('TextField', () => {
  it('el label nombra al campo y onChangeText recibe el texto', () => {
    const onChangeText = jest.fn();
    render(<TextField label="Usuario" leftSection={UserIcon} onChangeText={onChangeText} />);

    fireEvent.changeText(screen.getByLabelText('Usuario'), 'admin');
    expect(onChangeText).toHaveBeenCalledWith('admin');
  });

  it('required suma el asterisco y lo anuncia; la descripción va como hint', () => {
    render(<TextField label="Teléfono" required description="Con código de área" />);

    expect(screen.getByText(/\*/)).toBeTruthy();
    expect(screen.getByText('Con código de área')).toBeTruthy();
    expect(screen.getByLabelText('Teléfono, obligatorio')).toHaveProp('accessibilityHint', 'Con código de área');
  });

  it('un accessibilityLabel propio también suma ", obligatorio"', () => {
    render(<TextField label="Tel." accessibilityLabel="Teléfono" required />);
    expect(screen.getByLabelText('Teléfono, obligatorio')).toBeTruthy();
  });

  it('el error se muestra debajo, pinta el borde y va en el hint', () => {
    render(<TextField label="Usuario" error="El usuario es obligatorio" />);

    expect(screen.getByText('El usuario es obligatorio')).toBeTruthy();
    const input = screen.getByLabelText('Usuario');
    expect(input).toHaveProp('borderColor', '$destructive');
    expect(input).toHaveProp('accessibilityHint', 'El usuario es obligatorio');
  });

  it('anuncia el error solo cuando aparece o cambia, no el que ya estaba al montar', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockClear();
    const { rerender } = render(<TextField label="Usuario" error="Inicial" />);
    expect(announce).not.toHaveBeenCalled();

    rerender(<TextField label="Usuario" />);
    rerender(<TextField label="Usuario" error="El usuario es obligatorio" />);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('El usuario es obligatorio');

    rerender(<TextField label="Usuario" error="El usuario es obligatorio" />);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('el hint junta error, descripción y el hint propio, sin pisar el error', () => {
    render(<TextField label="Usuario" error="Obligatorio" description="Tu alias" accessibilityHint="Sin espacios" />);
    expect(screen.getByLabelText('Usuario')).toHaveProp('accessibilityHint', 'Obligatorio. Tu alias. Sin espacios');
  });

  it('sin error no hay mensaje y el borde es el normal', () => {
    render(<TextField label="Usuario" />);
    const input = screen.getByLabelText('Usuario');
    expect(input).toHaveProp('borderColor', '$borderColor');
    expect(input.props.accessibilityHint).toBeUndefined();
  });

  it('deshabilitado no es editable', () => {
    render(<TextField label="Email" disabled value="admin@omni.app" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveProp('editable', false);
    expect(input).toHaveProp('accessibilityState', { disabled: true });
  });

  it('mezcla el accessibilityState del caller con el calculado, que manda en disabled', () => {
    render(
      <>
        <TextField label="Notas" accessibilityState={{ busy: true }} />
        <TextField label="Email" disabled accessibilityState={{ busy: true, disabled: false }} />
      </>
    );
    expect(screen.getByLabelText('Notas')).toHaveProp('accessibilityState', { busy: true, disabled: false });
    expect(screen.getByLabelText('Email')).toHaveProp('accessibilityState', { busy: true, disabled: true });
  });
});

describe('PasswordField', () => {
  it('oculta el texto y el ojo lo muestra y lo vuelve a ocultar', () => {
    render(<PasswordField label="Contraseña" />);
    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', true);

    fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', false);

    fireEvent.press(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', true);
  });

  it('deshabilitado no deja mostrar la contraseña', () => {
    render(<PasswordField label="Contraseña" disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Mostrar contraseña', disabled: true }));
    expect(screen.getByLabelText('Contraseña')).toHaveProp('secureTextEntry', true);
  });
});

describe('Switch', () => {
  it('es un switch con su estado y al tocarlo pide el valor contrario', () => {
    const onCheckedChange = jest.fn();
    render(<Switch label="Notificaciones" checked={false} onCheckedChange={onCheckedChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones', checked: false }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('con label la fila es un solo switch (descripción como hint) y tocar el texto lo cambia', () => {
    const onCheckedChange = jest.fn();
    render(<Switch label="Notificaciones" description="Avisos por email" checked onCheckedChange={onCheckedChange} />);

    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.getByRole('switch', { name: 'Notificaciones', checked: true })).toHaveProp(
      'accessibilityHint',
      'Avisos por email'
    );
    fireEvent.press(screen.getByText('Notificaciones'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('sin label usa accessibilityLabel', () => {
    const onCheckedChange = jest.fn();
    render(<Switch accessibilityLabel="Tema oscuro" checked onCheckedChange={onCheckedChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Tema oscuro', checked: true }));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('deshabilitado no cambia', () => {
    const onCheckedChange = jest.fn();
    render(<Switch label="Notificaciones" checked disabled onCheckedChange={onCheckedChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones', disabled: true }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
