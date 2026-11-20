import type { APIResponse, Page } from '@playwright/test';

interface ApiExercise {
  id: string;
  catalogId: string;
  name: string;
  sets: number | null;
  reps: string;
  currentWeightKg: number | null;
  sortOrder: number;
}

export interface ApiPlan {
  id: string;
  status: string;
  days: { id: string; weekday: string; exercises: ApiExercise[] }[];
}

export class GymPage {
  constructor(private readonly page: Page) {}

  readonly dialog = () => this.page.getByRole('dialog');
  readonly toast = (text: string) =>
    this.page
      .locator('.mantine-Notifications-notification')
      .filter({ has: this.page.getByText(text, { exact: true }) });
  readonly day = (label: string) => this.page.getByRole('region', { name: label });
  readonly headerButton = (name: string) => this.page.getByRole('button', { name }).first();
  readonly planMenu = () => this.page.getByRole('button', { name: 'Acciones del plan' });
  readonly menuItem = (name: string) => this.page.getByRole('menuitem', { name });
  readonly dayMenuOf = (label: string) =>
    this.page.getByRole('button', { name: `Opciones del ${label.toLowerCase()}` });
  readonly rowMenuOf = (name: string) => this.page.getByRole('button', { name: `Opciones de ${name}` }).first();
  readonly weightButtonOf = (name: string) => this.page.getByRole('button', { name: new RegExp(`^Peso de ${name}:`) });
  readonly loadWeightButtonOf = (name: string) => this.page.getByRole('button', { name: `Cargar peso de ${name}` });
  readonly weightField = () => this.dialog().getByRole('textbox', { name: 'Peso en kg' });
  readonly historyTable = () => this.dialog().getByRole('table', { name: 'Historial de peso' });

  async goto(planId?: string) {
    await this.page.goto(planId ? `/gym?plan=${planId}` : '/gym');
  }

  async exerciseNamesOf(dayLabel: string) {
    return this.day(dayLabel)
      .getByRole('button', { name: /^(Peso de|Cargar peso de) / })
      .evaluateAll(buttons =>
        buttons.map(button =>
          (button.getAttribute('aria-label') ?? '').replace(/^(Peso de |Cargar peso de )/, '').replace(/:.*$/, '')
        )
      );
  }

  async createPlanViaApi(name: string): Promise<ApiPlan> {
    const res = await this.page.request.post('/api/gym/plans', { data: { name } });
    if (!res.ok()) throw new Error(`No se pudo precargar el plan: ${await res.text()}`);
    return res.json();
  }

  async addExerciseViaApi(data: { planId: string; weekday: string; name: string; sets?: number | null; reps: string }) {
    const res = await this.page.request.post('/api/gym/exercises', { data });
    if (!res.ok()) throw new Error(`No se pudo precargar el ejercicio: ${await res.text()}`);
    return (await res.json()) as ApiPlan;
  }

  /** Mensaje del cuerpo de error de la API (`{ statusCode, message }`). */
  async messageOf(res: APIResponse) {
    return ((await res.json()) as { message: string }).message;
  }

  async getPlanViaApi(planId: string) {
    const res = await this.page.request.get(`/api/gym/plans/${planId}`);
    return (await res.json()) as ApiPlan;
  }
}
