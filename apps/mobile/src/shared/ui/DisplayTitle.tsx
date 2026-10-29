import { DISPLAY } from '@omni/shared/theme';
import { Paragraph, type ParagraphProps } from 'tamagui';

type DisplaySize = 'md' | 'lg' | 'xl';

const WORD_CHAR = /[\p{L}\p{N}]/u;

type DisplayTitleProps = Omit<ParagraphProps, 'children' | 'size'> & {
  children: string;
  size?: DisplaySize;
  accent?: string;
  header?: boolean;
};

/** Última aparición de `accent` en `text` que no está dentro de otra palabra (sus vecinos no son letras ni números). */
function lastWordIndex(text: string, accent: string): number {
  let at = text.lastIndexOf(accent);
  while (at >= 0) {
    const before = text[at - 1];
    const after = text[at + accent.length];
    if (!(before && WORD_CHAR.test(before)) && !(after && WORD_CHAR.test(after))) return at;
    at = at === 0 ? -1 : text.lastIndexOf(accent, at - 1);
  }
  return -1;
}

/**
 * Título de la familia `display` (Bricolage Grotesque, `DISPLAY` de `@omni/shared/theme`) con la palabra
 * acentuada en `primary`, mismo peso y sin itálica: "Películas y _Series_", "¡Te damos la bienvenida a _Omni_!".
 * `accent` es la palabra o frase de `children` que va en `primary` (una por título, su última aparición como
 * palabra entera, como `PageHeader` de web); si no aparece, el título queda sin acento. `header` (por defecto sí) lo marca como
 * encabezado para TalkBack; sin él es un texto más (mensajes de estados vacíos y de error).
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
  const at = accent ? lastWordIndex(children, accent) : -1;

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
