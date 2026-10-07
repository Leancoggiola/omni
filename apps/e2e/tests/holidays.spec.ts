import { expect, test } from '../src/fixtures/test';
import { HomePage } from '../src/pages/HomePage';

// Títulos ya parseados por la API a partir del feed fijo de src/support/externalStub.mjs, en orden.
const ANIMALS_DAY = 'Día Mundial de los Animales';
// En el feed viene con prefijo "Argentina Argentina:", así que la card le agrega el sufijo.
const ROAD_DAY_AR = 'Día Nacional del Camino y la Educación Vial · en Argentina';
const TEACHERS_DAY = 'Día Mundial de los Docentes';

const MONTHS = 'enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre';

test.describe('efemérides de hoy', () => {
  test.describe('con el feed del stub', () => {
    test.beforeEach(async ({ page }) => {
      // El carrusel avanza solo cada 3 s. Con el reloj pausado desde antes de cargar la página
      // ese timer nunca corre, y el ítem visible cambia únicamente con el click.
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await new HomePage(page).goto();
    });

    test('muestra el primer ítem del feed', async ({ page }) => {
      const home = new HomePage(page);

      await expect(home.holidaysTitle()).toBeVisible();
      await expect(home.holiday(ANIMALS_DAY)).toBeVisible();
    });

    test('avanza al siguiente ítem al hacer click en la card y vuelve al primero al final', async ({ page }) => {
      const home = new HomePage(page);
      await expect(home.holiday(ANIMALS_DAY)).toBeVisible();

      await home.nextHoliday();
      await expect(home.holiday(ANIMALS_DAY)).toBeHidden();
      await expect(home.holiday(ROAD_DAY_AR)).toBeVisible();

      await home.nextHoliday();
      await expect(home.holiday(TEACHERS_DAY)).toBeVisible();

      await home.nextHoliday();
      await expect(home.holiday(ANIMALS_DAY)).toBeVisible();
    });

    test('marca la efeméride argentina con el sufijo "en Argentina"', async ({ page }) => {
      const home = new HomePage(page);
      // exact: sin el sufijo, así que confirma que las internacionales no lo llevan.
      await expect(home.holiday(ANIMALS_DAY)).toBeVisible();

      await home.nextHoliday();

      await expect(home.holiday(ROAD_DAY_AR)).toBeVisible();
    });

    test('enlaza a las celebraciones del día en Wikipedia en una pestaña nueva', async ({ page }) => {
      const link = new HomePage(page).holidaysSourceLink();

      await expect(link).toHaveAttribute(
        'href',
        new RegExp(`^https://es\\.wikipedia\\.org/wiki/([1-9]|[12]\\d|3[01])_de_(${MONTHS})#Celebraciones$`)
      );
      await expect(link).toHaveAttribute('target', '_blank');
    });
  });

  test('muestra el estado de error cuando la API falla', async ({ page }) => {
    // La API cachea el feed del día en memoria: el error se fuerza en el browser, no en el stub.
    await page.route('**/api/holidays/today**', route =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"boom"}' })
    );
    const home = new HomePage(page);

    await home.goto();

    await expect(home.holidaysError()).toBeVisible();
    await expect(home.holidaysTitle()).toBeHidden();
  });
});
