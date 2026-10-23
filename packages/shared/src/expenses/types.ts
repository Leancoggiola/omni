import type {
  ExpenseCategory,
  ExpenseReminderPriority,
  ExpenseReminderRecurrence,
  ExpenseReminderStatus,
} from './constants';

export interface PersonalExpense {
  id: string;
  concept: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
  reminderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReminder {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: ExpenseReminderPriority;
  recurrence: ExpenseReminderRecurrence;
  status: ExpenseReminderStatus;
  isOverdue: boolean;
  daysUntilDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensesSummaryByCategory {
  category: ExpenseCategory;
  amount: number;
  count: number;
}

export interface ExpensesSummary {
  totalAmount: number;
  transactionCount: number;
  pendingRemindersCount: number;
  overdueRemindersCount: number;
  activeCategoriesCount: number;
  byCategory: ExpensesSummaryByCategory[];
}
