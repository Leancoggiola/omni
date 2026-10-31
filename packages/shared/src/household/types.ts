import type { MediaType } from '../media/types';

export interface HouseholdMemberInfo {
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface HouseholdPendingInvite {
  id: string;
  expiresAt: string;
}

export interface HouseholdInfo {
  id: string;
  members: HouseholdMemberInfo[];
  pendingInvite: HouseholdPendingInvite | null;
}

export interface CreatedHouseholdInvite extends HouseholdPendingInvite {
  code: string;
}

export interface HouseholdInvitePreview {
  inviter: { name: string };
  contributes: {
    mediaCount: number;
    pantryProductCount: number;
    shoppingItemCount: number;
  };
  conflicts: {
    media: { tmdbId: number; mediaType: MediaType; title: string }[];
    pantry: { name: string }[];
  };
}
