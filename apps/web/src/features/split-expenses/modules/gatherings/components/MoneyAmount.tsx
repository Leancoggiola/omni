import { FC } from 'react';

import { formatMoney } from '@omni/shared/common';

interface MoneyAmountProps {
  value: number;
}

/** Importe en formato es-AR (`formatMoney` de `@omni/shared/common`), e.g. 13124 -> "$13.124,00". */
export const MoneyAmount: FC<MoneyAmountProps> = ({ value }) => <>{formatMoney(value)}</>;
