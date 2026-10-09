import { fireEvent, render, screen } from '@testing-library/react-native';
import { UserIcon } from 'phosphor-react-native';

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

  it('required suma el asterisco y la descripción se muestra', () => {
    render(<TextField label="Teléfono" required description="Con código de área" />);
    expect(screen.getByText(/\*/)).toBeTruthy();
    expect(screen.getByText('Con código de área')).toBeTruthy();
  });

  it('el error se muestra debajo, pinta el borde y se anuncia como hint', () => {
    render(<TextField label="Usuario" error="El usuario es obligatorio" />);

    expect(screen.getByText('El usuario es obligatorio')).toBeTruthy();
    const input = screen.getByLabelText('Usuario');
    expect(input).toHaveProp('borderColor', '$destructive');
    expect(input).toHaveProp('accessibilityHint', 'El usuario es obligatorio');
  });

  it('sin error no hay mensaje y el borde es el normal', () => {
    render(<TextField label="Usuario" />);
    expect(screen.getByLabelText('Usuario')).toHaveProp('borderColor', '$borderColor');
  });

  it('deshabilitado no es editable', () => {
    render(<TextField label="Email" disabled value="admin@omni.app" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveProp('editable', false);
    expect(input).toHaveProp('accessibilityState', { disabled: true });
  });
});

describe('PasswordField', () => {
  it('oculta el texto y el ojo lo muestra y lo vuelve a ocultar', () => {
    render(<PasswordField label="Contraseña" />);
    const input = screen.getByLabelText('Contraseña');
    expect(input).toHaveProp('secureTextEntry', true);

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

    const control = screen.getByRole('switch', { name: 'Notificaciones', checked: false });
    fireEvent.press(control);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('muestra label y descripción', () => {
    render(<Switch label="Notificaciones" description="Avisos por email" checked onCheckedChange={jest.fn()} />);
    expect(screen.getByText('Notificaciones')).toBeTruthy();
    expect(screen.getByText('Avisos por email')).toBeTruthy();
    expect(screen.getByRole('switch', { checked: true })).toBeTruthy();
  });

  it('sin label usa accessibilityLabel', () => {
    render(<Switch accessibilityLabel="Tema oscuro" checked onCheckedChange={jest.fn()} />);
    expect(screen.getByRole('switch', { name: 'Tema oscuro' })).toBeTruthy();
  });

  it('deshabilitado no cambia', () => {
    const onCheckedChange = jest.fn();
    render(<Switch label="Notificaciones" checked disabled onCheckedChange={onCheckedChange} />);

    fireEvent.press(screen.getByRole('switch', { name: 'Notificaciones', disabled: true }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
