import { GRADIENT_STOPS } from '@omni/shared/theme';
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
};

/**
 * Equivalente de `UserAvatar` de web: círculo con el gradiente de marca e iniciales. La foto
 * (`avatarUrl`) llega con #39.
 */
export function UserAvatar({ name, size = 40 }: UserAvatarProps) {
  const colors = useSemanticColors();

  return (
    <LinearGradient
      colors={[BRAND.from, BRAND.to]}
      {...BRAND_POINTS}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Blanco en los dos temas, como el Avatar gradient de web: `onPrimary` es oscuro en dark. */}
      <Paragraph color={colors.white} fontSize={size * 0.4} fontWeight="600">
        {getInitials(name)}
      </Paragraph>
    </LinearGradient>
  );
}
