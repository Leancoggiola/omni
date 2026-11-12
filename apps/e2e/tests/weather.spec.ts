import { expect, test } from '../src/fixtures/test';
import { HomePage } from '../src/pages/HomePage';

const WEATHER_PATH = '**/api/weather/current';

test.describe('clima en Inicio', () => {
  test.describe('con la ubicación permitida', () => {
    test.use({ geolocation: { latitude: -34.603722, longitude: -58.381592 }, permissions: ['geolocation'] });

    test('muestra temperatura, condición y mínima y máxima del día', async ({ page }) => {
      const home = new HomePage(page);

      await home.goto();

      await expect(home.weather().getByText('22°', { exact: true })).toBeVisible();
      await expect(home.weather().getByText('Nublado', { exact: true })).toBeVisible();
      await expect(home.weather().getByText('Máx 26° · Mín 14°', { exact: true })).toBeVisible();
      await expect(home.weather().getByRole('link', { name: 'Open-Meteo' })).toBeVisible();
    });

    test('manda las coordenadas redondeadas en el body y no en la URL', async ({ page }) => {
      const requested = page.waitForRequest(WEATHER_PATH);

      await new HomePage(page).goto();

      const request = await requested;
      expect(request.method()).toBe('POST');
      expect(request.url()).not.toContain('34.6');
      expect(request.postDataJSON()).toEqual({ latitude: -34.6, longitude: -58.38 });
    });

    test('muestra el estado de error cuando la API falla y no un vacío', async ({ page }) => {
      await page.route(WEATHER_PATH, route =>
        route.fulfill({ status: 502, contentType: 'application/json', body: '{"message":"boom"}' })
      );
      const home = new HomePage(page);

      await home.goto();

      await expect(home.weatherError()).toBeVisible();
      await expect(home.weatherNoLocation()).toBeHidden();
    });

    test('un dato stale avisa a qué hora es y una ciudad desconocida muestra solo "Ahora"', async ({ page }) => {
      await page.route(WEATHER_PATH, route =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            city: null,
            temperature: 8,
            condition: 'rain',
            isDay: false,
            min: 5,
            max: 11,
            updatedAt: new Date().toISOString(),
            stale: true,
          }),
        })
      );
      const home = new HomePage(page);

      await home.goto();

      await expect(home.weather().getByText('Ahora', { exact: true })).toBeVisible();
      await expect(home.weather().getByText('Lluvia', { exact: true })).toBeVisible();
      await expect(home.weather().getByText(/Sin datos nuevos: último dato de las/)).toBeVisible();
    });
  });

  test.describe('sin permiso de ubicación', () => {
    test('invita a darla y no llama a la API', async ({ page }) => {
      const calls: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/weather/current')) calls.push(request.url());
      });
      const home = new HomePage(page);

      await home.goto();

      await expect(home.weatherNoLocation()).toBeVisible();
      await expect(home.allowLocationButton()).toBeVisible();
      expect(calls).toHaveLength(0);
    });
  });
});
