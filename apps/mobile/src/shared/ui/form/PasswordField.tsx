import { EyeIcon, EyeSlashIcon } from 'phosphor-react-native';
import { useState } from 'react';

import { IconButton } from '../button/IconButton';

import { TextField, type TextFieldProps } from './TextField';

type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'rightSection'>;

/** Equivalente de `PasswordInput` de Mantine: `TextField` con el ojo para mostrar u ocultar. */
export function PasswordField({ disabled, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      disabled={disabled}
      secureTextEntry={!visible}
      rightSection={
        <IconButton
          icon={visible ? EyeSlashIcon : EyeIcon}
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          color="dimmed"
          size="sm"
          disabled={disabled}
          onPress={() => setVisible(value => !value)}
        />
      }
    />
  );
}
