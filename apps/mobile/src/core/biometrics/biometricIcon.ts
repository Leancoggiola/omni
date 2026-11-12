import { FingerprintIcon, ScanSmileyIcon, type Icon } from 'phosphor-react-native';

import type { BiometricKind } from './biometrics';

/** Ícono según el tipo: el rostro tiene el suyo; huella, las dos y la genérica usan la huella. */
export function biometricIcon(kind: BiometricKind): Icon {
  return kind === 'face' ? ScanSmileyIcon : FingerprintIcon;
}
