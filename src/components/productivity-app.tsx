"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  defaultAchievements,
  defaultCategories,
  demoCompletions,
  demoHabits,
  demoProfile,
  demoTasks,
  demoXpEvents,
} from "@/lib/demo-data";
import {
  achievementIsUnlocked,
  calculateCurrentStreak,
  calculateLevel,
  calculateWeeklyXp,
  getLevelProgress,
  getRank,
  getTodayKey,
  isDueToday,
  isOverdue,
} from "@/lib/progression";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  Achievement,
  Habit,
  HabitCadence,
  NewHabitInput,
  NewTaskInput,
  Priority,
  Profile,
  Task,
  TaskCategory,
  TaskCompletion,
  UserAchievement,
  XpEvent,
} from "@/lib/types";

const initialTaskInput: NewTaskInput = {
  title: "",
  category_id: "career-forge",
  priority: "medium",
  due_at: "",
  scheduled_for: getTodayKey(),
  notes: "",
  xp_value: 35,
};

const initialHabitInput: NewHabitInput = {
  title: "",
  category_id: "body",
  cadence: "daily",
  xp_value: 30,
};

const priorityStyles: Record<Priority, string> = {
  low: "border-stone-600 text-stone-300",
  medium: "border-[#7f8d74] text-[#c8d1ba]",
  high: "border-[#d6a84f] text-[#f0c56a]",
  critical: "border-[#d06d5f] text-[#f0a397]",
};

const cadenceLabels: Record<HabitCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
};

export function ProductivityApp() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<Profile>(demoProfile);
  const [categories, setCategories] = useState<TaskCategory[]>(defaultCategories);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [habits, setHabits] = useState<Habit[]>(demoHabits);
  const [completions, setCompletions] = useState<TaskCompletion[]>(demoCompletions);
  const [xpEvents, setXpEvents] = useState<XpEvent[]>(demoXpEvents);
  const [achievements, setAchievements] = useState<Achievement[]>(defaultAchievements);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [taskInput, setTaskInput] = useState<NewTaskInput>(initialTaskInput);
  const [habitInput, setHabitInput] = useState<NewHabitInput>(initialHabitInput);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Demo mode is active until Supabase env vars are configured.");

  const isDemoMode = !supabase || !session;

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setMessage("Signed in and synced with Supabase.");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const categoryById = useMemo(() => {
    return new Map(categories.map((category) => [category.id, category]));
  }, [categories]);

  const completedTasks = tasks.filter((task) => task.status === "completed");
  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const todayTasks = pendingTasks.filter(isDueToday);
  const overdueTasks = pendingTasks.filter(isOverdue);
  const upcomingTasks = pendingTasks.filter((task) => !isDueToday(task) && !isOverdue(task)).slice(0, 5);
  const criticalCompleted = completedTasks.filter((task) => task.priority === "critical").length;
  const totalCompletions = completions.length;
  const weeklyXp = calculateWeeklyXp(xpEvents);
  const levelProgress = getLevelProgress(profile.total_xp);
  const rank = getRank(levelProgress.level);
  const unlockedAchievements = achievements.filter((achievement) =>
    achievementIsUnlocked(achievement, {
      totalCompletions,
      totalXp: profile.total_xp,
      currentStreak: profile.current_streak,
      criticalCompleted,
    }),
  );
  const nextAchievements = achievements.filter(
    (achievement) =>
      !unlockedAchievements.some((unlocked) => unlocked.id === achievement.id) &&
      !userAchievements.some((userAchievement) => userAchievement.achievement_id === achievement.id),
  );

  const loadWorkspace = useCallback(async () => {
    if (!supabase || !session) {
      return;
    }

    setIsLoading(true);
    const user = session.user;
    const displayName = user.email?.split("@")[0] === "parker" ? "Parker" : "Parker";

    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: displayName,
          avatar_initials: "P",
        },
        { onConflict: "id" },
      )
      .select("*")
      .single();

    if (profileError) {
      setMessage(profileError.message);
      setIsLoading(false);
      return;
    }

    const [
      categoryResult,
      taskResult,
      habitResult,
      completionResult,
      xpResult,
      achievementResult,
      userAchievementResult,
    ] = await Promise.all([
      supabase.from("task_categories").select("*").order("sort_order", { ascending: true }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("habits").select("*").order("created_at", { ascending: false }),
      supabase.from("task_completions").select("*").order("completed_at", { ascending: false }),
      supabase.from("xp_events").select("*").order("created_at", { ascending: false }),
      supabase.from("achievements").select("*").order("unlock_threshold", { ascending: true }),
      supabase.from("user_achievements").select("*").order("unlocked_at", { ascending: false }),
    ]);

    if (
      categoryResult.error ||
      taskResult.error ||
      habitResult.error ||
      completionResult.error ||
      xpResult.error ||
      achievementResult.error ||
      userAchievementResult.error
    ) {
      setMessage("Supabase is connected, but one or more tables are missing. Run the migration in the README.");
      setIsLoading(false);
      return;
    }

    const nextCategories = (categoryResult.data as TaskCategory[]) ?? defaultCategories;

    setProfile(profileRow as Profile);
    setCategories(nextCategories);
    setTasks((taskResult.data as Task[]) ?? []);
    setHabits((habitResult.data as Habit[]) ?? []);
    setCompletions((completionResult.data as TaskCompletion[]) ?? []);
    setXpEvents((xpResult.data as XpEvent[]) ?? []);
    setAchievements((achievementResult.data as Achievement[]) ?? defaultAchievements);
    setUserAchievements((userAchievementResult.data as UserAchievement[]) ?? []);
    if (nextCategories[0]) {
      setTaskInput((current) => ({ ...current, category_id: nextCategories[0].id }));
      setHabitInput((current) => ({ ...current, category_id: nextCategories[0].id }));
    }
    setMessage("Workspace synced with Supabase.");
    setIsLoading(false);
  }, [session, supabase]);

  useEffect(() => {
    if (!supabase || !session) {
      return;
    }

    // The restored Supabase session is the external signal that should hydrate app data.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace();
  }, [loadWorkspace, session, supabase]);

  async function handleAuth() {
    if (!supabase) {
      setMessage("Add Supabase env vars to use login. Demo mode is active right now.");
      return;
    }

    if (!email || password.length < 6) {
      setMessage("Enter an email and a password with at least 6 characters.");
      return;
    }

    setIsLoading(true);
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else {
      setMessage(authMode === "signup" ? "Account created. Check email settings if confirmation is required." : "Signed in.");
    }
    setIsLoading(false);
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    setMessage("Signed out. Demo mode is active.");
  }

  async function addTask() {
    if (!taskInput.title.trim()) {
      setMessage("Give the mission a clear title first.");
      return;
    }

    const selectedCategory = categories.some((category) => category.id === taskInput.category_id)
      ? taskInput.category_id
      : (categories[0]?.id ?? "");

    const nextTask: Task = {
      id: crypto.randomUUID(),
      user_id: session?.user.id ?? "demo-user",
      category_id: selectedCategory || null,
      title: taskInput.title.trim(),
      notes: taskInput.notes.trim() || null,
      status: "pending",
      priority: taskInput.priority,
      due_at: taskInput.due_at ? new Date(taskInput.due_at).toISOString() : null,
      scheduled_for: taskInput.scheduled_for || null,
      xp_value: Number(taskInput.xp_value) || 25,
    };

    if (supabase && session) {
      const { data, error } = await supabase.from("tasks").insert(nextTask).select("*").single();
      if (error) {
        setMessage(error.message);
        return;
      }
      setTasks((current) => [data as Task, ...current]);
    } else {
      setTasks((current) => [nextTask, ...current]);
    }

    setTaskInput({ ...initialTaskInput, category_id: selectedCategory || initialTaskInput.category_id });
    setMessage("Mission added.");
  }

  async function addHabit() {
    if (!habitInput.title.trim()) {
      setMessage("Give the quest a clear title first.");
      return;
    }

    const selectedCategory = categories.some((category) => category.id === habitInput.category_id)
      ? habitInput.category_id
      : (categories[0]?.id ?? "");

    const nextHabit: Habit = {
      id: crypto.randomUUID(),
      user_id: session?.user.id ?? "demo-user",
      category_id: selectedCategory || null,
      title: habitInput.title.trim(),
      cadence: habitInput.cadence,
      xp_value: Number(habitInput.xp_value) || 20,
      active: true,
      last_completed_at: null,
    };

    if (supabase && session) {
      const { data, error } = await supabase.from("habits").insert(nextHabit).select("*").single();
      if (error) {
        setMessage(error.message);
        return;
      }
      setHabits((current) => [data as Habit, ...current]);
    } else {
      setHabits((current) => [nextHabit, ...current]);
    }

    setHabitInput({ ...initialHabitInput, category_id: selectedCategory || initialHabitInput.category_id });
    setMessage("Quest added.");
  }

  async function completeTask(task: Task) {
    if (task.status === "completed") {
      return;
    }

    const completion = buildCompletion({ taskId: task.id, habitId: null, points: task.xp_value });
    const event = buildXpEvent({
      sourceType: "task",
      sourceId: task.id,
      points: task.xp_value,
      description: `Completed ${task.title}`,
    });

    const updatedTasks = tasks.map((currentTask) =>
      currentTask.id === task.id ? { ...currentTask, status: "completed" as const } : currentTask,
    );

    await persistCompletion({
      completion,
      event,
      profileDelta: task.xp_value,
      nextCompletions: [completion, ...completions],
      persist: async () => {
        if (!supabase || !session) {
          return null;
        }

        const { error: taskError } = await supabase
          .from("tasks")
          .update({ status: "completed" })
          .eq("id", task.id);
        if (taskError) {
          return taskError.message;
        }

        const { error: completionError } = await supabase.from("task_completions").insert(completion);
        if (completionError) {
          return completionError.message;
        }

        const { error: eventError } = await supabase.from("xp_events").insert(event);
        return eventError?.message ?? null;
      },
    });

    setTasks(updatedTasks);
  }

  async function completeHabit(habit: Habit) {
    if (habit.last_completed_at && getTodayKey() === habit.last_completed_at.slice(0, 10)) {
      setMessage("This quest is already complete for today.");
      return;
    }

    const now = new Date().toISOString();
    const completion = buildCompletion({ taskId: null, habitId: habit.id, points: habit.xp_value });
    const event = buildXpEvent({
      sourceType: "habit",
      sourceId: habit.id,
      points: habit.xp_value,
      description: `Completed ${habit.title}`,
    });

    const updatedHabits = habits.map((currentHabit) =>
      currentHabit.id === habit.id ? { ...currentHabit, last_completed_at: now } : currentHabit,
    );

    await persistCompletion({
      completion,
      event,
      profileDelta: habit.xp_value,
      nextCompletions: [completion, ...completions],
      persist: async () => {
        if (!supabase || !session) {
          return null;
        }

        const { error: habitError } = await supabase
          .from("habits")
          .update({ last_completed_at: now })
          .eq("id", habit.id);
        if (habitError) {
          return habitError.message;
        }

        const { error: completionError } = await supabase.from("task_completions").insert(completion);
        if (completionError) {
          return completionError.message;
        }

        const { error: eventError } = await supabase.from("xp_events").insert(event);
        return eventError?.message ?? null;
      },
    });

    setHabits(updatedHabits);
  }

  function buildCompletion({
    taskId,
    habitId,
    points,
  }: {
    taskId: string | null;
    habitId: string | null;
    points: number;
  }): TaskCompletion {
    return {
      id: crypto.randomUUID(),
      user_id: session?.user.id ?? "demo-user",
      task_id: taskId,
      habit_id: habitId,
      completed_at: new Date().toISOString(),
      xp_awarded: points,
    };
  }

  function buildXpEvent({
    sourceType,
    sourceId,
    points,
    description,
  }: {
    sourceType: "task" | "habit";
    sourceId: string;
    points: number;
    description: string;
  }): XpEvent {
    return {
      id: crypto.randomUUID(),
      user_id: session?.user.id ?? "demo-user",
      source_type: sourceType,
      source_id: sourceId,
      points,
      description,
      created_at: new Date().toISOString(),
    };
  }

  async function persistCompletion({
    completion,
    event,
    profileDelta,
    nextCompletions,
    persist,
  }: {
    completion: TaskCompletion;
    event: XpEvent;
    profileDelta: number;
    nextCompletions: TaskCompletion[];
    persist: () => Promise<string | null>;
  }) {
    const error = await persist();

    if (error) {
      setMessage(error);
      return;
    }

    const nextTotalXp = profile.total_xp + profileDelta;
    const nextStreak = calculateCurrentStreak(nextCompletions);
    const nextProfile = {
      ...profile,
      total_xp: nextTotalXp,
      level: calculateLevel(nextTotalXp),
      current_streak: nextStreak,
      longest_streak: Math.max(profile.longest_streak, nextStreak),
    };

    if (supabase && session) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          total_xp: nextProfile.total_xp,
          level: nextProfile.level,
          current_streak: nextProfile.current_streak,
          longest_streak: nextProfile.longest_streak,
        })
        .eq("id", session.user.id);

      if (profileError) {
        setMessage(profileError.message);
        return;
      }
    }

    setCompletions(nextCompletions);
    setXpEvents((current) => [event, ...current]);
    setProfile(nextProfile);
    setMessage(`+${completion.xp_awarded} XP logged. Keep moving.`);
  }

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="grain" />
      <div className="tactical-grid min-h-[100dvh]">
        <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(13,15,12,0.88)] backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="#dashboard" className="group">
              <span className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
                Parker System
              </span>
              <span className="text-lg font-semibold tracking-tight">Productivity Program</span>
            </a>
            <nav className="hidden items-center gap-6 text-sm text-[var(--muted)] md:flex">
              <a href="#planner" className="hover:text-[var(--foreground)]">
                Planner
              </a>
              <a href="#quests" className="hover:text-[var(--foreground)]">
                Quests
              </a>
              <a href="#analytics" className="hover:text-[var(--foreground)]">
                Analytics
              </a>
              <a href="#profile" className="hover:text-[var(--foreground)]">
                Profile
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-[var(--line)] px-3 py-1 font-mono text-xs text-[var(--muted)] sm:inline-flex">
                {isDemoMode ? "Demo Mode" : "Live Sync"}
              </span>
              {session ? (
                <button
                  onClick={handleSignOut}
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)]"
                >
                  Sign Out
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mx-auto grid min-h-[calc(100dvh-80px)] max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.24em] text-[var(--accent)]">
              Personal command center
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#f7f1df] sm:text-6xl lg:text-7xl">
              Parker&apos;s Productivity Program
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">
              Schedule the day, clear missions, earn XP, and keep momentum visible.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#dashboard"
                className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-[#16130b] hover:bg-[var(--accent-strong)]"
              >
                Open Dashboard
              </a>
              <a
                href="#planner"
                className="inline-flex items-center justify-center rounded-full border border-[var(--line)] px-6 py-3 text-sm font-bold text-[var(--foreground)] hover:border-[var(--accent)]"
              >
                Add Mission
              </a>
            </div>
            <p className="mt-5 text-sm text-[var(--muted)]">{message}</p>
          </div>

          <aside className="rounded-[28px] border border-[var(--line)] bg-[rgba(21,24,18,0.92)] p-5 shadow-2xl shadow-black/30 sm:p-6">
            <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--muted)]">Operator</p>
                <h2 className="mt-1 text-2xl font-semibold">{profile.display_name}</h2>
              </div>
              <div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--accent)] bg-[rgba(214,168,79,0.12)] text-2xl font-black text-[var(--accent)]">
                {profile.avatar_initials}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Level" value={String(levelProgress.level)} detail={rank.name} />
              <StatCard label="XP" value={String(profile.total_xp)} detail={`${levelProgress.remainingXp} to next`} />
              <StatCard label="Streak" value={`${profile.current_streak}d`} detail="Current run" />
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[var(--muted)]">Level progress</span>
                <span className="font-mono text-[var(--accent)]">{Math.round(levelProgress.progress)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#282d20]">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${levelProgress.progress}%` }}
                />
              </div>
            </div>

            <AuthPanel
              authMode={authMode}
              email={email}
              password={password}
              isLoading={isLoading}
              hasSupabase={Boolean(supabase)}
              isSignedIn={Boolean(session)}
              onAuthModeChange={setAuthMode}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onSubmit={handleAuth}
            />
          </aside>
        </section>

        <section id="dashboard" className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="grid gap-5 lg:grid-cols-4">
            <StatCard label="Today" value={String(todayTasks.length)} detail="Due missions" />
            <StatCard label="Overdue" value={String(overdueTasks.length)} detail="Needs attention" />
            <StatCard label="Week XP" value={String(weeklyXp)} detail="Recent output" />
            <StatCard label="Wins" value={String(totalCompletions)} detail="Completed records" />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <Panel title="Today's Missions" description="The clearest list of what deserves attention now.">
              <TaskList
                tasks={[...overdueTasks, ...todayTasks]}
                categories={categoryById}
                emptyText="No urgent missions. Add one below or work ahead."
                onComplete={completeTask}
              />
              <div className="mt-5 border-t border-[var(--line)] pt-5">
                <h3 className="mb-3 text-sm font-semibold text-[var(--muted)]">Upcoming</h3>
                <TaskList
                  tasks={upcomingTasks}
                  categories={categoryById}
                  emptyText="No upcoming missions scheduled yet."
                  onComplete={completeTask}
                />
              </div>
            </Panel>

            <Panel title="Add Mission" description="Create a task with a category, schedule, priority, and XP reward.">
              <TaskForm
                input={taskInput}
                categories={categories}
                onChange={setTaskInput}
                onSubmit={addTask}
              />
            </Panel>
          </div>
        </section>

        <section id="planner" className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <Panel title="Category Command" description="Hybrid labels keep the app clear without losing the game-like tone.">
            <div className="grid gap-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="font-semibold">{category.name}</h3>
                    <span className="h-2 w-12 rounded-full" style={{ backgroundColor: category.color }} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{category.description}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Planner" description="Pending, scheduled, and upcoming missions in one scan.">
            <TaskList
              tasks={[...pendingTasks, ...completedTasks].slice(0, 12)}
              categories={categoryById}
              emptyText="No missions yet. Start with one small win."
              onComplete={completeTask}
            />
          </Panel>
        </section>

        <section id="quests" className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <Panel title="Active Quests" description="Repeatable routines that build streaks and keep XP moving.">
            <div className="grid gap-3">
              {habits.length === 0 ? (
                <EmptyState text="No quests yet. Add a recurring routine to start building a streak." />
              ) : (
                habits.map((habit) => {
                  const category = habit.category_id ? categoryById.get(habit.category_id) : null;
                  const completedToday = habit.last_completed_at?.slice(0, 10) === getTodayKey();

                  return (
                    <article
                      key={habit.id}
                      className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-4"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold">{habit.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted)]">
                            {category?.name ?? "Unassigned"} - {cadenceLabels[habit.cadence]} - {habit.xp_value} XP
                          </p>
                        </div>
                        <button
                          disabled={completedToday}
                          onClick={() => completeHabit(habit)}
                          className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#16130b] disabled:cursor-not-allowed disabled:bg-[#34382c] disabled:text-[var(--muted)]"
                        >
                          {completedToday ? "Complete Today" : "Log Quest"}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </Panel>

          <Panel title="Add Quest" description="Use quests for habits, rituals, and recurring maintenance.">
            <HabitForm
              input={habitInput}
              categories={categories}
              onChange={setHabitInput}
              onSubmit={addHabit}
            />
          </Panel>
        </section>

        <section id="analytics" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Panel title="Analytics" description="Simple feedback loops that show where the week is going.">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-5">
                <h3 className="font-semibold">Recent XP</h3>
                <div className="mt-5 grid gap-3">
                  {xpEvents.slice(0, 6).map((event) => (
                    <div key={event.id} className="flex items-center justify-between gap-4 text-sm">
                      <span className="truncate text-[var(--muted)]">{event.description}</span>
                      <span className="font-mono text-[var(--accent)]">+{event.points}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-5">
                <h3 className="font-semibold">Category Load</h3>
                <div className="mt-5 grid gap-3">
                  {categories.map((category) => {
                    const count = tasks.filter((task) => task.category_id === category.id).length;
                    return (
                      <div key={category.id} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--muted)]">{category.name}</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-5">
                <h3 className="font-semibold">Achievement Track</h3>
                <div className="mt-5 grid gap-3">
                  {unlockedAchievements.slice(0, 3).map((achievement) => (
                    <div key={achievement.id} className="rounded-xl bg-[rgba(214,168,79,0.1)] p-3">
                      <p className="text-sm font-semibold text-[var(--accent)]">{achievement.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{achievement.description}</p>
                    </div>
                  ))}
                  {unlockedAchievements.length === 0 ? <EmptyState text="Complete missions to unlock badges." /> : null}
                </div>
              </div>
            </div>
          </Panel>
        </section>

        <section id="profile" className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <Panel title="Profile" description="Parker's RPG card, current standing, and account state.">
            <div className="flex items-center gap-4">
              <div className="flex size-20 items-center justify-center rounded-3xl border border-[var(--accent)] bg-[rgba(214,168,79,0.12)] text-3xl font-black text-[var(--accent)]">
                {profile.avatar_initials}
              </div>
              <div>
                <h3 className="text-2xl font-semibold">{profile.display_name}</h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Level {levelProgress.level} {rank.name}
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-[var(--muted)]">
              <p>Total XP: {profile.total_xp}</p>
              <p>Current streak: {profile.current_streak} days</p>
              <p>Longest streak: {profile.longest_streak} days</p>
              <p>Account: {session?.user.email ?? "Demo preview"}</p>
            </div>
          </Panel>

          <Panel title="Next Unlocks" description="Achievements give the system a reason to keep returning.">
            <div className="grid gap-3 md:grid-cols-2">
              {[...nextAchievements, ...unlockedAchievements].slice(0, 6).map((achievement) => {
                const unlocked = unlockedAchievements.some((item) => item.id === achievement.id);
                return (
                  <article
                    key={achievement.id}
                    className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-4"
                  >
                    <p className={unlocked ? "font-semibold text-[var(--accent)]" : "font-semibold"}>
                      {achievement.name}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{achievement.description}</p>
                    <p className="mt-3 font-mono text-xs text-[var(--muted)]">
                      {unlocked ? "Unlocked" : `${achievement.unlock_threshold} target`} - +{achievement.xp_bonus} XP
                    </p>
                  </article>
                );
              })}
            </div>
          </Panel>
        </section>
      </div>
    </main>
  );
}

function AuthPanel({
  authMode,
  email,
  password,
  isLoading,
  hasSupabase,
  isSignedIn,
  onAuthModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  authMode: "signin" | "signup";
  email: string;
  password: string;
  isLoading: boolean;
  hasSupabase: boolean;
  isSignedIn: boolean;
  onAuthModeChange: (mode: "signin" | "signup") => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
}) {
  if (isSignedIn) {
    return (
      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[rgba(134,169,107,0.08)] p-4 text-sm text-[var(--muted)]">
        Live account mode is active. Your missions, quests, XP, and profile sync through Supabase.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-4">
      <div className="mb-4 flex rounded-full border border-[var(--line)] p-1 text-sm">
        <button
          onClick={() => onAuthModeChange("signin")}
          className={`flex-1 rounded-full px-3 py-2 ${authMode === "signin" ? "bg-[var(--accent)] text-[#16130b]" : "text-[var(--muted)]"}`}
        >
          Sign In
        </button>
        <button
          onClick={() => onAuthModeChange("signup")}
          className={`flex-1 rounded-full px-3 py-2 ${authMode === "signup" ? "bg-[var(--accent)] text-[#16130b]" : "text-[var(--muted)]"}`}
        >
          Sign Up
        </button>
      </div>
      <div className="grid gap-3">
        <Field label="Email">
          <input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            type="email"
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            type="password"
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <button
          disabled={isLoading || !hasSupabase}
          onClick={onSubmit}
          className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#16130b] disabled:cursor-not-allowed disabled:bg-[#34382c] disabled:text-[var(--muted)]"
        >
          {hasSupabase ? (isLoading ? "Working" : "Continue") : "Add Supabase Env Vars"}
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--line)] bg-[rgba(21,24,18,0.86)] p-5 shadow-xl shadow-black/20 sm:p-6">
      <div className="mb-5 max-w-2xl">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.035)] p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function TaskList({
  tasks,
  categories,
  emptyText,
  onComplete,
}: {
  tasks: Task[];
  categories: Map<string, TaskCategory>;
  emptyText: string;
  onComplete: (task: Task) => void;
}) {
  if (tasks.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  return (
    <div className="grid gap-3">
      {tasks.map((task) => {
        const category = task.category_id ? categories.get(task.category_id) : null;
        return (
          <article
            key={task.id}
            className="rounded-2xl border border-[var(--line)] bg-[rgba(244,241,232,0.03)] p-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={task.status === "completed" ? "font-semibold text-[var(--muted)] line-through" : "font-semibold"}>
                    {task.title}
                  </h3>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${priorityStyles[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {category?.name ?? "Unassigned"} - {task.xp_value} XP
                  {task.due_at ? ` - Due ${new Date(task.due_at).toLocaleDateString()}` : ""}
                </p>
                {task.notes ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{task.notes}</p> : null}
              </div>
              <button
                disabled={task.status === "completed"}
                onClick={() => onComplete(task)}
                className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[#16130b] disabled:cursor-not-allowed disabled:bg-[#34382c] disabled:text-[var(--muted)]"
              >
                {task.status === "completed" ? "Complete" : "Finish"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TaskForm({
  input,
  categories,
  onChange,
  onSubmit,
}: {
  input: NewTaskInput;
  categories: TaskCategory[];
  onChange: (input: NewTaskInput) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Mission title">
        <input
          value={input.title}
          onChange={(event) => onChange({ ...input, title: event.target.value })}
          className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            value={input.category_id}
            onChange={(event) => onChange({ ...input, category_id: event.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={input.priority}
            onChange={(event) => onChange({ ...input, priority: event.target.value as Priority })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Due time">
          <input
            type="datetime-local"
            value={input.due_at}
            onChange={(event) => onChange({ ...input, due_at: event.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="Schedule date">
          <input
            type="date"
            value={input.scheduled_for}
            onChange={(event) => onChange({ ...input, scheduled_for: event.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
        <Field label="XP reward">
          <input
            type="number"
            min="5"
            step="5"
            value={input.xp_value}
            onChange={(event) => onChange({ ...input, xp_value: Number(event.target.value) })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={input.notes}
          onChange={(event) => onChange({ ...input, notes: event.target.value })}
          rows={3}
          className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <button onClick={onSubmit} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#16130b]">
        Add Mission
      </button>
    </div>
  );
}

function HabitForm({
  input,
  categories,
  onChange,
  onSubmit,
}: {
  input: NewHabitInput;
  categories: TaskCategory[];
  onChange: (input: NewHabitInput) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-4">
      <Field label="Quest title">
        <input
          value={input.title}
          onChange={(event) => onChange({ ...input, title: event.target.value })}
          className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category">
          <select
            value={input.category_id}
            onChange={(event) => onChange({ ...input, category_id: event.target.value })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cadence">
          <select
            value={input.cadence}
            onChange={(event) => onChange({ ...input, cadence: event.target.value as HabitCadence })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="XP reward">
          <input
            type="number"
            min="5"
            step="5"
            value={input.xp_value}
            onChange={(event) => onChange({ ...input, xp_value: Number(event.target.value) })}
            className="w-full rounded-xl border border-[var(--line)] bg-[#10130e] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
        </Field>
      </div>
      <button onClick={onSubmit} className="rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#16130b]">
        Add Quest
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(244,241,232,0.025)] p-5 text-sm leading-6 text-[var(--muted)]">
      {text}
    </div>
  );
}
