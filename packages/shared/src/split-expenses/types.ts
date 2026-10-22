export interface SplitFriend {
  id: string;
  name: string;
  alias: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SplitFriendSuggest {
  id: string;
  name: string;
  alias: string | null;
}

export interface GatheringParticipantSummary {
  id: string;
  displayName: string;
  friendId: string | null;
  alias: string | null;
  totalPaid: number;
}

export interface GatheringExpense {
  id: string;
  participantId: string;
  participantName: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

export interface Settlement {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
}

export interface GatheringDetail {
  id: string;
  name: string;
  date: string;
  isSettled: boolean;
  settledAt: string | null;
  participantCount: number;
  totalAmount: number;
  fairShare: number;
  participants: GatheringParticipantSummary[];
  expenses: GatheringExpense[];
  settlements: Settlement[];
}

export interface GatheringSummary {
  id: string;
  name: string;
  date: string;
  isSettled: boolean;
  participantCount: number;
  totalAmount: number;
}
