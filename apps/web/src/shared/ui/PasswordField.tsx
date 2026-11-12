import { useState } from 'react';
import { PasswordInput, type PasswordInputProps } from '@mantine/core';

import type { FC } from 'react';

/**
 * `PasswordInput` con el ojo enfocable y anunciado en español como "Mostrar contraseña" / "Ocultar contraseña",
 * igual que el `PasswordField` de mobile. Mantine lo anuncia en inglés y sin distinguir el estado.
 */
export const PasswordField: FC<PasswordInputProps> = ({ visibilityToggleButtonProps, ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <PasswordInput
      visibilityToggleFocusable
      visible={visible}
      onVisibilityChange={setVisible}
      visibilityToggleButtonProps={{
        'aria-label': visible ? 'Ocultar contraseña' : 'Mostrar contraseña',
        ...visibilityToggleButtonProps,
      }}
      {...props}
    />
  );
};
