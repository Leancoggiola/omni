import { DISPLAY } from '@omni/shared/theme';
import { Paragraph, type ParagraphProps } from 'tamagui';

type DisplaySize = 'md' | 'lg' | 'xl';

type DisplayTitleProps = Omit<ParagraphProps, 'children' | 'size'> & {
  children: string;
  size?: DisplaySize;
  accent?: string;
  header?: boolean;
};

/**
 * Título de la familia `display` (Bricolage Grotesque, `DISPLAY` de `@omni/shared/theme`) con la palabra
 * acentuada en `primary`, mismo peso y sin itálica: "Películas y _Series_", "¡Te damos la bienvenida a _Omni_!".
 * `accent` es la palabra o frase de `children` que va en `primary` (una por título); si no aparece, el título
 * queda sin acento. `header` (por defecto sí) lo marca como encabezado para TalkBack; sin él es un texto más (mensajes
 * de estados vacíos y de error).
 */
export function DisplayTitle({ children, size = 'lg', accent, header = true, ...props }: DisplayTitleProps) {
  const { fontSize, lineHeight, fontWeight, letterSpacing } = DISPLAY[size];
  const style = {
    fontFamily: '$display',
    fontSize,
    lineHeight,
    fontWeight: String(fontWeight) as ParagraphProps['fontWeight'],
    letterSpacing,
    textTransform: 'none',
  } as const;
  const at = accent ? children.indexOf(accent) : -1;

  return (
    <Paragraph color="$color" accessibilityRole={header ? 'header' : undefined} {...style} {...props}>
      {at < 0 || !accent ? (
        children
      ) : (
        <>
          {children.slice(0, at)}
          <Paragraph color="$primary" {...style} letterSpacing={DISPLAY.accent.letterSpacing}>
            {accent}
          </Paragraph>
          {children.slice(at + accent.length)}
        </>
      )}
    </Paragraph>
  );
}
