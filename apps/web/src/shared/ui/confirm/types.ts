export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `true` por defecto: el botón de confirmar va en rojo. Misma opción que en mobile. */
  destructive?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  destructive: boolean;
  resolve: (value: boolean) => void;
}
