import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';

import type { ReactNode } from 'react';
import type { TextInput } from 'react-native';

type FormScrollValue = { scrollIntoView: () => void };

type FieldEntry = { id: string; focusable: boolean };

type FormFieldsValue = {
  fields: FieldEntry[];
  register: (id: string, focusable: boolean, getInput: () => TextInput | null) => () => void;
  setFocusable: (id: string, focusable: boolean) => void;
  focusNext: (id: string) => boolean;
};

const FormScrollContext = createContext<FormScrollValue | null>(null);
const FormFieldsContext = createContext<FormFieldsValue | null>(null);

/**
 * Le pasa a los `TextField` de adentro el `scrollIntoView` del ScrollView que los contiene: al enfocarse, el campo
 * pide quedar a la vista sobre el teclado. Lo montan `FormSheet` y `FormScrollView`.
 */
export function FormScrollProvider({ scrollIntoView, children }: FormScrollValue & { children: ReactNode }) {
  const value = useMemo(() => ({ scrollIntoView }), [scrollIntoView]);

  return <FormScrollContext.Provider value={value}>{children}</FormScrollContext.Provider>;
}

/**
 * Agrupa los `TextField` de un formulario para que "Siguiente" del teclado salte al próximo campo habilitado, en el
 * orden en que se montan (el de la pantalla). El último queda con "Listo". `FormSheet` ya envuelve su contenido;
 * en una pantalla con varios formularios (Perfil) cada uno lleva el suyo, así "Siguiente" no cruza de formulario.
 */
export function FormFields({ children }: { children: ReactNode }) {
  const [fields, setFields] = useState<FieldEntry[]>([]);
  const inputs = useRef(new Map<string, () => TextInput | null>());
  const fieldsRef = useRef(fields);
  useEffect(() => {
    fieldsRef.current = fields;
  });

  const register = useCallback((id: string, focusable: boolean, getInput: () => TextInput | null) => {
    inputs.current.set(id, getInput);
    setFields(prev => [...prev.filter(field => field.id !== id), { id, focusable }]);
    return () => {
      inputs.current.delete(id);
      setFields(prev => prev.filter(field => field.id !== id));
    };
  }, []);

  const setFocusable = useCallback((id: string, focusable: boolean) => {
    setFields(prev =>
      prev.some(field => field.id === id && field.focusable !== focusable)
        ? prev.map(field => (field.id === id ? { id, focusable } : field))
        : prev
    );
  }, []);

  const focusNext = useCallback((id: string) => {
    const list = fieldsRef.current;
    const next = list.slice(list.findIndex(field => field.id === id) + 1).find(field => field.focusable);
    const input = next ? inputs.current.get(next.id)?.() : null;
    if (!input) return false;
    input.focus();
    return true;
  }, []);

  const value = useMemo(
    () => ({ fields, register, setFocusable, focusNext }),
    [fields, register, setFocusable, focusNext]
  );

  return <FormFieldsContext.Provider value={value}>{children}</FormFieldsContext.Provider>;
}

/**
 * Engancha un campo al formulario y al ScrollView que lo contienen (si los hay). Devuelve si hay un campo habilitado
 * después (para elegir "Siguiente" o "Listo"), cómo saltar a él y el `scrollIntoView` para el foco.
 */
export function useFormField(focusable: boolean, getInput: () => TextInput | null) {
  const id = useId();
  const form = useContext(FormFieldsContext);
  const scroll = useContext(FormScrollContext);
  const getInputRef = useRef(getInput);
  const focusableRef = useRef(focusable);
  useEffect(() => {
    getInputRef.current = getInput;
    focusableRef.current = focusable;
  });

  const register = form?.register;
  const setFocusable = form?.setFocusable;
  useEffect(() => {
    if (!register) return;
    return register(id, focusableRef.current, () => getInputRef.current());
  }, [register, id]);

  useEffect(() => {
    setFocusable?.(id, focusable);
  }, [setFocusable, id, focusable]);

  const fields = form?.fields ?? [];
  const index = fields.findIndex(field => field.id === id);
  const hasNext = index >= 0 && fields.slice(index + 1).some(field => field.focusable);

  return {
    inForm: form !== null,
    hasNext,
    focusNext: () => form?.focusNext(id) ?? false,
    scrollIntoView: scroll?.scrollIntoView,
  };
}
