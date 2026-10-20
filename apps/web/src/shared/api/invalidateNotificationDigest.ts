import { SWR_KEYS } from './keys';

type RevalidateMutator = (key: string) => Promise<unknown>;

export async function invalidateNotificationDigest(mutate: RevalidateMutator) {
  await mutate(SWR_KEYS.notifications.digest);
}
