import { FC } from 'react';
import { Alert } from '@mantine/core';

interface GymFormBannerProps {
  message: string;
  help?: string;
}

/** Error de un formulario del gimnasio: el mensaje de la API tal cual, en negrita, y debajo una línea de ayuda del cliente. */
export const GymFormBanner: FC<GymFormBannerProps> = ({ message, help }) => (
  <Alert color="destructive" title={message}>
    {help}
  </Alert>
);
