import { GRADIENT_STOPS } from '@omni/shared/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Paragraph } from 'tamagui';

import { useSemanticColors } from '@/core/theme';
import { gradientPoints } from '@/theme/gradient';

import { getInitials } from './UserAvatar.utils';

const BRAND = GRADIENT_STOPS.brand;
const BRAND_POINTS = gradientPoints(BRAND.deg);

type UserAvatarProps = {
  name: string;
  size?: number;
  /** Foto: si viene, reemplaza las iniciales. */
  uri?: string | null;
};

/**
 * Equivalente de `UserAvatar` de web: círculo con el gradiente de marca e iniciales. La foto
 * (`uri`) reemplaza las iniciales; si no carga, vuelven las iniciales hasta que cambie la `uri`.
 */
export function UserAvatar({ name, size = 40, uri }: UserAvatarProps) {
  const colors = useSemanticColors();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`Foto de ${name}`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        onError={() => setFailedUri(uri)}
      />
    );
  }

  return (
    <LinearGradient
      colors={[BRAND.from, BRAND.to]}
      {...BRAND_POINTS}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <Paragraph color={colors.white} fontSize={size * 0.4} fontWeight="600">
        {getInitials(name)}
      </Paragraph>
    </LinearGradient>
  );
}
