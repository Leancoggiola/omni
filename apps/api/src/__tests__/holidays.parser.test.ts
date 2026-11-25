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
      expect(parseHolidayEntry('Día Mundial de las Legumbres.(en inglés: World Pulses Day)')?.title).toBe(
        'Día Mundial de las Legumbres'
      );
    });

    it('quita "(imagen ilustrativa)"', () => {
      expect(parseHolidayEntry('Día Internacional de Besar a un Pelirrojo.(imagen ilustrativa)')?.title).toBe(
        'Día Internacional de Besar a un Pelirrojo'
      );
    });

    it('quita la aclaración con espacio', () => {
      expect(parseHolidayEntry('Día del Dominio Público. (no confundir con el Día del Libro)')?.title).toBe(
        'Día del Dominio Público'
      );
    });

    it('quita la coletilla separada por dos puntos', () => {
      expect(parseHolidayEntry('Día de la Tierra:(Celebraciones relacionadas)')?.title).toBe('Día de la Tierra');
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
      expect(parseHolidayEntry('Día del Libro: Jornada literaria')?.title).toBe('Día del Libro: Jornada literaria');
    });

    it('descarta países con artículo y el nombre repetido', () => {
      expect(
        parseHolidayEntry(
          'El Salvador\u00a0El Salvador:\nDía del Trabajador de Turismo.Conmemoración establecida mediante el Decreto Legislativo.'
        )
      ).toBeNull();
      expect(
        parseHolidayEntry(
          'El Salvador\u00a0El Salvador:\nDía del Psicólogo Salvadoreño.\nEstablecido como reconocimiento.'
        )
      ).toBeNull();
      expect(parseHolidayEntry('Los Países Bajos Los Países Bajos: Día del Rey')).toBeNull();
    });

    it('descarta el país que cuelga de un encabezado de celebraciones relacionadas', () => {
      expect(
        parseHolidayEntry(
          'Disolución de Checoslovaquia:(Celebraciones relacionadas).\nEslovaquia Eslovaquia:\nDía de la Fundación de la República Eslovaca.'
        )
      ).toBeNull();
      expect(
        parseHolidayEntry(
          'Disolución de Checoslovaquia:(Celebraciones relacionadas).\nRepública Checa\u00a0República Checa:\nDía de la Restauración del Estado Independiente Checo.'
        )
      ).toBeNull();
    });

    it('conserva una entrada internacional bajo un encabezado de celebraciones relacionadas', () => {
      expect(parseHolidayEntry('Día de la Tierra:(Celebraciones relacionadas).\nDía Mundial del Reciclaje.')).toEqual({
        title: 'Día Mundial del Reciclaje',
        isArgentina: false,
      });
    });

    it('descarta un país sin bandera ni nombre repetido precedido de un dos puntos suelto', () => {
      expect(parseHolidayEntry(':\nNiue: Día Nacional Takai.')).toBeNull();
    });

    it('no descarta un prefijo supranacional precedido de un dos puntos suelto', () => {
      expect(parseHolidayEntry(': Naciones Unidas: Día de la Paz')).not.toBeNull();
    });

    it('no descarta un título precedido de un dos puntos suelto', () => {
      expect(parseHolidayEntry(': Día del Libro: Jornada literaria')).toEqual({
        title: 'Día del Libro: Jornada literaria',
        isArgentina: false,
      });
    });

    it('no toma una letra doble como repetición de país', () => {
      expect(parseHolidayEntry('Día del Yennayer')).not.toBeNull();
    });

    it('descarta un "Día…" sin país que enumera países en el título', () => {
      const raw =
        'Día de la liberación africana: en\nChad Chad, Liberia Liberia, Malí Mali, Mauritania Mauritania, Namibia Namibia, Zambia Zambia, Zimbabue Zimbabue';

      expect(parseHolidayEntry(raw)).toBeNull();
    });
  });

  describe('prefijos supranacionales', () => {
    it.each([
      ['Naciones Unidas:\nDía Mundial del Medio Ambiente.', 'Día Mundial del Medio Ambiente'],
      [
        'Organización de las Naciones Unidas:\nDía Internacional de las Mujeres Rurales.',
        'Día Internacional de las Mujeres Rurales',
      ],
      ['ONU:\nDía Internacional de las Montañas.', 'Día Internacional de las Montañas'],
      ['Organización Mundial de la Salud:\nDía Mundial de la Salud.', 'Día Mundial de la Salud'],
      ['Mundialmente: Día internacional de la Química.', 'Día internacional de la Química'],
      ['Unesco:\nDía Internacional del Patrimonio Mundial.', 'Día Internacional del Patrimonio Mundial'],
    ])('quita el prefijo de "%s"', (raw, title) => {
      expect(parseHolidayEntry(raw)).toEqual({ title, isArgentina: false });
    });

    it('quita el prefijo sin dos puntos cuando sigue un título', () => {
      expect(parseHolidayEntry('Naciones Unidas\nDía Mundial de los Océanos.Se celebra desde 2009.')?.title).toBe(
        'Día Mundial de los Océanos'
      );
    });

    it('quita los dos puntos que deja un paréntesis inicial', () => {
      expect(parseHolidayEntry('Naciones Unidas: (ciertas regiones):\nDía Mundial de las Legumbres.')).toEqual({
        title: 'Día Mundial de las Legumbres',
        isArgentina: false,
      });
    });

    it.each([
      'Unión Europea Unión Europea:\nDía de Europa.Se celebra cada 9 de mayo.',
      'Unión Europea Unión Europea:\nDía de las Enfermedades Raras.',
      'Unión Europea Unión Europea:\nDía del Euro.(en británico-inglés: Euro Day).',
      'Unión Europea Día Europeo contra la Trata de Personas.',
      'Mercosur: Día del Mercado Común del Sur (Mercosur).En ocasión de recordar la firma del Tratado.',
    ])('descarta la entrada de un bloque regional "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it('conserva la entrada de un bloque regional que se declara internacional', () => {
      const raw = 'Unión Europea: Día internacional de los héroes de la lucha contra el totalitarismo.';

      expect(parseHolidayEntry(raw)).toEqual({
        title: 'Día internacional de los héroes de la lucha contra el totalitarismo',
        isArgentina: false,
      });
    });

    it('descarta la Unión Europea combinada con países', () => {
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

    it('descarta una provincia después de la bandera', () => {
      expect(parseHolidayEntry('🇦🇷 Argentina Argentina: Misiones: Día del Mate')).toBeNull();
    });

    it('descarta una entrada religiosa argentina con bandera', () => {
      expect(parseHolidayEntry('🇦🇷 Virgen de Luján')).toBeNull();
    });
  });

  describe('sub-prefijos argentinos', () => {
    it.each([
      ['Armada Argentina:\nDía de la Infantería de Marina.', 'Día de la Infantería de Marina'],
      ['Ejército Argentino: Día de las Tropas de Monte', 'Día de las Tropas de Monte'],
      ['Club Atlético Boca Juniors: Día del Xeneize.', 'Día del Xeneize'],
    ])('quita la institución de "%s"', (entry, title) => {
      expect(parseHolidayEntry(`Argentina Argentina: ${entry}`)).toEqual({ title, isArgentina: true });
    });

    it.each([
      'Misiones: Día del Mate',
      'Chaco: Día del Teatro Chaqueño',
      'Santa Fe: Día del Trabajador Rural',
      'Provincia de Mendoza: Día de la Bandera de la provincia de Mendoza',
      'Ciudad de Buenos Aires: Día del Vecino',
      'Buenos Aires: Partido de Lomas de Zamora: Día del Vecino',
      'Por provincias: Misiones: Día del Empleado Electoral de Misiones',
      'Por provincias Misiones: Día del Mate',
    ])('descarta la efeméride provincial "%s"', entry => {
      expect(parseHolidayEntry(`Argentina Argentina: ${entry}`)).toBeNull();
    });

    it('no corta un título que arranca con "Día" aunque tenga dos puntos', () => {
      expect(parseHolidayEntry('Argentina Argentina: Día de la Bandera: acto central')?.title).toBe(
        'Día de la Bandera: acto central'
      );
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
  });

  describe('lista blanca', () => {
    it.each([
      'Año Nuevo (según el calendario gregoriano).',
      'Mundial:\nNavidad.Celebración cristiana que conmemora el nacimiento de Jesucristo.',
      'Argentina Argentina:\nConmemoración por la Revolución de Mayo.',
    ])('conserva la excepción "%s"', raw => {
      expect(parseHolidayEntry(raw)).not.toBeNull();
    });

    it.each(['Año Nuevo Chino', 'Navidad Ortodoxa', 'Conmemoración por la Revolución de Mayo'])(
      'no extiende la excepción a "%s"',
      raw => {
        expect(parseHolidayEntry(raw)).toBeNull();
      }
    );

    it.each(['Semana Mundial de la Lactancia', 'Jornada Mundial de la Juventud', 'Carnaval', 'Mundial de Clubes'])(
      'descarta "%s" porque no es un "Día…"',
      raw => {
        expect(parseHolidayEntry(raw)).toBeNull();
      }
    );
  });

  describe('alcance de los "Día…" sin país', () => {
    it.each([
      'Día Europeo de la Logopedia.',
      'Día de Europa.',
      'Día Panamericano de la Farmacia.',
      'Día Latinoamericano de Prevención de las Quemaduras.',
      'Día Interamericano de la radiodifusión.',
      'Día de Iberoamérica.',
      'Día de la Malaria en las Américas.',
      'Día del Gato Montés Sudamericano.',
      'Día Africano del Medio Ambiente.',
      'Día de los Refugiados en África.',
      'Día del Mediterráneo.',
    ])('descarta el regional "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it.each(['Día Internacional de África', 'Día Mundial de la Cultura Africana y de los Afrodescendientes'])(
      'conserva "%s" porque es mundial o internacional',
      raw => {
        expect(parseHolidayEntry(raw)?.title).toBe(raw);
      }
    );

    it.each([
      'Día Nacional del Frijol.(en inglés: National Bean Day).',
      'Día Nacional del Vino Croata.',
      'Día Nacional de la Medicina Social.En homenaje al Dr. René Favaloro.',
    ])('descarta el "Día Nacional" sin país "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it('conserva el "Día Nacional" argentino', () => {
      expect(parseHolidayEntry('Argentina Argentina: Día Nacional del Humorista.')?.title).toBe(
        'Día Nacional del Humorista'
      );
    });

    it.each([
      'Día Mundial de la Infancia, en:\n Unión Europea,',
      'Día Mundial de la Infancia, en:\n Albania, Armenia, Bulgaria y Rusia',
      'Día del Padre en: Andorra Andorra: (Dia del Pare)',
      'Día de la Victoria sobre el nazismo.en ruso: День Победы Bosnia y HerzegovinaBosnia y Herzegovina Bosnia y Herzegovina',
    ])('descarta la versión por país "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it.each([
      'No oficial: Día de No Volar.',
      'Celebración no oficial: Día del Emoji.',
      'Esperantujo: Día de Zamenhof.',
    ])('descarta el "Día…" con un rótulo adelante "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });
  });

  describe('entradas reales del feed que se colaban', () => {
    it.each([
      'Todos los Santos.Solemnidad en la que la Iglesia católica honra conjuntamente a todos los santos.',
      'Presentación de la Santísima Virgen María.\nMemoria litúrgica que recuerda la presentación de María en el Templo.',
      'Gelasio 1°: Pontífice y santo\nSumo pontífice (49°) entre los años 492 y 496.',
      'Calendario bahaí:\nFiesta de Masá’il.(grafía árabe: مسائل) (Significado: Preguntas).',
      'Islas Vírgenes de los Estados Unidos Islas Vírgenes de los Estados Unidos:\nDía de la Libertad (Liberty Day).',
      'Dedicación Catedral de la Santísima Trinidad y San Antonio de Padua de Zipaquirá',
      'Argentina Argentina:\nMisiones:\nAniversario de Garuhapé.Fecha de fundación: 4 de noviembre de 1946 (80 años).',
      'Argentina Argentina:\nPor provincias:\nMisiones:\n Posadas: Aniversario de la ciudad.Reconocimiento jurídico.',
      'Argentina Argentina:\nPor provincias:\nMisiones:\nAniversario de Gobernador Roca.Fundación de la localidad.',
      'Argentina Argentina:\nPor provincias:\nMisiones:\nDía del Empleado Electoral de Misiones.Instituido por la Ley.',
      'Argentina Argentina:\nPor provincias:\n Misiones: Fiesta Provincial de Santa Cecilia, patrona de la Música.',
      'Argentina Argentina:\nChaco:\nDía del Teatro Chaqueño.El 8 de diciembre de 1995 fue la primera reunión.',
      'Con el armado del tradicional árbol de Navidad, cada año, el 8 de diciembre marca el inicio oficial de las celebraciones navideñas en muchos hogares.',
      'Argentina Argentina:\n1910: Se inaugura y bendice el actual templo de la Basílica de Nuestra Señora de Luján.El edificio.',
      'Glorioso 25 de Mayo.En homenaje a Terry Pratchett.',
    ])('descarta "%s"', raw => {
      expect(parseHolidayEntry(raw)).toBeNull();
    });

    it.each([
      ['Día Mundial del Veganismo.Celebrado desde 1994.', 'Día Mundial del Veganismo', false],
      ['Día de la UNESCO.Conmemora la entrada en vigor de la Constitución.', 'Día de la UNESCO', false],
      ['Día de la Música.Celebración tradicional vinculada a Santa Cecilia.', 'Día de la Música', false],
      ['Día Internacional de José José.Se celebra cada 20 de abril.', 'Día Internacional de José José', false],
      ['Mundial:\nDía de los Reyes Magos, en el Cristianismo.', 'Día de los Reyes Magos, en el Cristianismo', false],
      [
        'Argentina Argentina:\nDía de la Inmaculada Concepción de María.Feriado nacional.',
        'Día de la Inmaculada Concepción de María',
        true,
      ],
    ])('conserva "%s"', (raw, title, isArgentina) => {
      expect(parseHolidayEntry(raw)).toEqual({ title, isArgentina });
    });
  });

  it('descarta texto vacío', () => {
    expect(parseHolidayEntry('   ')).toBeNull();
  });
});
