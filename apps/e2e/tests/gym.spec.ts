import { expect, test } from '../src/fixtures/test';
import { GymPage } from '../src/pages/GymPage';

test.describe('gym', () => {
  test('crea un plan, agrega un ejercicio, carga el peso y lo edita sumando historial', async ({ page, freshUser }) => {
    await freshUser('gimnasio');
    const gym = new GymPage(page);
    await gym.goto();

    await expect(page.getByText('Todavía no tenés planes')).toBeVisible();
    await gym.headerButton('Nuevo plan').click();
    await gym
      .dialog()
      .getByRole('textbox', { name: /Nombre/ })
      .fill('Fuerza 3 días');
    await gym.dialog().getByRole('button', { name: 'Crear plan' }).click();
    await expect(gym.toast('Plan creado')).toBeVisible();
    await expect(page.getByText('Este plan está vacío')).toBeVisible();

    await gym.headerButton('Agregar ejercicio').click();
    await gym.dialog().getByRole('combobox', { name: /Día/ }).click();
    await page.getByRole('option', { name: 'Miércoles', exact: true }).click();
    await gym
      .dialog()
      .getByRole('textbox', { name: /Nombre/ })
      .fill('Sentadilla');
    await gym
      .dialog()
      .getByRole('textbox', { name: /Series/ })
      .fill('4');
    await gym
      .dialog()
      .getByRole('textbox', { name: /Repeticiones/ })
      .fill('12');
    await gym.dialog().getByRole('button', { name: 'Agregar ejercicio' }).click();
    await expect(gym.toast('Ejercicio agregado')).toBeVisible();
    await expect(gym.day('Miércoles')).toContainText('4 series · 12 repeticiones');

    await gym.loadWeightButtonOf('Sentadilla').click();
    await expect(gym.weightField()).toHaveValue('');
    await gym.weightField().fill('60');
    await gym.dialog().getByRole('button', { name: 'Guardar peso' }).click();
    await expect(gym.toast('Peso guardado')).toBeVisible();
    await expect(gym.weightButtonOf('Sentadilla')).toHaveText('60 kg');

    await gym.rowMenuOf('Sentadilla').click();
    await gym.menuItem('Editar').click();
    await gym
      .dialog()
      .getByRole('textbox', { name: /Repeticiones/ })
      .fill('10');
    await gym.dialog().getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(gym.toast('Ejercicio actualizado')).toBeVisible();
    await expect(gym.day('Miércoles')).toContainText('4 series · 10 repeticiones');

    await gym.weightButtonOf('Sentadilla').click();
    await expect(gym.historyTable().getByRole('row')).toHaveCount(2);
    await expect(gym.historyTable().getByRole('row').first()).toContainText('60 kg4 × 10');
  });

  test('mover un ejercicio crea el día y borra el de origen si queda vacío', async ({ page, freshUser }) => {
    await freshUser('mover');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Fuerza');
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'FRIDAY', name: 'Sentadilla', sets: 4, reps: '12' });
    await gym.goto(plan.id);

    await gym.rowMenuOf('Sentadilla').click();
    await gym.menuItem('Mover de día').click();
    await gym
      .dialog()
      .getByRole('combobox', { name: /Mover a/ })
      .click();
    await expect(page.getByRole('option', { name: 'Viernes · ya lo tiene' })).toHaveAttribute(
      'data-combobox-disabled',
      'true'
    );
    await page.getByRole('option', { name: 'Martes', exact: true }).click();
    await gym.dialog().getByRole('button', { name: 'Mover ejercicio' }).click();
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
    await page.getByRole('button', { name: 'Bajar Sentadilla' }).click();
    await expect(page.getByRole('button', { name: 'Bajar Sentadilla' })).toBeFocused();
    await page.getByRole('button', { name: 'Bajar Sentadilla' }).click();
    await expect(page.getByRole('button', { name: 'Bajar Sentadilla' })).toBeFocused();
    await page.getByRole('button', { name: 'Subir Remo con barra' }).click();
    await expect(page.getByRole('button', { name: 'Subir Remo con barra' })).toBeFocused();
    await page.getByRole('button', { name: 'Guardar orden' }).click();
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

    await gym.rowMenuOf('Press militar').click();
    await gym.menuItem('Quitar del día').click();
    const confirmDialog = page.getByRole('dialog', { name: '¿Quitar Press militar del viernes?' });
    await expect(confirmDialog).toContainText('Es el último del viernes: el día también se borra.');
    await expect(confirmDialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await confirmDialog.getByRole('button', { name: 'Quitar ejercicio' }).click();
    await expect(gym.toast('Ejercicio quitado')).toBeVisible();
    await expect(gym.day('Viernes')).toBeHidden();

    await gym.dayMenuOf('Sábado').click();
    await gym.menuItem('Borrar día').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Borrar día' }).click();
    await expect(gym.toast('Día borrado')).toBeVisible();
    await expect(page.getByText('Este plan está vacío')).toBeVisible();
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
    await expect(page.getByText('Solo podés mirarlo. Para editarlo, desarchivalo.')).toBeVisible();
    await expect(gym.headerButton('Agregar ejercicio')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Opciones/ })).toHaveCount(0);

    const blocked = [
      await page.request.patch(`/api/gym/exercises/${exercise.id}`, { data: { name: 'Otra' } }),
      await page.request.patch(`/api/gym/exercises/${exercise.id}/weight`, { data: { weightKg: 10 } }),
      await page.request.delete(`/api/gym/exercises/${exercise.id}`),
      await page.request.patch(`/api/gym/days/${withExercise.days[0]!.id}`, { data: { weekday: 'TUESDAY' } }),
    ];
    for (const res of blocked) {
      expect(res.status()).toBe(409);
      expect(await gym.messageOf(res)).toBe('El plan está archivado');
    }

    await page.getByRole('button', { name: 'Desarchivar plan' }).click();
    await expect(gym.toast('Plan desarchivado')).toBeVisible();
    await expect(gym.headerButton('Agregar ejercicio')).toBeVisible();
  });

  test('contrato de errores de la API: 404, 409 y 204', async ({ page, freshUser }) => {
    await freshUser('contrato');
    const gym = new GymPage(page);
    const plan = await gym.createPlanViaApi('Contrato');
    await gym.addExerciseViaApi({ planId: plan.id, weekday: 'MONDAY', name: 'Sentadilla', sets: 4, reps: '12' });
    await gym.addExerciseViaApi({
      planId: plan.id,
      weekday: 'TUESDAY',
      name: 'Sentadilla',
      sets: 4,
      reps: '12',
    });
    const withThree = await gym.addExerciseViaApi({
      planId: plan.id,
      weekday: 'TUESDAY',
      name: 'Remo',
      sets: 3,
      reps: '10',
    });
    const monday = withThree.days.find(day => day.weekday === 'MONDAY')!;
    const tuesday = withThree.days.find(day => day.weekday === 'TUESDAY')!;

    const dup = await page.request.post('/api/gym/exercises', {
      data: { planId: plan.id, weekday: 'MONDAY', name: 'sentadilla', sets: 4, reps: '12' },
    });
    expect(dup.status()).toBe(409);
    expect(await gym.messageOf(dup)).toBe('El ejercicio ya está en ese día');

    const moveToDup = await page.request.patch(`/api/gym/exercises/${monday.exercises[0]!.id}`, {
      data: { weekday: 'TUESDAY' },
    });
    expect(moveToDup.status()).toBe(409);
    expect(await gym.messageOf(moveToDup)).toBe('El ejercicio ya está en ese día');

    const renameToExisting = await page.request.patch(
      `/api/gym/exercises/${tuesday.exercises.find(e => e.name === 'Remo')!.id}`,
      {
        data: { name: 'Sentadilla', sets: 4, reps: '12' },
      }
    );
    expect(renameToExisting.status()).toBe(409);
    expect(await gym.messageOf(renameToExisting)).toBe('Ya existe un ejercicio con ese nombre, series y repeticiones');

    const takenDay = await page.request.patch(`/api/gym/days/${monday.id}`, { data: { weekday: 'TUESDAY' } });
    expect(takenDay.status()).toBe(409);
    expect(await gym.messageOf(takenDay)).toBe('El plan ya tiene ese día');

    const staleOrder = await page.request.put(`/api/gym/days/${tuesday.id}/exercises/order`, {
      data: { exerciseIds: [tuesday.exercises[0]!.id] },
    });
    expect(staleOrder.status()).toBe(409);
    expect(await gym.messageOf(staleOrder)).toBe('La lista no coincide con los ejercicios del día');

    const reordered = await page.request.put(`/api/gym/days/${tuesday.id}/exercises/order`, {
      data: { exerciseIds: [...tuesday.exercises].reverse().map(exercise => exercise.id) },
    });
    expect(reordered.status()).toBe(200);
    expect(
      (await reordered.json()).days
        .find((d: { weekday: string }) => d.weekday === 'TUESDAY')
        .exercises.map((e: { sortOrder: number }) => e.sortOrder)
    ).toEqual([0, 1]);

    expect((await page.request.get('/api/gym/plans/no-existe')).status()).toBe(404);
    expect((await page.request.patch('/api/gym/exercises/no-existe', { data: { name: 'X' } })).status()).toBe(404);
    expect((await page.request.patch('/api/gym/days/no-existe', { data: { weekday: 'MONDAY' } })).status()).toBe(404);

    const delDay = await page.request.delete(`/api/gym/days/${tuesday.id}`);
    expect(delDay.status()).toBe(204);
    expect((await gym.getPlanViaApi(plan.id)).days.map(day => day.weekday)).toEqual(['MONDAY']);
  });
});
