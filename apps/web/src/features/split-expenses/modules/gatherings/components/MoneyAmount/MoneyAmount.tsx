import { FC } from 'react';
import { NumberFormatter } from '@mantine/core';

interface MoneyAmountProps {
  value: number;
}

/** Displays a currency amount using the es-AR format, e.g. 13124 -> "$13.124,00". */
export const MoneyAmount: FC<MoneyAmountProps> = ({ value }) => (
  <NumberFormatter
    prefix="$"
    value={value}
    thousandSeparator="."
    decimalSeparator=","
    decimalScale={2}
    fixedDecimalScale
  />
);
