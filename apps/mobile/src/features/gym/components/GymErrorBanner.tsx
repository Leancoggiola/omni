import { Banner } from '@/shared/ui';

type GymErrorBannerProps = {
  message: string;
  help?: string;
};

/** Error de una hoja del gimnasio: el mensaje de la API tal cual y, debajo, una línea de ayuda del cliente. */
export function GymErrorBanner({ message, help }: GymErrorBannerProps) {
  return <Banner color="destructive">{help ? `${message}\n${help}` : message}</Banner>;
}
