import type { Achievement, Task, TaskCompletion, XpEvent } from "@/lib/types";

export type Rank = {
  name: string;
  minLevel: number;
};

const ranks: Rank[] = [
  { name: "Recruit", minLevel: 1 },
  { name: "Operator", minLevel: 4 },
  { name: "Captain", minLevel: 8 },
  { name: "Commander", minLevel: 13 },
  { name: "Warden", minLevel: 19 },
];

export function calculateLevel(totalXp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(totalXp, 0) / 100)) + 1);
}

export function xpForLevel(level: number) {
  return Math.pow(Math.max(level - 1, 0), 2) * 100;
}

export function getLevelProgress(totalXp: number) {
  const level = calculateLevel(totalXp);
  const levelStart = xpForLevel(level);
  const nextLevel = xpForLevel(level + 1);
  const progress = ((totalXp - levelStart) / (nextLevel - levelStart)) * 100;

  return {
    level,
    nextLevelXp: nextLevel,
    remainingXp: Math.max(nextLevel - totalXp, 0),
    progress: Math.min(Math.max(progress, 0), 100),
  };
}

export function getRank(level: number) {
  return [...ranks].reverse().find((rank) => level >= rank.minLevel) ?? ranks[0];
}

export function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function getTodayKey() {
  return formatDateKey(new Date());
}

export function isOverdue(task: Task) {
  if (task.status === "completed" || !task.due_at) {
    return false;
  }

  return new Date(task.due_at).getTime() < Date.now();
}

export function isDueToday(task: Task) {
  if (!task.due_at) {
    return false;
  }

  return formatDateKey(new Date(task.due_at)) === getTodayKey();
}

export function calculateCurrentStreak(completions: TaskCompletion[]) {
  const completedDays = new Set(
    completions.map((completion) => formatDateKey(new Date(completion.completed_at))),
  );

  let streak = 0;
  const cursor = new Date();

  while (completedDays.has(formatDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function calculateWeeklyXp(events: XpEvent[]) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  return events
    .filter((event) => new Date(event.created_at) >= weekAgo)
    .reduce((sum, event) => sum + event.points, 0);
}

export function achievementIsUnlocked(
  achievement: Achievement,
  values: {
    totalCompletions: number;
    totalXp: number;
    currentStreak: number;
    criticalCompleted: number;
  },
) {
  switch (achievement.unlock_kind) {
    case "total_completions":
      return values.totalCompletions >= achievement.unlock_threshold;
    case "total_xp":
      return values.totalXp >= achievement.unlock_threshold;
    case "current_streak":
      return values.currentStreak >= achievement.unlock_threshold;
    case "critical_completed":
      return values.criticalCompleted >= achievement.unlock_threshold;
    default: {
      const exhaustiveCheck: never = achievement.unlock_kind as never;
      return exhaustiveCheck;
    }
  }
}
