import { autoCloseMs, enqueueNotification, type NotificationRequest, type NotificationVariant } from './notify';

function request(id: number, variant: NotificationVariant): NotificationRequest {
  return { id, variant, title: variant, message: `#${id}` };
}

const ids = (items: NotificationRequest[]) => items.map(item => item.id);

describe('enqueueNotification', () => {
  it('agrega al final mientras haya lugar', () => {
    let items: NotificationRequest[] = [];
    items = enqueueNotification(items, request(1, 'success'));
    items = enqueueNotification(items, request(2, 'info'));
    items = enqueueNotification(items, request(3, 'warning'));
    expect(ids(items)).toEqual([1, 2, 3]);
  });

  it('no muta la lista recibida', () => {
    const items = [request(1, 'success')];
    enqueueNotification(items, request(2, 'info'));
    expect(ids(items)).toEqual([1]);
  });

  it('con 3 visibles descarta la más vieja', () => {
    const items = [request(1, 'success'), request(2, 'info'), request(3, 'warning')];
    expect(ids(enqueueNotification(items, request(4, 'success')))).toEqual([2, 3, 4]);
  });

  it('salta los errores: descarta la más vieja que no sea error', () => {
    const items = [request(1, 'error'), request(2, 'success'), request(3, 'info')];
    expect(ids(enqueueNotification(items, request(4, 'success')))).toEqual([1, 3, 4]);
  });

  it('descarta la nueva si todas las demás son errores y la nueva no', () => {
    const items = [request(1, 'error'), request(2, 'error'), request(3, 'error')];
    expect(ids(enqueueNotification(items, request(4, 'success')))).toEqual([1, 2, 3]);
  });

  it('si todas son errores descarta el más viejo', () => {
    const items = [request(1, 'error'), request(2, 'error'), request(3, 'error')];
    expect(ids(enqueueNotification(items, request(4, 'error')))).toEqual([2, 3, 4]);
  });
});

describe('autoCloseMs', () => {
  it('deja los errores el doble que el resto', () => {
    expect(autoCloseMs('error')).toBe(8000);
    for (const variant of ['success', 'info', 'warning'] as const) {
      expect(autoCloseMs(variant)).toBe(4000);
    }
  });
});
