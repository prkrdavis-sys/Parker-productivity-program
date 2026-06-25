"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BrainCircuit,
  Check,
  ChevronRight,
  CalendarClock,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Hammer,
  Heart,
  Lock,
  type LucideIcon,
  Plus,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Tent,
  TrendingUp,
  Trophy,
} from "lucide-react";
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
  low: "border-stone-600/70 text-stone-300",
  medium: "border-[#7f8d74] text-[#c8d1ba]",
  high: "border-[#d6a84f] text-[#f0c56a]",
  critical: "border-[#cf5b48] text-[#f0a397]",
};

const priorityLabel: Record<Priority, string> = {
  low: "Skirmish",
  medium: "Mission",
  high: "Vanguard",
  critical: "Boss Fight",
};

const cadenceLabels: Record<HabitCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

const categoryIcons: Record<string, LucideIcon> = {
  "home-base": Tent,
  "career-forge": Hammer,
  body: Dumbbell,
  "command-center": Compass,
  skills: BrainCircuit,
  personal: Heart,
};

function categoryIcon(id: string | null | undefined): LucideIcon {
  if (id && categoryIcons[id]) {
    return categoryIcons[id];
  }
  return ScrollText;
}

type Celebration = {
  id: number;
  title: string;
  subtitle: string;
  tone: "gold" | "ember" | "crown";
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
  const [message, setMessage] = useState("Demo mode is active until the realm is bound to Supabase.");
  const [celebration, setCelebration] = useState<Celebration | null>(null);

  const isDemoMode = !supabase || !session;

  const triggerCelebration = useCallback((title: string, subtitle: string, tone: Celebration["tone"]) => {
    setCelebration({ id: Date.now(), title, subtitle, tone });
  }, []);

  useEffect(() => {
    if (!celebration) {
      return;
    }
    const timeout = window.setTimeout(() => setCelebration(null), 1900);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setMessage("Signed in. The realm is bound and synced.");
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
  const overdueTasks = pendingTasks.filter(isOverdue);
  const dueTodayCount = pendingTasks.filter(isDueToday).length;
  const todayTasks = pendingTasks.filter((task) => isDueToday(task) && !isOverdue(task));
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

  const dailyDone = completions.filter(
    (completion) => completion.completed_at.slice(0, 10) === getTodayKey(),
  ).length;
  const dailyTarget = Math.max(3, todayTasks.length + overdueTasks.length);
  const dailyProgress = Math.min(100, Math.round((dailyDone / dailyTarget) * 100));

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
    setMessage("The realm is synced. Your campaign awaits.");
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
      setMessage("Bind Supabase env vars to enter. Demo mode is active right now.");
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
      setMessage(authMode === "signup" ? "Account forged. Confirm by email if required." : "Welcome back, wanderer.");
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
      setMessage("Name the mission before you set out.");
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
    setMessage("Mission inscribed. The road is set.");
  }

  async function addHabit() {
    if (!habitInput.title.trim()) {
      setMessage("Name the quest before you swear the oath.");
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
    setMessage("Oath sworn. The quest is bound to your path.");
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
      description: `Felled ${task.title}`,
    });

    const updatedTasks = tasks.map((currentTask) =>
      currentTask.id === task.id ? { ...currentTask, status: "completed" as const } : currentTask,
    );

    await persistCompletion({
      completion,
      event,
      profileDelta: task.xp_value,
      nextCompletions: [completion, ...completions],
      celebrationTitle: task.priority === "critical" ? "BOSS FELLED" : "MISSION FELLED",
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
      setMessage("This quest is already fulfilled today.");
      return;
    }

    const now = new Date().toISOString();
    const completion = buildCompletion({ taskId: null, habitId: habit.id, points: habit.xp_value });
    const event = buildXpEvent({
      sourceType: "habit",
      sourceId: habit.id,
      points: habit.xp_value,
      description: `Fulfilled ${habit.title}`,
    });

    const updatedHabits = habits.map((currentHabit) =>
      currentHabit.id === habit.id ? { ...currentHabit, last_completed_at: now } : currentHabit,
    );

    await persistCompletion({
      completion,
      event,
      profileDelta: habit.xp_value,
      nextCompletions: [completion, ...completions],
      celebrationTitle: "QUEST FULFILLED",
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
    celebrationTitle,
    persist,
  }: {
    completion: TaskCompletion;
    event: XpEvent;
    profileDelta: number;
    nextCompletions: TaskCompletion[];
    celebrationTitle: string;
    persist: () => Promise<string | null>;
  }) {
    const error = await persist();

    if (error) {
      setMessage(error);
      return;
    }

    const previousLevel = profile.level;
    const nextTotalXp = profile.total_xp + profileDelta;
    const nextStreak = calculateCurrentStreak(nextCompletions);
    const nextLevel = calculateLevel(nextTotalXp);
    const nextProfile = {
      ...profile,
      total_xp: nextTotalXp,
      level: nextLevel,
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
    setMessage(`+${completion.xp_awarded} XP claimed. Keep the momentum.`);

    if (nextLevel > previousLevel) {
      const newRank = getRank(nextLevel);
      triggerCelebration("LEVEL UP", `Level ${nextLevel} — ${newRank.name}`, "crown");
    } else {
      triggerCelebration(celebrationTitle, `+${completion.xp_awarded} XP`, "gold");
    }
  }

  return (
    <main className="relative min-h-[100dvh] parchment-bg text-[var(--foreground)]">
      <div className="gold-dust" />
      <div className="vignette" />
      <div className="grain" />

      {celebration ? <CelebrationOverlay key={celebration.id} celebration={celebration} /> : null}

      <div className="relative z-10">
        <SiteHeader isDemoMode={isDemoMode} isSignedIn={Boolean(session)} onSignOut={handleSignOut} />

        <Hero
          profile={profile}
          rank={rank.name}
          levelProgress={levelProgress}
          message={message}
          dailyDone={dailyDone}
          dailyTarget={dailyTarget}
          dailyProgress={dailyProgress}
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

        {/* Command bar */}
        <section id="dashboard" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <SectionTitle
            icon={Swords}
            kicker="War Table"
            title="Today's Campaign"
            subtitle="The state of the realm at a glance. Strike where it matters most."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Target} label="Due Today" value={String(dueTodayCount)} detail="Missions awaiting" tone="gold" />
            <StatCard icon={Skull} label="Overdue" value={String(overdueTasks.length)} detail="Closing in" tone="ember" />
            <StatCard icon={TrendingUp} label="Week XP" value={String(weeklyXp)} detail="Recent output" tone="gold" />
            <StatCard icon={Trophy} label="Total Wins" value={String(totalCompletions)} detail="Battles won" tone="gold" />
          </div>
        </section>

        {/* Missions */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Panel icon={ScrollText} title="Today's Missions" description="The clearest list of what deserves your steel right now.">
              <TaskList
                tasks={[...overdueTasks, ...todayTasks]}
                categories={categoryById}
                emptyText="No urgent missions. Forge one below or march ahead."
                onComplete={completeTask}
              />
              {upcomingTasks.length > 0 ? (
                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  <h3 className="eyebrow mb-3 flex items-center gap-2">
                    <CalendarClock className="size-3.5" /> On the Horizon
                  </h3>
                  <TaskList
                    tasks={upcomingTasks}
                    categories={categoryById}
                    emptyText="No upcoming missions scheduled yet."
                    onComplete={completeTask}
                  />
                </div>
              ) : null}
            </Panel>

            <Panel icon={Plus} title="Forge a Mission" description="Set a goal, name the stakes, claim the bounty.">
              <TaskForm input={taskInput} categories={categories} onChange={setTaskInput} onSubmit={addTask} />
            </Panel>
          </div>
        </section>

        {/* Planner */}
        <section id="planner" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            icon={Compass}
            kicker="Cartography"
            title="The Map of Your Domains"
            subtitle="Six territories to conquer. Keep every front advancing."
          />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel icon={Shield} title="Domains" description="Every territory you fight to hold.">
              <div className="grid gap-3">
                {categories.map((category) => {
                  const Icon = categoryIcon(category.id);
                  const count = tasks.filter((task) => task.category_id === category.id).length;
                  return (
                    <div
                      key={category.id}
                      className="frame-corners hover-lift rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.55)] p-4"
                    >
                      <span className="corner tr" />
                      <span className="corner bl" />
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex size-10 items-center justify-center rounded-md border"
                            style={{ borderColor: category.color, color: category.color, background: `${category.color}14` }}
                          >
                            <Icon className="size-5" />
                          </span>
                          <h3 className="font-display text-lg tracking-wide">{category.name}</h3>
                        </div>
                        <span className="font-mono text-xs text-[var(--muted)]">{count} active</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{category.description}</p>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel icon={ScrollText} title="Campaign Ledger" description="Pending, scheduled, and conquered — in one scan.">
              <TaskList
                tasks={[...pendingTasks, ...completedTasks].slice(0, 12)}
                categories={categoryById}
                emptyText="No missions yet. Begin with one small, certain win."
                onComplete={completeTask}
              />
            </Panel>
          </div>
        </section>

        {/* Quests */}
        <section id="quests" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            icon={Flame}
            kicker="The Long Road"
            title="Quests & Oaths"
            subtitle="Repeatable rituals that build streaks and feed your momentum."
          />
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <Panel icon={Flame} title="Active Quests" description="Daily and weekly oaths that keep the fire burning.">
              <div className="grid gap-3">
                {habits.length === 0 ? (
                  <EmptyState text="No quests yet. Swear an oath to start building a streak." />
                ) : (
                  habits.map((habit) => {
                    const category = habit.category_id ? categoryById.get(habit.category_id) : null;
                    const Icon = categoryIcon(habit.category_id);
                    const completedToday = habit.last_completed_at?.slice(0, 10) === getTodayKey();

                    return (
                      <article
                        key={habit.id}
                        className={`frame-corners hover-lift rounded-md border p-4 ${completedToday ? "border-[var(--success)]/40 bg-[rgba(155,176,102,0.07)]" : "border-[var(--line)] bg-[rgba(28,24,16,0.55)]"}`}
                      >
                        <span className="corner tr" />
                        <span className="corner bl" />
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-md border border-[var(--line-strong)] text-[var(--gold)]">
                              <Icon className="size-5" />
                            </span>
                            <div>
                              <p className="font-display text-lg tracking-wide">{habit.title}</p>
                              <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">
                                {category?.name ?? "Unassigned"} · {cadenceLabels[habit.cadence]} · {habit.xp_value} XP
                              </p>
                            </div>
                          </div>
                          <button
                            disabled={completedToday}
                            onClick={() => completeHabit(habit)}
                            className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
                          >
                            {completedToday ? (
                              <>
                                <Check className="size-4" /> Fulfilled
                              </>
                            ) : (
                              <>
                                <Flame className="size-4" /> Fulfill
                              </>
                            )}
                          </button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel icon={Plus} title="Swear an Oath" description="Quests are habits, rituals, and recurring upkeep.">
              <HabitForm input={habitInput} categories={categories} onChange={setHabitInput} onSubmit={addHabit} />
            </Panel>
          </div>
        </section>

        {/* Analytics */}
        <section id="analytics" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            icon={TrendingUp}
            kicker="The Chronicle"
            title="Records of the Realm"
            subtitle="Feedback loops that show where the week is heading."
          />
          <div className="grid gap-6 lg:grid-cols-3">
            <Panel icon={Sparkles} title="Recent Glory" description="The latest XP your blade has earned.">
              <div className="grid gap-3">
                {xpEvents.slice(0, 7).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-4 rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.5)] px-3 py-2.5 text-sm"
                  >
                    <span className="truncate text-[var(--muted)]">{event.description}</span>
                    <span className="font-mono font-semibold text-[var(--gold)]">+{event.points}</span>
                  </div>
                ))}
                {xpEvents.length === 0 ? <EmptyState text="No deeds recorded yet." /> : null}
              </div>
            </Panel>

            <Panel icon={Compass} title="Battlefronts" description="Where your effort is concentrated.">
              <div className="grid gap-3">
                {categories.map((category) => {
                  const count = tasks.filter((task) => task.category_id === category.id).length;
                  const max = Math.max(1, ...categories.map((c) => tasks.filter((t) => t.category_id === c.id).length));
                  const width = Math.round((count / max) * 100);
                  return (
                    <div key={category.id}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="text-[var(--muted)]">{category.name}</span>
                        <span className="font-mono text-xs text-[var(--muted)]">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#0b0907]">
                        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: category.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel icon={Award} title="Trophies Won" description="Achievements already claimed.">
              <div className="grid gap-3">
                {unlockedAchievements.slice(0, 4).map((achievement) => (
                  <div
                    key={achievement.id}
                    className="flex items-start gap-3 rounded-md border border-[var(--gold)]/30 bg-[rgba(224,178,76,0.08)] p-3"
                  >
                    <Trophy className="mt-0.5 size-5 shrink-0 text-[var(--gold)]" />
                    <div>
                      <p className="font-display text-sm tracking-wide text-[var(--gold-bright)]">{achievement.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{achievement.description}</p>
                    </div>
                  </div>
                ))}
                {unlockedAchievements.length === 0 ? <EmptyState text="Win battles to claim your first trophy." /> : null}
              </div>
            </Panel>
          </div>
        </section>

        {/* Profile */}
        <section id="profile" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            icon={Crown}
            kicker="The Wanderer"
            title="Your Legend"
            subtitle="Your standing, your streaks, and the trophies yet to claim."
          />
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel icon={Shield} title="Character Sheet" description="Parker's standing across the realm.">
              <div className="flex items-center gap-4">
                <div className="relative flex size-20 items-center justify-center rounded-xl border border-[var(--gold)]/60 bg-[rgba(224,178,76,0.1)]">
                  <span
                    className="absolute inset-0 rounded-xl opacity-40"
                    style={{ backgroundImage: "url('/art/crest.png')", backgroundSize: "cover", backgroundPosition: "center" }}
                  />
                  <span className="relative font-display text-3xl font-black text-[var(--gold-bright)]">
                    {profile.avatar_initials}
                  </span>
                </div>
                <div>
                  <h3 className="font-display text-2xl tracking-wide">{profile.display_name}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--gold)]">
                    <Crown className="size-4" /> Level {levelProgress.level} · {rank.name}
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-2.5 text-sm">
                <LegendRow icon={Sparkles} label="Total XP" value={String(profile.total_xp)} />
                <LegendRow icon={Flame} label="Current streak" value={`${profile.current_streak} days`} />
                <LegendRow icon={TrendingUp} label="Longest streak" value={`${profile.longest_streak} days`} />
                <LegendRow icon={Compass} label="Account" value={session?.user.email ?? "Demo preview"} />
              </div>
            </Panel>

            <Panel icon={Trophy} title="Trophies & Bounties" description="Achievements give every march a reason.">
              <div className="grid gap-3 md:grid-cols-2">
                {[...unlockedAchievements, ...nextAchievements].slice(0, 6).map((achievement) => {
                  const unlocked = unlockedAchievements.some((item) => item.id === achievement.id);
                  return (
                    <article
                      key={achievement.id}
                      className={`hover-lift rounded-md border p-4 ${unlocked ? "border-[var(--gold)]/40 bg-[rgba(224,178,76,0.07)]" : "border-[var(--line)] bg-[rgba(28,24,16,0.5)]"}`}
                    >
                      <div className="flex items-center gap-2">
                        {unlocked ? (
                          <Trophy className="size-4 text-[var(--gold)]" />
                        ) : (
                          <Lock className="size-4 text-[var(--muted-2)]" />
                        )}
                        <p className={`font-display tracking-wide ${unlocked ? "text-[var(--gold-bright)]" : "text-[var(--foreground)]"}`}>
                          {achievement.name}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{achievement.description}</p>
                      <p className="mt-3 font-mono text-xs text-[var(--muted-2)]">
                        {unlocked ? "Claimed" : `Target ${achievement.unlock_threshold}`} · +{achievement.xp_bonus} XP
                      </p>
                    </article>
                  );
                })}
              </div>
            </Panel>
          </div>
        </section>

        <footer className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="gold-rule mb-6" />
          <p className="text-center font-display text-sm tracking-[0.2em] text-[var(--muted-2)]">
            THE LONG ROAD · PARKER&apos;S PRODUCTIVITY PROGRAM
          </p>
        </footer>
      </div>
    </main>
  );
}

function SiteHeader({
  isDemoMode,
  isSignedIn,
  onSignOut,
}: {
  isDemoMode: boolean;
  isSignedIn: boolean;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(10,9,7,0.82)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="#dashboard" className="group flex items-center gap-3">
          <span
            className="size-11 shrink-0 rounded-md border border-[var(--gold)]/40"
            style={{ backgroundImage: "url('/art/crest.png')", backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <span className="leading-tight">
            <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--gold)]">Parker System</span>
            <span className="font-display text-lg tracking-wide">The Long Road</span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 font-display text-sm tracking-wide text-[var(--muted)] md:flex">
          <a href="#dashboard" className="hover:text-[var(--gold-bright)]">War Table</a>
          <a href="#planner" className="hover:text-[var(--gold-bright)]">Map</a>
          <a href="#quests" className="hover:text-[var(--gold-bright)]">Quests</a>
          <a href="#analytics" className="hover:text-[var(--gold-bright)]">Chronicle</a>
          <a href="#profile" className="hover:text-[var(--gold-bright)]">Legend</a>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-1 font-mono text-[11px] text-[var(--muted)] sm:inline-flex">
            <span className={`size-1.5 rounded-full ${isDemoMode ? "bg-[var(--ember)]" : "bg-[var(--success)]"}`} />
            {isDemoMode ? "Demo Mode" : "Live Sync"}
          </span>
          {isSignedIn ? (
            <button onClick={onSignOut} className="btn-ghost rounded-md px-4 py-2 text-sm font-semibold">
              Sign Out
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

type HeroProps = {
  profile: Profile;
  rank: string;
  levelProgress: ReturnType<typeof getLevelProgress>;
  message: string;
  dailyDone: number;
  dailyTarget: number;
  dailyProgress: number;
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
};

function Hero(props: HeroProps) {
  const { profile, rank, levelProgress, message, dailyProgress, dailyDone, dailyTarget } = props;

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundImage: "url('/art/hero-vista.png')", backgroundSize: "cover", backgroundPosition: "center 35%" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[rgba(10,9,7,0.55)] via-[rgba(10,9,7,0.78)] to-[var(--background)]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[rgba(10,9,7,0.85)] via-transparent to-[rgba(10,9,7,0.55)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-24">
        <div className="rise flex flex-col justify-center">
          <p className="eyebrow mb-5 flex items-center gap-2">
            <Compass className="size-3.5" /> Personal Command Center
          </p>
          <h1 className="max-w-3xl font-display text-5xl font-black leading-[0.98] tracking-tight text-[#f7f1df] drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-7xl">
            Rise, <span className="text-gold-gradient">Wanderer</span>.<br />
            Walk the Long Road.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#d8cfb8]">
            Schedule the day, fell your missions, swear your oaths, and earn the XP that turns small wins into
            relentless momentum.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#dashboard" className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold">
              <Swords className="size-4" /> Enter the War Table
            </a>
            <a href="#quests" className="btn-ghost inline-flex items-center justify-center gap-2 rounded-md px-7 py-3.5 text-sm font-bold">
              <Flame className="size-4" /> Swear an Oath
            </a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-[var(--muted)]">
            <Sparkles className="size-4 text-[var(--gold)]" /> {message}
          </p>
        </div>

        <aside className="rise frame frame-corners rounded-lg p-6 shadow-2xl shadow-black/50 backdrop-blur-md">
          <span className="corner tr" />
          <span className="corner bl" />
          <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-5">
            <div>
              <p className="eyebrow">Operator</p>
              <h2 className="mt-1 font-display text-2xl tracking-wide">{profile.display_name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--gold)]">
                <Crown className="size-4" /> {rank}
              </p>
            </div>
            <div
              className="relative flex size-20 items-center justify-center rounded-xl border border-[var(--gold)]/60"
              style={{ backgroundImage: "url('/art/crest.png')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className="absolute inset-0 rounded-xl bg-black/30" />
              <span className="relative font-display text-3xl font-black text-[var(--gold-bright)] drop-shadow">
                {profile.avatar_initials}
              </span>
            </div>
          </div>

          {/* Momentum meter */}
          <div className="mb-5 flex items-center gap-4 rounded-md border border-[var(--ember)]/30 bg-[rgba(217,120,67,0.08)] p-4">
            <Flame className="flame-glow size-9 text-[var(--flame)]" />
            <div className="flex-1">
              <p className="eyebrow text-[var(--ember-bright)]">Momentum</p>
              <p className="font-display text-2xl tracking-wide">
                {profile.current_streak}-Day Streak
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-[var(--muted)]">Best</p>
              <p className="font-display text-xl text-[var(--gold)]">{profile.longest_streak}d</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Level" value={String(levelProgress.level)} />
            <MiniStat label="Total XP" value={String(profile.total_xp)} />
            <MiniStat label="To Next" value={String(levelProgress.remainingXp)} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Level progress</span>
              <span className="font-mono text-[var(--gold)]">{Math.round(levelProgress.progress)}%</span>
            </div>
            <div className="xp-track h-3.5">
              <div className="xp-fill" style={{ width: `${levelProgress.progress}%` }} />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--muted)]">Today&apos;s focus</span>
              <span className="font-mono text-[var(--gold)]">{dailyDone}/{dailyTarget}</span>
            </div>
            <div className="xp-track h-3.5">
              <div className="xp-fill" style={{ width: `${dailyProgress}%` }} />
            </div>
          </div>

          <AuthPanel
            authMode={props.authMode}
            email={props.email}
            password={props.password}
            isLoading={props.isLoading}
            hasSupabase={props.hasSupabase}
            isSignedIn={props.isSignedIn}
            onAuthModeChange={props.onAuthModeChange}
            onEmailChange={props.onEmailChange}
            onPasswordChange={props.onPasswordChange}
            onSubmit={props.onSubmit}
          />
        </aside>
      </div>
    </section>
  );
}

function CelebrationOverlay({ celebration }: { celebration: Celebration }) {
  const Icon = celebration.tone === "crown" ? Crown : celebration.tone === "ember" ? Flame : Swords;
  return (
    <div className="celebrate">
      <div className="celebrate-text">
        <Icon className="mx-auto mb-3 size-16 text-[var(--gold-bright)] drop-shadow-[0_0_24px_rgba(246,213,122,0.8)]" />
        <p className="text-gold-gradient text-5xl font-black tracking-[0.15em] drop-shadow-[0_2px_30px_rgba(0,0,0,0.9)] sm:text-7xl">
          {celebration.title}
        </p>
        <p className="mt-3 font-display text-xl tracking-[0.3em] text-[#e8dcc0]">{celebration.subtitle}</p>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  kicker,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7">
      <p className="eyebrow mb-2 flex items-center gap-2">
        <Icon className="size-3.5" /> {kicker}
      </p>
      <h2 className="font-display text-3xl font-bold tracking-tight text-[#f4ecd6] sm:text-4xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{subtitle}</p>
      <div className="gold-rule mt-5" />
    </div>
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
      <div className="mt-6 flex items-start gap-2.5 rounded-md border border-[var(--success)]/30 bg-[rgba(155,176,102,0.08)] p-4 text-sm text-[var(--muted)]">
        <Shield className="mt-0.5 size-4 shrink-0 text-[var(--success)]" />
        <span>Live account mode is active. Your missions, quests, XP, and legend sync through Supabase.</span>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-md border border-[var(--line)] bg-[rgba(8,7,5,0.5)] p-4">
      <div className="mb-4 flex rounded-md border border-[var(--line)] p-1 font-display text-sm tracking-wide">
        <button
          onClick={() => onAuthModeChange("signin")}
          className={`flex-1 rounded px-3 py-2 ${authMode === "signin" ? "btn-gold" : "text-[var(--muted)]"}`}
        >
          Enter
        </button>
        <button
          onClick={() => onAuthModeChange("signup")}
          className={`flex-1 rounded px-3 py-2 ${authMode === "signup" ? "btn-gold" : "text-[var(--muted)]"}`}
        >
          Begin
        </button>
      </div>
      <div className="grid gap-3">
        <Field label="Email">
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} type="email" className="field-input" />
        </Field>
        <Field label="Password">
          <input
            value={password}
            onChange={(event) => onPasswordChange(event.target.value)}
            type="password"
            className="field-input"
          />
        </Field>
        <button
          disabled={isLoading || !hasSupabase}
          onClick={onSubmit}
          className="btn-gold mt-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold"
        >
          {hasSupabase ? (isLoading ? "Working" : "Continue the Road") : "Bind Supabase Env Vars"}
        </button>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="frame frame-corners rounded-lg p-5 shadow-xl shadow-black/30 sm:p-6">
      <span className="corner tr" />
      <span className="corner bl" />
      <div className="mb-5 flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--gold)]/40 bg-[rgba(224,178,76,0.08)] text-[var(--gold)]">
          <Icon className="size-5" />
        </span>
        <div className="max-w-2xl">
          <h2 className="font-display text-xl font-bold tracking-wide">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "gold" | "ember";
}) {
  const color = tone === "ember" ? "var(--ember-bright)" : "var(--gold)";
  return (
    <div className="frame-corners hover-lift rounded-lg border border-[var(--line)] bg-[rgba(28,24,16,0.6)] p-5">
      <span className="corner tr" />
      <span className="corner bl" />
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
        <Icon className="size-5" style={{ color }} />
      </div>
      <p className="mt-3 font-display text-4xl font-black tracking-tight" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[rgba(8,7,5,0.45)] p-3 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-[var(--gold-bright)]">{value}</p>
    </div>
  );
}

function LegendRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.45)] px-3 py-2.5">
      <span className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="size-4 text-[var(--gold)]" /> {label}
      </span>
      <span className="font-mono text-sm text-[var(--foreground)]">{value}</span>
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
        const Icon = categoryIcon(task.category_id);
        const done = task.status === "completed";
        return (
          <article
            key={task.id}
            className={`frame-corners hover-lift rounded-md border p-4 ${done ? "border-[var(--line)] bg-[rgba(8,7,5,0.4)] opacity-70" : "border-[var(--line)] bg-[rgba(28,24,16,0.55)]"}`}
          >
            <span className="corner tr" />
            <span className="corner bl" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-[var(--line-strong)] text-[var(--gold)]">
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-display text-base tracking-wide ${done ? "text-[var(--muted)] line-through" : ""}`}>
                      {task.title}
                    </h3>
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${priorityStyles[task.priority]}`}>
                      {priorityLabel[task.priority]}
                    </span>
                  </div>
                  <p className="mt-1.5 font-mono text-xs text-[var(--muted)]">
                    {category?.name ?? "Unassigned"} · {task.xp_value} XP
                    {task.due_at ? ` · Due ${new Date(task.due_at).toLocaleDateString()}` : ""}
                  </p>
                  {task.notes ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{task.notes}</p> : null}
                </div>
              </div>
              <button
                disabled={done}
                onClick={() => onComplete(task)}
                className="btn-gold inline-flex shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold"
              >
                {done ? (
                  <>
                    <Check className="size-4" /> Felled
                  </>
                ) : (
                  <>
                    <Swords className="size-4" /> Fell It
                  </>
                )}
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
          placeholder="Ship the portfolio update…"
          onChange={(event) => onChange({ ...input, title: event.target.value })}
          className="field-input"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Domain">
          <select
            value={input.category_id}
            onChange={(event) => onChange({ ...input, category_id: event.target.value })}
            className="field-input"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Stakes">
          <select
            value={input.priority}
            onChange={(event) => onChange({ ...input, priority: event.target.value as Priority })}
            className="field-input"
          >
            <option value="low">Skirmish</option>
            <option value="medium">Mission</option>
            <option value="high">Vanguard</option>
            <option value="critical">Boss Fight</option>
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Due time">
          <input
            type="datetime-local"
            value={input.due_at}
            onChange={(event) => onChange({ ...input, due_at: event.target.value })}
            className="field-input"
          />
        </Field>
        <Field label="Schedule date">
          <input
            type="date"
            value={input.scheduled_for}
            onChange={(event) => onChange({ ...input, scheduled_for: event.target.value })}
            className="field-input"
          />
        </Field>
        <Field label="XP bounty">
          <input
            type="number"
            min="5"
            step="5"
            value={input.xp_value}
            onChange={(event) => onChange({ ...input, xp_value: Number(event.target.value) })}
            className="field-input"
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          value={input.notes}
          placeholder="The smallest visible step to victory…"
          onChange={(event) => onChange({ ...input, notes: event.target.value })}
          rows={3}
          className="field-input"
        />
      </Field>
      <button onClick={onSubmit} className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold">
        <Plus className="size-4" /> Inscribe Mission
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
          placeholder="Train the body…"
          onChange={(event) => onChange({ ...input, title: event.target.value })}
          className="field-input"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Domain">
          <select
            value={input.category_id}
            onChange={(event) => onChange({ ...input, category_id: event.target.value })}
            className="field-input"
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
            className="field-input"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </Field>
        <Field label="XP bounty">
          <input
            type="number"
            min="5"
            step="5"
            value={input.xp_value}
            onChange={(event) => onChange({ ...input, xp_value: Number(event.target.value) })}
            className="field-input"
          />
        </Field>
      </div>
      <button onClick={onSubmit} className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold">
        <Flame className="size-4" /> Swear the Oath
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
      <span className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-dashed border-[var(--line)] bg-[rgba(8,7,5,0.35)] p-5 text-sm leading-6 text-[var(--muted)]">
      <ChevronRight className="size-4 shrink-0 text-[var(--gold)]" />
      {text}
    </div>
  );
}
