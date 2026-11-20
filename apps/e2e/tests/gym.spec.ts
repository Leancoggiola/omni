import { expect, test } from '../src/fixtures/test';
import { GymPage } from '../src/pages/GymPage';

test.describe('gym', () => {
  test('crea un plan, agrega un ejercicio, carga el peso y lo edita sumando historial', async ({ page, freshUser }) => {
    await freshUser('gimnasio');
    const gym = new GymPage(page);
    await gym.goto();

    await expect(gym.text('Todavía no tenés planes')).toBeVisible();
    await gym.headerButton('Nuevo plan').click();
    await gym.dialogField(/Nombre/).fill('Fuerza 3 días');
    await gym.dialogButton('Crear plan').click();
    await expect(gym.toast('Plan creado')).toBeVisible();
    await expect(gym.text('Este plan está vacío')).toBeVisible();

    await gym.headerButton('Agregar ejercicio').click();
    await gym.dialogSelect(/Día/).click();
    await gym.option('Miércoles').click();
    await gym.dialogField(/Nombre/).fill('Sentadilla');
    await gym.dialogField(/Series/).fill('4');
    await gym.dialogField(/Repeticiones/).fill('12');
    await gym.dialogButton('Agregar ejercicio').click();
    await expect(gym.toast('Ejercicio agregado')).toBeVisible();
    await expect(gym.day('Miércoles')).toContainText('4 series · 12 repeticiones');

    await gym.loadWeightButtonOf('Sentadilla').click();
    await expect(gym.weightField()).toHaveValue('');
    await gym.weightField().fill('60');
    await gym.dialogButton('Guardar peso').click();
    await expect(gym.toast('Peso guardado')).toBeVisible();
    await expect(gym.weightButtonOf('Sentadilla')).toHaveText('60 kg');

    await gym.rowMenuOf('Sentadilla', 'Miércoles').click();
    await gym.menuItem('Editar').click();
    await gym.dialogField(/Repeticiones/).fill('10');
    await gym.dialogButton('Guardar cambios').click();
    await expect(gym.toast('Ejercicio actualizado')).toBeVisible();
    await expect(gym.day('Miércoles')).toContainText('4 series · 10 repeticiones');

    await gym.weightButtonOf('Sentadilla').click();
    await expect(gym.historyRows()).toHaveCount(2);
    await expect(gym.historyRows().first().getByText('60 kg')).toBeVisible();
    await expect(gym.historyRows().first().getByText('4 × 10')).toBeVisible();
    await expect(gym.historyRows().last().getByText('4 × 12')).toBeVisible();
  });

  test('mover un ejercicio crea el día y borra el de origen si queda vacío', async ({ page, freshUser }) => {
    await freshUser('mover');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Fuerza');
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'FRIDAY', name: 'Sentadilla', sets: 4, reps: '12' });
    await gym.goto(plan.id);

    await gym.rowMenuOf('Sentadilla', 'Lunes').click();
    await gym.menuItem('Mover de día').click();
    await gym.dialogSelect(/Mover a/).click();
    await expect(gym.option('Viernes · ya lo tiene')).toHaveAttribute('data-combobox-disabled', 'true');
    await gym.option('Martes').click();
    await gym.dialogButton('Mover ejercicio').click();
    await expect(gym.toast('Ejercicio movido')).toBeVisible();

    await expect(gym.day('Martes')).toBeVisible();
    await expect(gym.day('Lunes')).toBeHidden();
    const after = await gym.getPlanViaApi(plan.id);
    expect(after.days.map(day => day.weekday).sort()).toEqual(['FRIDAY', 'TUESDAY']);
  });

  test('ordena un día con las flechas y el orden queda guardado con sortOrder consecutivo', async ({
    page,
    freshUser,
  }) => {
    await freshUser('orden');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Fuerza');
    for (const name of ['Sentadilla', 'Press de banca', 'Remo con barra']) {
      await gym.addExerciseViaApi({ planId: plan.id, weekday: 'MONDAY', name, sets: 3, reps: '10' });
    }
    await gym.goto(plan.id);

    await gym.dayMenuOf('Lunes').click();
    await gym.menuItem('Ordenar ejercicios').click();
    await gym.moveButton('Bajar', 'Sentadilla').click();
    await expect(gym.moveButton('Bajar', 'Sentadilla')).toBeFocused();
    await gym.moveButton('Bajar', 'Sentadilla').click();
    await expect(gym.moveButton('Bajar', 'Sentadilla')).toBeFocused();
    await gym.moveButton('Subir', 'Remo con barra').click();
    await expect(gym.moveButton('Subir', 'Remo con barra')).toBeFocused();
    await gym.saveOrderButton().click();
    await expect(gym.toast('Orden guardado')).toBeVisible();

    await expect.poll(() => gym.exerciseNamesOf('Lunes')).toEqual(['Remo con barra', 'Press de banca', 'Sentadilla']);
    await page.reload();
    await expect.poll(() => gym.exerciseNamesOf('Lunes')).toEqual(['Remo con barra', 'Press de banca', 'Sentadilla']);
    const saved = await gym.getPlanViaApi(plan.id);
    expect(saved.days[0]!.exercises.map(exercise => exercise.sortOrder)).toEqual([0, 1, 2]);
  });

  test('quitar el último ejercicio borra el día (204) y borrar un día revalida el plan', async ({
    page,
    freshUser,
  }) => {
    await freshUser('borrar');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Fuerza');
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'FRIDAY', name: 'Press militar', sets: 3, reps: '10' });
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'SATURDAY', name: 'Plancha', sets: 3, reps: '60 s' });
    await gym.goto(plan.id);

    await gym.rowMenuOf('Press militar', 'Viernes').click();
    await gym.menuItem('Quitar del día').click();
    const confirmDialog = gym.confirmDialog('¿Quitar Press militar del viernes?');
    await expect(confirmDialog).toContainText('Es el último del viernes: el día también se borra.');
    await expect(confirmDialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await confirmDialog.getByRole('button', { name: 'Quitar ejercicio' }).click();
    await expect(gym.toast('Ejercicio quitado')).toBeVisible();
    await expect(gym.day('Viernes')).toBeHidden();

    await gym.dayMenuOf('Sábado').click();
    await gym.menuItem('Borrar día').click();
    await gym.dialogButton('Borrar día').click();
    await expect(gym.toast('Día borrado')).toBeVisible();
    await expect(gym.text('Este plan está vacío')).toBeVisible();
    expect((await gym.getPlanViaApi(plan.id)).days).toEqual([]);
  });

  test('un plan archivado es de solo lectura y toda escritura responde 409', async ({ page, freshUser }) => {
    await freshUser('archivo');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Verano');
    const withExercise = await gym.addExerciseViaApi({
      planId: plan.id,
      weekday: 'MONDAY',
      name: 'Dominadas',
      sets: 3,
      reps: 'AMRAP',
    });
    const exercise = withExercise.days[0]!.exercises[0]!;
    await gym.goto(plan.id);

    await gym.planMenu().click();
    await gym.menuItem('Archivar plan').click();
    await expect(gym.toast('Plan archivado')).toBeVisible();
    await expect(gym.text('Solo podés mirarlo. Para editarlo, desarchivalo.')).toBeVisible();
    await expect(gym.headerButton('Agregar ejercicio')).toBeHidden();
    await expect(gym.anyOptionsMenu()).toHaveCount(0);

    const blocked = await gym.writeAttemptsViaApi(exercise.id, withExercise.days[0]!.id);
    for (const res of blocked) {
      expect(res.status()).toBe(409);
      expect(await gym.messageOf(res)).toBe('El plan está archivado');
    }

    const after = await gym.getPlanViaApi(plan.id);
    expect(after.status).toBe('ARCHIVED');
    expect(after.days).toHaveLength(1);
    expect(after.days[0]!.weekday).toBe('MONDAY');
    expect(after.days[0]!.exercises).toMatchObject([{ name: 'Dominadas', currentWeightKg: null }]);

    await gym.unarchiveButton().click();
    await expect(gym.toast('Plan desarchivado')).toBeVisible();
    await expect(gym.headerButton('Agregar ejercicio')).toBeVisible();
  });
});
