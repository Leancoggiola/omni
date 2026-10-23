import { describe, expect, it } from 'vitest';

import { parseHolidayEntry } from '../holidays/holidays.parser';

describe('parseHolidayEntry', () => {
  describe('título', () => {
    it('corta la descripción pegada al punto', () => {
      const raw =
        'Día Internacional del Chocolate.Celebración instaurada en 1995 y vinculada con el aniversario del nacimiento del escritor británico Roald Dahl (1916).';

      expect(parseHolidayEntry(raw)).toEqual({ title: 'Día Internacional del Chocolate', isArgentina: false });
    });

    it('corta la descripción cuando hay espacio tras el punto', () => {
      const raw =
        'Día de la usurpación de las Islas Malvinas. La ocupación británica de las islas Malvinas fue una operación militar de Gran Bretaña.';

      expect(parseHolidayEntry(raw)?.title).toBe('Día de la usurpación de las Islas Malvinas');
    });

    it('deja intacto un título sin descripción', () => {
      expect(parseHolidayEntry('Día del Dominio Público.')?.title).toBe('Día del Dominio Público');
    });

    it('quita las aclaraciones entre paréntesis del título', () => {
      expect(parseHolidayEntry('Año Nuevo (según el calendario gregoriano).')?.title).toBe('Año Nuevo');
    });

    it('normaliza saltos de línea y espacios dobles', () => {
      expect(parseHolidayEntry('Día  Mundial\n del  Wi-Fi')?.title).toBe('Día Mundial del Wi-Fi');
    });
  });

  describe('coletillas', () => {
    it('quita la traducción al inglés', () => {
      expect(parseHolidayEntry('Día Nacional del Frijol.(en inglés: National Bean Day)')?.title).toBe(
        'Día Nacional del Frijol'
      );
    });

    it('quita "(imagen ilustrativa)"', () => {
      expect(parseHolidayEntry('Día Internacional de Besar a un Pelirrojo.(imagen ilustrativa)')?.title).toBe(
        'Día Internacional de Besar a un Pelirrojo'
      );
    });

    it('quita la aclaración con espacio', () => {
      expect(parseHolidayEntry('Epifanía Ortodoxa. (no confundir con Epifanía Católica)')?.title).toBe(
        'Epifanía Ortodoxa'
      );
    });

    it('quita la coletilla separada por dos puntos', () => {
      expect(parseHolidayEntry('Disolución de Checoslovaquia:(Celebraciones relacionadas)')?.title).toBe(
        'Disolución de Checoslovaquia'
      );
    });
  });

  describe('países', () => {
    it('marca Argentina y quita el prefijo duplicado', () => {
      expect(parseHolidayEntry('Argentina Argentina: Día del Bibliotecario')).toEqual({
        title: 'Día del Bibliotecario',
        isArgentina: true,
      });
    });

    it('descarta países ajenos con el nombre repetido y espacio', () => {
      expect(parseHolidayEntry('Australia Australia: Día de la Independencia.')).toBeNull();
    });

    it('descarta países ajenos con el nombre pegado', () => {
      expect(parseHolidayEntry('ChinaChina China: Comienzo del Festival de esculturas de hielo')).toBeNull();
    });

    it('descarta países de nombre largo repetido tres veces', () => {
      const raw =
        'República Democrática del CongoRepública Democrática del Congo República Democrática del Congo: Día de los Mártires';

      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it('descarta entradas con varios países', () => {
      expect(parseHolidayEntry('Andorra Andorra, España España y Gibraltar Gibraltar: Cabalgata de Reyes')).toBeNull();
    });

    it('descarta el país anidado con territorio', () => {
      const raw =
        'Reino UnidoReino Unido Reino Unido: Islas MalvinasIslas Malvinas Islas Malvinas: Día de Margaret Thatcher';

      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it('descarta el prefijo de país sin dos puntos', () => {
      expect(parseHolidayEntry('México México Día Nacional del Cine Mexicano')).toBeNull();
    });

    it('descarta un país cuyo nombre termina en tilde', () => {
      expect(parseHolidayEntry('Perú Perú: Arequipa: Día de Arequipa')).toBeNull();
      expect(parseHolidayEntry('PanamáPanamá Panamá: Día de los Mártires')).toBeNull();
    });

    it('detecta la repetición aunque cambie la capitalización', () => {
      expect(parseHolidayEntry('Imperio Romano Imperio romano: Primer día de las Sementivae')).toBeNull();
    });

    it('descarta una entrada que es solo el prefijo de país', () => {
      expect(parseHolidayEntry('Estados Unidos Estados Unidos:')).toBeNull();
    });

    it('no confunde dos puntos de un título con un prefijo de país', () => {
      expect(parseHolidayEntry('Solemnidad de la Epifanía del Señor: Adoración de los Reyes Magos')).toBeNull();
      expect(parseHolidayEntry('Yennayer: Año Nuevo Bereber')?.title).toBe('Yennayer: Año Nuevo Bereber');
    });

    it('no toma una letra doble como repetición de país', () => {
      expect(parseHolidayEntry('Yennayer: Celebración del Año Nuevo Bereber')).not.toBeNull();
      expect(parseHolidayEntry('Carnaval: Desfile de comparsas')).not.toBeNull();
    });
  });

  describe('prefijos supranacionales', () => {
    it('conserva la entrada de la Unión Europea con el nombre repetido', () => {
      const raw =
        'Unión Europea Unión Europea:\nDía de Europa.Se celebra cada 9 de mayo la paz y la unidad en el continente.';

      expect(parseHolidayEntry(raw)).toEqual({ title: 'Día de Europa', isArgentina: false });
    });

    it.each([
      ['Naciones Unidas:\nDía Mundial del Medio Ambiente.', 'Día Mundial del Medio Ambiente'],
      [
        'Organización de las Naciones Unidas:\nDía Internacional de las Mujeres Rurales.',
        'Día Internacional de las Mujeres Rurales',
      ],
      ['ONU:\nDía Internacional de las Montañas.', 'Día Internacional de las Montañas'],
      ['Organización Mundial de la Salud:\nDía Mundial de la Salud.', 'Día Mundial de la Salud'],
      ['Unión Europea: Día del Número de Emergencias Europeo 112.', 'Día del Número de Emergencias Europeo 112'],
      ['Mundialmente: Día internacional de la Química.', 'Día internacional de la Química'],
    ])('quita el prefijo de "%s"', (raw, title) => {
      expect(parseHolidayEntry(raw)).toEqual({ title, isArgentina: false });
    });

    it('quita el prefijo sin dos puntos cuando sigue un título', () => {
      expect(parseHolidayEntry('Naciones Unidas\nDía Mundial de los Océanos.Se celebra desde 2009.')?.title).toBe(
        'Día Mundial de los Océanos'
      );
      expect(parseHolidayEntry('Unión Europea Día Europeo contra la Trata de Personas.')?.title).toBe(
        'Día Europeo contra la Trata de Personas'
      );
    });

    it('quita los dos puntos que deja un paréntesis inicial', () => {
      expect(parseHolidayEntry('Unión Europea Unión Europea: (ciertas regiones):\nDía del Mediterráneo.')).toEqual({
        title: 'Día del Mediterráneo',
        isArgentina: false,
      });
    });

    it('no toma como prefijo un nombre seguido de algo que no es título', () => {
      expect(parseHolidayEntry('Mundial de Clubes')?.title).toBe('Mundial de Clubes');
    });

    it('sigue descartando la Unión Europea combinada con países', () => {
      const raw =
        'Unión Europea Unión Europea\nInglaterraInglaterra Inglaterra, EscociaEscocia Escocia, Finlandia Finlandia, Suecia Suecia y Baviera (Alemania Alemania):\nSanta Walburga o Walpurga, santa católica';

      expect(parseHolidayEntry(raw)).toBeNull();
    });
  });

  describe('banderas', () => {
    it('marca Argentina y quita la bandera junto con el prefijo repetido', () => {
      expect(parseHolidayEntry('🇦🇷 Argentina Argentina: Día de la Bandera')).toEqual({
        title: 'Día de la Bandera',
        isArgentina: true,
      });
    });

    it('quita el prefijo repetido pegado a la bandera', () => {
      expect(parseHolidayEntry('🇦🇷Argentina Argentina: Día del Bibliotecario')).toEqual({
        title: 'Día del Bibliotecario',
        isArgentina: true,
      });
    });

    it('marca Argentina aunque no haya prefijo repetido', () => {
      expect(parseHolidayEntry('🇦🇷 Día de la Soberanía Nacional')).toEqual({
        title: 'Día de la Soberanía Nacional',
        isArgentina: true,
      });
    });

    it('descarta una bandera de otro país', () => {
      expect(parseHolidayEntry('🇨🇱 Chile Chile: Día de la Independencia')).toBeNull();
      expect(parseHolidayEntry('🇨🇱 Día Nacional del Cine')).toBeNull();
    });

    it('quita la provincia después de la bandera', () => {
      expect(parseHolidayEntry('🇦🇷 Argentina Argentina: Misiones: Aniversario de Wanda')).toEqual({
        title: 'Aniversario de Wanda',
        isArgentina: true,
      });
    });

    it('aplica el filtro religioso a una entrada argentina con bandera', () => {
      expect(parseHolidayEntry('🇦🇷 Virgen de Luján')).toBeNull();
    });
  });

  describe('sub-prefijos argentinos', () => {
    it('quita la provincia', () => {
      expect(parseHolidayEntry('Argentina Argentina: Misiones: Aniversario de Wanda')).toEqual({
        title: 'Aniversario de Wanda',
        isArgentina: true,
      });
    });

    it('quita dos niveles de sub-prefijo', () => {
      const raw = 'Argentina Argentina: Buenos Aires: Partido de Lomas de Zamora: Aniversario de la fundación';

      expect(parseHolidayEntry(raw)?.title).toBe('Aniversario de la fundación');
    });

    it('no corta un título que arranca con "Día" aunque tenga dos puntos', () => {
      expect(parseHolidayEntry('Argentina Argentina: Día de la Bandera')?.title).toBe('Día de la Bandera');
    });
  });

  describe('filtro religioso', () => {
    it.each([
      'san Antero, papa (f. 236)',
      'santos Teopempo y Teonas de Nicomedia, mártires (f. c. 304)',
      'Santo Tomás de Aquino, (f. 1274)',
      'beato Valentín Paquay, sacerdote franciscano belga (1828-1905)',
      'Nuestra Señora de La Vang',
      'La Iglesia Anglicana celebra la fiesta de Santa María Virgen',
      'Las Iglesias Ortodoxas celebran la fiesta de la Dormición de Theotokos',
      'Asunción de la Virgen María',
      'Solemnidad de santa María, madre de Dios',
      'Memoria de San Juan Bosco, presbítero (1888)',
      'Presentación del Señor',
      'Señor de los Milagros',
      'Exaltación de la Santa Cruz',
      'Virgen de Luján',
    ])('descarta "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it('no descarta una provincia que empieza con "Santa"', () => {
      expect(parseHolidayEntry('Argentina Argentina: Santa Fe: Día del Trabajador Rural')).toEqual({
        title: 'Día del Trabajador Rural',
        isArgentina: true,
      });
    });
  });

  it('descarta texto vacío', () => {
    expect(parseHolidayEntry('   ')).toBeNull();
  });
});
