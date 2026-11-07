import { GRADIENT_STOPS } from '@omni/shared/theme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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
 * (`uri`) reemplaza las iniciales.
 */
export function UserAvatar({ name, size = 40, uri }: UserAvatarProps) {
  const colors = useSemanticColors();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={`Foto de ${name}`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
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
