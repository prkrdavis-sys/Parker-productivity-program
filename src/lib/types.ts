export type Priority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "pending" | "completed" | "archived";

export type HabitCadence = "daily" | "weekly" | "custom";

export type SourceType = "task" | "habit" | "achievement";

export type TaskCategory = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  description: string;
  color: string;
  sort_order: number;
  created_at?: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_initials: string;
  total_xp: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  created_at?: string;
  updated_at?: string;
};

export type Task = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  due_at: string | null;
  scheduled_for: string | null;
  xp_value: number;
  created_at?: string;
  updated_at?: string;
};

export type Habit = {
  id: string;
  user_id: string;
  category_id: string | null;
  title: string;
  cadence: HabitCadence;
  xp_value: number;
  active: boolean;
  last_completed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TaskCompletion = {
  id: string;
  user_id: string;
  task_id: string | null;
  habit_id: string | null;
  completed_at: string;
  xp_awarded: number;
};

export type XpEvent = {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_id: string | null;
  points: number;
  description: string;
  created_at: string;
};

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  xp_bonus: number;
  unlock_kind: string;
  unlock_threshold: number;
};

export type UserAchievement = {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
};

export type NewTaskInput = {
  title: string;
  category_id: string;
  priority: Priority;
  due_at: string;
  scheduled_for: string;
  notes: string;
  xp_value: number;
};

export type NewHabitInput = {
  title: string;
  category_id: string;
  cadence: HabitCadence;
  xp_value: number;
};
