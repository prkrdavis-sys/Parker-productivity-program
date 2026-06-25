import type {
  Achievement,
  Habit,
  Profile,
  Task,
  TaskCategory,
  TaskCompletion,
  XpEvent,
} from "@/lib/types";

const demoUserId = "demo-user";
const today = new Date();
const tomorrow = new Date();
tomorrow.setDate(today.getDate() + 1);
const yesterday = new Date();
yesterday.setDate(today.getDate() - 1);

export const defaultCategories: TaskCategory[] = [
  {
    id: "home-base",
    user_id: null,
    name: "Home Base",
    slug: "home-base",
    description: "House work, repairs, resets, and personal environment.",
    color: "#d6a84f",
    sort_order: 1,
  },
  {
    id: "career-forge",
    user_id: null,
    name: "Career Forge",
    slug: "career-forge",
    description: "Deep work, job growth, portfolio, and professional moves.",
    color: "#9fa86d",
    sort_order: 2,
  },
  {
    id: "body",
    user_id: null,
    name: "Body",
    slug: "body",
    description: "Training, recovery, nutrition, and health maintenance.",
    color: "#b9835a",
    sort_order: 3,
  },
  {
    id: "command-center",
    user_id: null,
    name: "Command Center",
    slug: "command-center",
    description: "Bills, planning, admin, calendar, and logistics.",
    color: "#7f8d74",
    sort_order: 4,
  },
  {
    id: "skills",
    user_id: null,
    name: "Skills",
    slug: "skills",
    description: "Learning, practice, reading, and deliberate improvement.",
    color: "#b6a26d",
    sort_order: 5,
  },
  {
    id: "personal",
    user_id: null,
    name: "Personal",
    slug: "personal",
    description: "Relationships, recovery, errands, and life maintenance.",
    color: "#a87562",
    sort_order: 6,
  },
];

export const defaultAchievements: Achievement[] = [
  {
    id: "first-win",
    code: "first-win",
    name: "First Win",
    description: "Complete your first mission.",
    xp_bonus: 25,
    unlock_kind: "total_completions",
    unlock_threshold: 1,
  },
  {
    id: "ten-count",
    code: "ten-count",
    name: "Ten Count",
    description: "Complete ten missions.",
    xp_bonus: 75,
    unlock_kind: "total_completions",
    unlock_threshold: 10,
  },
  {
    id: "three-day-streak",
    code: "three-day-streak",
    name: "Three-Day Streak",
    description: "Log wins three days in a row.",
    xp_bonus: 100,
    unlock_kind: "current_streak",
    unlock_threshold: 3,
  },
  {
    id: "high-stakes",
    code: "high-stakes",
    name: "High Stakes",
    description: "Complete five critical missions.",
    xp_bonus: 125,
    unlock_kind: "critical_completed",
    unlock_threshold: 5,
  },
  {
    id: "level-keeper",
    code: "level-keeper",
    name: "Level Keeper",
    description: "Earn 1,000 XP.",
    xp_bonus: 150,
    unlock_kind: "total_xp",
    unlock_threshold: 1000,
  },
];

export const demoProfile: Profile = {
  id: demoUserId,
  display_name: "Parker",
  avatar_initials: "P",
  total_xp: 385,
  level: 2,
  current_streak: 2,
  longest_streak: 4,
};

export const demoTasks: Task[] = [
  {
    id: "task-reset-kitchen",
    user_id: demoUserId,
    category_id: "home-base",
    title: "Reset kitchen and clear counters",
    notes: "Fast cleanup before the evening shutdown.",
    status: "pending",
    priority: "medium",
    due_at: today.toISOString(),
    scheduled_for: today.toISOString().slice(0, 10),
    xp_value: 35,
  },
  {
    id: "task-career-block",
    user_id: demoUserId,
    category_id: "career-forge",
    title: "Ship one focused portfolio improvement",
    notes: "Pick the smallest visible improvement and finish it.",
    status: "pending",
    priority: "high",
    due_at: tomorrow.toISOString(),
    scheduled_for: tomorrow.toISOString().slice(0, 10),
    xp_value: 60,
  },
  {
    id: "task-admin",
    user_id: demoUserId,
    category_id: "command-center",
    title: "Review bills and calendar",
    notes: "Close loops before they become noise.",
    status: "pending",
    priority: "critical",
    due_at: yesterday.toISOString(),
    scheduled_for: yesterday.toISOString().slice(0, 10),
    xp_value: 75,
  },
];

export const demoHabits: Habit[] = [
  {
    id: "habit-training",
    user_id: demoUserId,
    category_id: "body",
    title: "Training session",
    cadence: "daily",
    xp_value: 45,
    active: true,
    last_completed_at: yesterday.toISOString(),
  },
  {
    id: "habit-study",
    user_id: demoUserId,
    category_id: "skills",
    title: "Thirty minutes of learning",
    cadence: "daily",
    xp_value: 30,
    active: true,
    last_completed_at: null,
  },
];

export const demoCompletions: TaskCompletion[] = [
  {
    id: "completion-1",
    user_id: demoUserId,
    task_id: null,
    habit_id: "habit-training",
    completed_at: today.toISOString(),
    xp_awarded: 45,
  },
  {
    id: "completion-2",
    user_id: demoUserId,
    task_id: "task-old",
    habit_id: null,
    completed_at: yesterday.toISOString(),
    xp_awarded: 40,
  },
];

export const demoXpEvents: XpEvent[] = [
  {
    id: "xp-1",
    user_id: demoUserId,
    source_type: "habit",
    source_id: "habit-training",
    points: 45,
    description: "Completed Training session",
    created_at: today.toISOString(),
  },
  {
    id: "xp-2",
    user_id: demoUserId,
    source_type: "task",
    source_id: "task-old",
    points: 40,
    description: "Completed weekly review",
    created_at: yesterday.toISOString(),
  },
];
