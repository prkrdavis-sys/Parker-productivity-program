"use client";

import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  CalendarClock,
  Compass,
  Crown,
  Dumbbell,
  Flame,
  Hammer,
  Heart,
  LogOut,
  Lock,
  type LucideIcon,
  Plus,
  RotateCcw,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Tent,
  TrendingUp,
  Trophy,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
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

const priorityColor: Record<Priority, string> = {
  low: "#9c917a",
  medium: "#9bb066",
  high: "#e0b24c",
  critical: "#cf5b48",
};

const cadenceLabels: Record<HabitCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  custom: "Custom",
};

type GoalSuggestion = {
  title: string;
  notes: string;
  categoryId: string;
  priority: Priority;
  xpValue: number;
};

type GoalRecommendation = {
  categoryId: string;
  priority: Priority;
  xpValue: number;
};

const goalSuggestions: GoalSuggestion[] = [
  ...demoTasks.map((task) => ({
    title: task.title,
    notes: task.notes ?? "",
    categoryId: task.category_id ?? initialTaskInput.category_id,
    priority: task.priority,
    xpValue: task.xp_value,
  })),
  {
    title: "Do a 20-minute room reset",
    notes: "Pick one room, clear surfaces, and put loose items back where they belong.",
    categoryId: "home-base",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Run one load of laundry start to finish",
    notes: "Wash, dry, fold, and put it away before it becomes another open loop.",
    categoryId: "home-base",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Take out trash and reset entryway",
    notes: "Clear the obvious clutter and make the first step into the home feel clean.",
    categoryId: "home-base",
    priority: "low",
    xpValue: 25,
  },
  {
    title: "Plan tomorrow's top three missions",
    notes: "Choose the three wins that would make tomorrow feel controlled.",
    categoryId: "command-center",
    priority: "medium",
    xpValue: 30,
  },
  {
    title: "Clear email and inbox for 15 minutes",
    notes: "Delete noise, reply where needed, and capture anything that needs a real task.",
    categoryId: "command-center",
    priority: "medium",
    xpValue: 30,
  },
  {
    title: "Review budget and upcoming bills",
    notes: "Check balances, due dates, and anything that needs action this week.",
    categoryId: "command-center",
    priority: "critical",
    xpValue: 80,
  },
  {
    title: "Block calendar for focused work",
    notes: "Protect a work block and remove one avoidable schedule conflict.",
    categoryId: "command-center",
    priority: "high",
    xpValue: 55,
  },
  {
    title: "Apply to one strong opportunity",
    notes: "Send one thoughtful application, message, or follow-up that can create momentum.",
    categoryId: "career-forge",
    priority: "high",
    xpValue: 65,
  },
  {
    title: "Improve one resume bullet",
    notes: "Make one bullet more concrete, measurable, and outcome-focused.",
    categoryId: "career-forge",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Write a short portfolio case-study note",
    notes: "Capture the problem, what you built, and the result in one tight pass.",
    categoryId: "career-forge",
    priority: "high",
    xpValue: 60,
  },
  {
    title: "Fix one annoying project bug",
    notes: "Choose one bug, reproduce it, and ship the smallest clean fix.",
    categoryId: "career-forge",
    priority: "high",
    xpValue: 65,
  },
  {
    title: "Do a 30-minute learning sprint",
    notes: "Study one focused topic and write down the useful takeaway.",
    categoryId: "skills",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Practice one hard skill drill",
    notes: "Repeat one exercise deliberately until the weak spot is clearer.",
    categoryId: "skills",
    priority: "medium",
    xpValue: 40,
  },
  {
    title: "Read ten pages and capture one insight",
    notes: "Keep it simple: read, underline the useful idea, and write one sentence.",
    categoryId: "skills",
    priority: "low",
    xpValue: 25,
  },
  {
    title: "Train for 30 minutes",
    notes: "Complete a basic strength, cardio, or mixed session.",
    categoryId: "body",
    priority: "high",
    xpValue: 60,
  },
  {
    title: "Take a recovery walk",
    notes: "Get outside or move gently long enough to reset energy.",
    categoryId: "body",
    priority: "medium",
    xpValue: 30,
  },
  {
    title: "Prep one healthy meal",
    notes: "Make one meal that supports the rest of the day instead of draining it.",
    categoryId: "body",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Start bedtime shutdown routine",
    notes: "Set up tomorrow, reduce screens, and give the body a real off-ramp.",
    categoryId: "body",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Send one important check-in message",
    notes: "Reach out to someone who matters with a real note, not a placeholder.",
    categoryId: "personal",
    priority: "medium",
    xpValue: 30,
  },
  {
    title: "Book or confirm one appointment",
    notes: "Close the scheduling loop and put the appointment on the calendar.",
    categoryId: "personal",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Handle one lingering errand",
    notes: "Pick the errand that has been taking up mental space and finish it.",
    categoryId: "personal",
    priority: "medium",
    xpValue: 35,
  },
  {
    title: "Do one deliberate rest block",
    notes: "Take a real recovery block without turning it into another obligation.",
    categoryId: "personal",
    priority: "low",
    xpValue: 20,
  },
  {
    title: "Close the most overdue loop",
    notes: "Find the task creating the most pressure and finish the smallest honest version.",
    categoryId: "command-center",
    priority: "critical",
    xpValue: 85,
  },
];

const priorityXp: Record<Priority, number> = {
  low: 20,
  medium: 35,
  high: 60,
  critical: 80,
};

const categorySignals: Array<{ categoryId: string; keywords: string[] }> = [
  {
    categoryId: "home-base",
    keywords: ["clean", "clear", "counter", "kitchen", "laundry", "repair", "reset", "room", "trash"],
  },
  {
    categoryId: "career-forge",
    keywords: ["career", "client", "code", "deploy", "job", "portfolio", "project", "resume", "ship", "work"],
  },
  {
    categoryId: "body",
    keywords: ["body", "cardio", "exercise", "gym", "lift", "meal", "recovery", "run", "train", "walk", "workout"],
  },
  {
    categoryId: "command-center",
    keywords: ["admin", "bill", "budget", "calendar", "email", "finance", "inbox", "invoice", "plan", "review"],
  },
  {
    categoryId: "skills",
    keywords: ["book", "course", "learn", "lesson", "practice", "read", "skill", "study", "tutorial", "write"],
  },
  {
    categoryId: "personal",
    keywords: ["appointment", "call", "errand", "family", "friend", "personal", "rest", "social"],
  },
];

const categoryIcons: Record<string, LucideIcon> = {
  "home-base": Tent,
  "career-forge": Hammer,
  body: Dumbbell,
  "command-center": Compass,
  skills: BrainCircuit,
  personal: Heart,
};

const glossaryTerms = [
  {
    term: "War Table",
    kind: "Dashboard",
    definition: "The day-at-a-glance command post: urgent missions, overdue threats, weekly XP, and total wins.",
  },
  {
    term: "Mission",
    kind: "Task",
    definition: "A concrete one-time task with a finish line, a domain, a due time, and an XP reward.",
  },
  {
    term: "Skirmish",
    kind: "Low stakes",
    definition: "A light mission. Useful for small chores, quick maintenance, and easy momentum.",
  },
  {
    term: "Vanguard",
    kind: "High stakes",
    definition: "A high-priority mission that should lead the charge because it meaningfully moves the week forward.",
  },
  {
    term: "Boss Fight",
    kind: "Critical stakes",
    definition: "The hardest or most urgent class of mission. These are the must-win battles with the biggest pressure.",
  },
  {
    term: "Quest",
    kind: "Habit",
    definition: "A recurring practice, ritual, or upkeep loop that can be fulfilled daily, weekly, or on a custom cadence.",
  },
  {
    term: "Oath",
    kind: "Commitment",
    definition: "The act of creating or keeping a quest. Swearing an oath means binding a recurring behavior to the road.",
  },
  {
    term: "Career Forge",
    kind: "Domain",
    definition: "The domain for deep work, job growth, portfolio work, professional moves, and career momentum.",
  },
  {
    term: "Home Base",
    kind: "Domain",
    definition: "The domain for house work, repairs, resets, and keeping your environment ready for the next march.",
  },
  {
    term: "Command Center",
    kind: "Domain",
    definition: "The logistics domain: bills, planning, admin, calendar work, and closing loops before they sprawl.",
  },
  {
    term: "Domain",
    kind: "Category",
    definition: "A territory of life where work belongs, such as Home Base, Career Forge, Body, Skills, or Personal.",
  },
  {
    term: "Campaign Ledger",
    kind: "Task list",
    definition: "The wider roll of pending, scheduled, and conquered missions beyond the immediate War Table.",
  },
  {
    term: "On the Horizon",
    kind: "Upcoming work",
    definition: "Missions that are scheduled ahead of today, visible early so they do not become surprise boss fights.",
  },
  {
    term: "Battlefronts",
    kind: "Analytics",
    definition: "A scan of where active work is concentrated across domains so you can see which fronts are heating up.",
  },
  {
    term: "Chronicle",
    kind: "Records",
    definition: "The record of recent glory: XP events, trophies, trends, and evidence that effort is compounding.",
  },
  {
    term: "XP",
    kind: "Progress",
    definition: "Experience points earned by completing missions and fulfilling quests. XP drives levels and momentum.",
  },
  {
    term: "Bounty",
    kind: "Reward",
    definition: "The XP value attached to a mission, quest, or trophy. Bigger stakes usually deserve a bigger bounty.",
  },
  {
    term: "Fell It",
    kind: "Action",
    definition: "The completion action for a mission. When a task is finished, it is marked as felled and pays out XP.",
  },
  {
    term: "Fulfill",
    kind: "Action",
    definition: "The completion action for a quest or oath. Fulfilling it records the ritual and feeds the streak.",
  },
  {
    term: "Legend",
    kind: "Profile",
    definition: "Your character sheet: level, rank, streaks, account state, and the trophies still waiting to be claimed.",
  },
  {
    term: "Rank",
    kind: "Progress title",
    definition: "A title earned through levels, from Recruit toward Operator, Captain, Commander, and Warden.",
  },
  {
    term: "Momentum",
    kind: "Streak",
    definition: "The current run of days with recorded wins. It is the fire you keep alive by showing up repeatedly.",
  },
  {
    term: "Trophies",
    kind: "Achievements",
    definition: "Milestones earned for wins, streaks, XP, and high-stakes completions. They mark proof of progress.",
  },
  {
    term: "The Long Road",
    kind: "System theme",
    definition: "The whole productivity journey: small victories, recurring rituals, earned progress, and patient advancement.",
  },
  {
    term: "Local Profiles",
    kind: "Account state",
    definition: "The offline profile state when Supabase is not bound or no one is signed in. Profiles can be added and switched locally.",
  },
  {
    term: "Live Sync",
    kind: "Account state",
    definition: "The signed-in state where missions, quests, XP, and legend data are bound to Supabase.",
  },
] as const;

function categoryIcon(id: string | null | undefined): LucideIcon {
  if (id && categoryIcons[id]) {
    return categoryIcons[id];
  }
  return ScrollText;
}

function selectAvailableCategory(categoryId: string, categories: TaskCategory[], fallbackCategoryId: string) {
  if (categories.some((category) => category.id === categoryId)) {
    return categoryId;
  }

  return categories[0]?.id ?? fallbackCategoryId;
}

function inferGoalCategory(text: string, categories: TaskCategory[], fallbackCategoryId: string) {
  const normalized = text.toLowerCase();
  const scoredCategories = categories.map((category) => {
    const signal = categorySignals.find((item) => item.categoryId === category.id);
    const directMatch = [category.name, category.slug, category.description]
      .filter(Boolean)
      .some((value) => normalized.includes(value.toLowerCase()));
    const keywordScore = signal?.keywords.filter((keyword) => normalized.includes(keyword)).length ?? 0;

    return {
      id: category.id,
      score: keywordScore + (directMatch ? 2 : 0),
    };
  });

  const bestMatch = scoredCategories.sort((a, b) => b.score - a.score)[0];
  if (bestMatch && bestMatch.score > 0) {
    return bestMatch.id;
  }

  return selectAvailableCategory(fallbackCategoryId, categories, fallbackCategoryId);
}

function inferGoalPriority(text: string): Priority {
  const normalized = text.toLowerCase();

  if (/\b(urgent|critical|overdue|deadline|boss|must|tax|bill|invoice)\b/.test(normalized)) {
    return "critical";
  }

  if (/\b(ship|finish|launch|deep work|portfolio|important|hard|proposal|build)\b/.test(normalized)) {
    return "high";
  }

  if (/\b(quick|small|tiny|easy|minor|five minutes|5 minutes)\b/.test(normalized)) {
    return "low";
  }

  return "medium";
}

function suggestGoalDetails(input: NewTaskInput, categories: TaskCategory[]): GoalRecommendation {
  const text = `${input.title} ${input.notes}`.trim();

  if (!text) {
    return {
      categoryId: selectAvailableCategory(input.category_id, categories, initialTaskInput.category_id),
      priority: input.priority,
      xpValue: input.xp_value,
    };
  }

  const priority = inferGoalPriority(text);
  const lengthBonus = text.length > 90 ? 10 : text.length > 45 ? 5 : 0;
  const xpValue = Math.min(100, priorityXp[priority] + lengthBonus);

  return {
    categoryId: inferGoalCategory(text, categories, input.category_id || initialTaskInput.category_id),
    priority,
    xpValue,
  };
}

function applyGoalAutomation(input: NewTaskInput, categories: TaskCategory[]): NewTaskInput {
  const recommendation = suggestGoalDetails(input, categories);

  return {
    ...input,
    category_id: recommendation.categoryId,
    priority: recommendation.priority,
    xp_value: recommendation.xpValue,
  };
}

type Celebration = {
  id: number;
  title: string;
  subtitle: string;
  tone: "gold" | "ember" | "crown";
};

type LocalWorkspace = {
  profile: Profile;
  tasks: Task[];
  habits: Habit[];
  completions: TaskCompletion[];
  xpEvents: XpEvent[];
  userAchievements: UserAchievement[];
};

type GalleryArtwork = {
  id: string;
  title: string;
  kicker: string;
  description: string;
  src: string;
  position: string;
};

type AppView = "dashboard" | "trophies";

const trophiesPath = "/trophies";

function viewFromPath(pathname: string): AppView {
  return pathname === trophiesPath ? "trophies" : "dashboard";
}

const galleryArtworks: GalleryArtwork[] = [
  {
    id: "hero-vista",
    title: "The Long Road Vista",
    kicker: "Opening Vista",
    description: "The campaign horizon that sits behind the hero and frames the day as a journey.",
    src: "/art/hero-vista.webp",
    position: "center 35%",
  },
  {
    id: "map-backdrop",
    title: "Realm Cartography",
    kicker: "Page Backdrop",
    description: "The full-page map texture underneath the command panels and daily campaign.",
    src: "/art/map-backdrop.webp",
    position: "center",
  },
  {
    id: "crest",
    title: "Wanderer's Crest",
    kicker: "Profile Sigil",
    description: "The small heraldic mark used for the profile, header, and character sheet.",
    src: "/art/crest.webp",
    position: "center",
  },
];

const localWorkspaceStorageKey = "parker-productivity-program.local-workspaces.v1";

const initialLocalWorkspace: LocalWorkspace = {
  profile: demoProfile,
  tasks: demoTasks,
  habits: demoHabits,
  completions: demoCompletions,
  xpEvents: demoXpEvents,
  userAchievements: [],
};

function getProfileInitials(displayName: string) {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "P";
}

function getProfileFirstLetter(displayName: string) {
  return displayName.trim()[0]?.toUpperCase() ?? "P";
}

type ProfileMenuPosition = {
  top: number;
  right: number;
  maxHeight: number;
};

function lockBodyScroll() {
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  return scrollY;
}

function unlockBodyScroll(scrollY: number) {
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, scrollY);
}

function createLocalWorkspace(displayName: string): LocalWorkspace {
  const name = displayName.trim() || "New Profile";
  const id = `local-${crypto.randomUUID()}`;

  return {
    profile: {
      id,
      display_name: name,
      avatar_initials: getProfileInitials(name),
      total_xp: 0,
      level: 1,
      current_streak: 0,
      longest_streak: 0,
    },
    tasks: [],
    habits: [],
    completions: [],
    xpEvents: [],
    userAchievements: [],
  };
}

function readLocalWorkspaceState(): { activeProfileId: string; workspaces: LocalWorkspace[] } {
  try {
    const stored = window.localStorage.getItem(localWorkspaceStorageKey);
    if (!stored) {
      return { activeProfileId: demoProfile.id, workspaces: [initialLocalWorkspace] };
    }

    const parsed = JSON.parse(stored) as { activeProfileId?: string; workspaces?: LocalWorkspace[] };
    const workspaces = parsed.workspaces?.filter((workspace) => workspace.profile?.id) ?? [];
    if (workspaces.length === 0) {
      return { activeProfileId: demoProfile.id, workspaces: [initialLocalWorkspace] };
    }

    const storedActiveProfileId = parsed.activeProfileId;
    const activeProfileId =
      storedActiveProfileId && workspaces.some((workspace) => workspace.profile.id === storedActiveProfileId)
      ? storedActiveProfileId
      : workspaces[0].profile.id;

    return { activeProfileId, workspaces };
  } catch {
    return { activeProfileId: demoProfile.id, workspaces: [initialLocalWorkspace] };
  }
}

function getActiveLocalWorkspace(state: { activeProfileId: string; workspaces: LocalWorkspace[] }) {
  return (
    state.workspaces.find((workspace) => workspace.profile.id === state.activeProfileId) ??
    state.workspaces[0] ??
    initialLocalWorkspace
  );
}

const defaultLocalWorkspaceState = {
  activeProfileId: demoProfile.id,
  workspaces: [initialLocalWorkspace],
};

export function ProductivityApp() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [localWorkspaceState, setLocalWorkspaceState] = useState(defaultLocalWorkspaceState);
  const [hasHydratedLocalWorkspaces, setHasHydratedLocalWorkspaces] = useState(false);
  const activeLocalWorkspace = getActiveLocalWorkspace(localWorkspaceState);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(initialLocalWorkspace.profile);
  const [categories, setCategories] = useState<TaskCategory[]>(defaultCategories);
  const [tasks, setTasks] = useState<Task[]>(initialLocalWorkspace.tasks);
  const [habits, setHabits] = useState<Habit[]>(initialLocalWorkspace.habits);
  const [completions, setCompletions] = useState<TaskCompletion[]>(initialLocalWorkspace.completions);
  const [xpEvents, setXpEvents] = useState<XpEvent[]>(initialLocalWorkspace.xpEvents);
  const [achievements, setAchievements] = useState<Achievement[]>(defaultAchievements);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(initialLocalWorkspace.userAchievements);
  const [taskInput, setTaskInput] = useState<NewTaskInput>(initialTaskInput);
  const [habitInput, setHabitInput] = useState<NewHabitInput>(initialHabitInput);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Local profiles are active until the realm is bound to Supabase.");
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<GalleryArtwork | null>(null);
  const [view, setView] = useState<AppView>("dashboard");

  const isLocalMode = !supabase || !session;
  const activeUserId = session?.user.id ?? profile.id;
  const activeLocalProfileId = localWorkspaceState.activeProfileId;
  const localWorkspaces = localWorkspaceState.workspaces;

  function currentLocalWorkspace(): LocalWorkspace {
    return {
      profile,
      tasks,
      habits,
      completions,
      xpEvents,
      userAchievements,
    };
  }

  function applyLocalWorkspace(workspace: LocalWorkspace) {
    setProfile(workspace.profile);
    setTasks(workspace.tasks);
    setHabits(workspace.habits);
    setCompletions(workspace.completions);
    setXpEvents(workspace.xpEvents);
    setUserAchievements(workspace.userAchievements);
    setCategories(defaultCategories);
    setAchievements(defaultAchievements);
    setTaskInput({ ...initialTaskInput, category_id: defaultCategories[0]?.id ?? initialTaskInput.category_id });
    setHabitInput({ ...initialHabitInput, category_id: defaultCategories[0]?.id ?? initialHabitInput.category_id });
    setConfirmingTaskId(null);
  }

  const triggerCelebration = useCallback((title: string, subtitle: string, tone: Celebration["tone"]) => {
    setCelebration({ id: Date.now(), title, subtitle, tone });
  }, []);

  const revealGallery = useCallback(() => {
    setIsGalleryVisible(true);
    window.requestAnimationFrame(() => {
      document.getElementById("gallery")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const openTrophies = useCallback(() => {
    setView("trophies");
    if (window.location.pathname !== trophiesPath) {
      window.history.pushState({ view: "trophies" }, "", trophiesPath);
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const closeTrophies = useCallback(() => {
    setView("dashboard");
    if (window.location.pathname === trophiesPath) {
      window.history.pushState({ view: "dashboard" }, "", "/");
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- Sync view from the URL once after mount. */
    setView(viewFromPath(window.location.pathname));
    const handlePopState = () => {
      setView(viewFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const stored = readLocalWorkspaceState();
    const workspace = getActiveLocalWorkspace(stored);

    /* eslint-disable react-hooks/set-state-in-effect -- Local profile data is restored from browser storage after mount. */
    setLocalWorkspaceState(stored);
    setProfile(workspace.profile);
    setTasks(workspace.tasks);
    setHabits(workspace.habits);
    setCompletions(workspace.completions);
    setXpEvents(workspace.xpEvents);
    setUserAchievements(workspace.userAchievements);
    setHasHydratedLocalWorkspaces(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!celebration) {
      return;
    }
    const timeout = window.setTimeout(() => setCelebration(null), 1900);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  useEffect(() => {
    if (!hasHydratedLocalWorkspaces) {
      return;
    }

    if (!isLocalMode) {
      return;
    }

    const nextLocalWorkspaceState = {
      ...localWorkspaceState,
      workspaces: localWorkspaceState.workspaces.map((workspace) =>
        workspace.profile.id === localWorkspaceState.activeProfileId
          ? {
              profile,
              tasks,
              habits,
              completions,
              xpEvents,
              userAchievements,
            }
          : workspace,
      ),
    };

    window.localStorage.setItem(localWorkspaceStorageKey, JSON.stringify(nextLocalWorkspaceState));
  }, [completions, habits, hasHydratedLocalWorkspaces, isLocalMode, localWorkspaceState, profile, tasks, userAchievements, xpEvents]);

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

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
    setSession(null);
    applyLocalWorkspace(activeLocalWorkspace);
    setMessage("Signed out. Local profiles are active.");
  }

  function switchLocalProfile(profileId: string) {
    if (!isLocalMode) {
      setMessage("Sign out to switch local profiles.");
      return;
    }

    const nextWorkspace = localWorkspaces.find((workspace) => workspace.profile.id === profileId);
    if (!nextWorkspace || profileId === activeLocalProfileId) {
      return;
    }

    setLocalWorkspaceState((current) => ({
      activeProfileId: profileId,
      workspaces: current.workspaces.map((workspace) =>
        workspace.profile.id === current.activeProfileId ? currentLocalWorkspace() : workspace,
      ),
    }));
    applyLocalWorkspace(nextWorkspace);
    setMessage(`${nextWorkspace.profile.display_name} is active.`);
  }

  function addLocalProfile() {
    if (!isLocalMode) {
      setMessage("Sign out to add a local profile.");
      return;
    }

    const name = newProfileName.trim();
    if (!name) {
      setMessage("Name the new profile before adding it.");
      return;
    }

    const nextWorkspace = createLocalWorkspace(name);

    setLocalWorkspaceState((current) => ({
      activeProfileId: nextWorkspace.profile.id,
      workspaces: [
        ...current.workspaces.map((workspace) =>
          workspace.profile.id === current.activeProfileId ? currentLocalWorkspace() : workspace,
        ),
        nextWorkspace,
      ],
    }));
    applyLocalWorkspace(nextWorkspace);
    setNewProfileName("");
    setMessage(`${name} added. You can switch profiles from the top bar.`);
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
      user_id: activeUserId,
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
      user_id: activeUserId,
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

    const didPersist = await persistCompletion({
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

    if (!didPersist) {
      return;
    }

    setConfirmingTaskId(null);
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

    const didPersist = await persistCompletion({
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

    if (!didPersist) {
      return;
    }

    setHabits(updatedHabits);
  }

  async function undoTaskCompletion(task: Task) {
    if (task.status !== "completed") {
      return;
    }

    const completionToUndo = completions
      .filter((completion) => completion.task_id === task.id)
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0];
    const eventToUndo = xpEvents.find(
      (event) => event.source_type === "task" && event.source_id === task.id,
    );
    const xpToRemove = completionToUndo?.xp_awarded ?? task.xp_value;
    const nextCompletions = completionToUndo
      ? completions.filter((completion) => completion.id !== completionToUndo.id)
      : completions;
    const nextXpEvents = eventToUndo ? xpEvents.filter((event) => event.id !== eventToUndo.id) : xpEvents;
    const nextTotalXp = Math.max(0, profile.total_xp - xpToRemove);
    const nextStreak = calculateCurrentStreak(nextCompletions);
    const nextProfile = {
      ...profile,
      total_xp: nextTotalXp,
      level: calculateLevel(nextTotalXp),
      current_streak: nextStreak,
    };

    if (supabase && session) {
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ status: "pending" })
        .eq("id", task.id);
      if (taskError) {
        setMessage(taskError.message);
        return;
      }

      if (completionToUndo) {
        const { error: completionError } = await supabase
          .from("task_completions")
          .delete()
          .eq("id", completionToUndo.id);
        if (completionError) {
          setMessage(completionError.message);
          return;
        }
      }

      if (eventToUndo) {
        const { error: eventError } = await supabase.from("xp_events").delete().eq("id", eventToUndo.id);
        if (eventError) {
          setMessage(eventError.message);
          return;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          total_xp: nextProfile.total_xp,
          level: nextProfile.level,
          current_streak: nextProfile.current_streak,
        })
        .eq("id", session.user.id);
      if (profileError) {
        setMessage(profileError.message);
        return;
      }
    }

    setTasks((current) =>
      current.map((currentTask) =>
        currentTask.id === task.id ? { ...currentTask, status: "pending" as const } : currentTask,
      ),
    );
    setCompletions(nextCompletions);
    setXpEvents(nextXpEvents);
    setProfile(nextProfile);
    setMessage(`Completion undone. ${xpToRemove} XP returned to the road.`);
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
      user_id: activeUserId,
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
      user_id: activeUserId,
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
  }): Promise<boolean> {
    const error = await persist();

    if (error) {
      setMessage(error);
      return false;
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
        return false;
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

    return true;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-clip parchment-bg text-[var(--foreground)]">
      <div className="map-metal-backdrop" />
      <div className="gold-dust" />
      <div className="vignette" />
      <div className="grain" />

      {celebration ? <CelebrationOverlay key={celebration.id} celebration={celebration} /> : null}
      {selectedArtwork ? <ArtworkLightbox artwork={selectedArtwork} onClose={() => setSelectedArtwork(null)} /> : null}

      <div className="relative z-10">
        <SiteHeader
          profile={profile}
          isLocalMode={isLocalMode}
          isSignedIn={Boolean(session)}
          localWorkspaces={localWorkspaces}
          activeLocalProfileId={activeLocalProfileId}
          newProfileName={newProfileName}
          accountEmail={session?.user.email ?? null}
          onNewProfileNameChange={setNewProfileName}
          onAddLocalProfile={addLocalProfile}
          onSwitchLocalProfile={switchLocalProfile}
          onSignOut={handleSignOut}
        />

        {view === "trophies" ? (
          <TrophiesPage
            achievements={achievements}
            unlockedAchievements={unlockedAchievements}
            onBack={closeTrophies}
          />
        ) : (
        <>
        <Hero
          profile={profile}
          rank={rank.name}
          levelProgress={levelProgress}
          message={message}
          dailyDone={dailyDone}
          dailyTarget={dailyTarget}
          dailyProgress={dailyProgress}
          onOpenGallery={revealGallery}
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
          <div className="grid gap-6">
            <Panel icon={Plus} title="Forge a Mission" description="Set a goal, name the stakes, claim the bounty.">
              <TaskForm input={taskInput} categories={categories} onChange={setTaskInput} onSubmit={addTask} />
            </Panel>

            <Panel icon={ScrollText} title="Today's Missions" description="The clearest list of what deserves your steel right now.">
              <TaskList
                tasks={[...overdueTasks, ...todayTasks]}
                categories={categoryById}
                emptyText="No urgent missions. Forge one above or march ahead."
                confirmingTaskId={confirmingTaskId}
                onConfirmationChange={setConfirmingTaskId}
                onComplete={completeTask}
                onUndoComplete={undoTaskCompletion}
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
                    confirmingTaskId={confirmingTaskId}
                    onConfirmationChange={setConfirmingTaskId}
                    onComplete={completeTask}
                    onUndoComplete={undoTaskCompletion}
                  />
                </div>
              ) : null}
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
                      className="hover-lift rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.55)] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className="flex size-10 items-center justify-center rounded-md border"
                            style={{ borderColor: category.color, color: category.color, background: `${category.color}14` }}
                          >
                            <Icon className="size-5" />
                          </span>
                          <h3 className="min-w-0 font-display text-lg tracking-wide">{category.name}</h3>
                        </div>
                        <span className="font-mono text-xs text-[var(--muted)] sm:text-right">{count} active</span>
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
                confirmingTaskId={confirmingTaskId}
                onConfirmationChange={setConfirmingTaskId}
                onComplete={completeTask}
                onUndoComplete={undoTaskCompletion}
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
                        className={`hover-lift rounded-md border p-4 ${completedToday ? "border-[var(--success)]/40 bg-[rgba(155,176,102,0.07)]" : "border-[var(--line)] bg-[rgba(28,24,16,0.55)]"}`}
                      >
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
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            <Panel icon={Sparkles} title="Recent Glory" description="The latest XP your blade has earned.">
              <div className="grid gap-3">
                {xpEvents.slice(0, 7).map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.5)] px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 break-words text-[var(--muted)] sm:truncate">{event.description}</span>
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
              <div className="flex flex-col gap-4 min-[420px]:flex-row min-[420px]:items-center">
                <div className="relative flex size-16 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/60 bg-[rgba(224,178,76,0.1)] sm:size-20">
                  <span
                    className="absolute inset-0 rounded-xl opacity-40"
                    style={{ backgroundImage: "url('/art/crest.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
                  />
                  <span className="relative font-display text-3xl font-black text-[var(--gold-bright)]">
                    {profile.avatar_initials}
                  </span>
                </div>
                <div className="min-w-0">
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
                <LegendRow icon={Compass} label="Account" value={session?.user.email ?? "Local profile"} />
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
                        {unlocked ? `Claimed · +${achievement.xp_bonus} XP` : `+${achievement.xp_bonus} XP`}
                      </p>
                    </article>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={openTrophies}
                className="hover-lift mt-4 inline-flex items-center gap-2 rounded-md border border-[var(--gold)]/40 bg-[rgba(224,178,76,0.07)] px-4 py-2 font-display text-sm tracking-wide text-[var(--gold-bright)] transition-colors hover:bg-[rgba(224,178,76,0.14)]"
              >
                <Trophy className="size-4" />
                View all trophies
                <ChevronRight className="size-4" />
              </button>
            </Panel>
          </div>
        </section>

        {isGalleryVisible ? <GallerySection artworks={galleryArtworks} onOpenArtwork={setSelectedArtwork} /> : null}

        {/* Codex */}
        <section id="codex" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            icon={ScrollText}
            kicker="The Codex"
            title="Glossary of the Realm"
            subtitle="Plain-language definitions for the themed terms used across the program."
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {glossaryTerms.map((entry) => (
              <article
                key={entry.term}
                className="hover-lift rounded-lg border border-[var(--line)] bg-[rgba(28,24,16,0.55)] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-xl font-bold tracking-wide text-[#f4ecd6]">{entry.term}</h3>
                  <span className="rounded-full border border-[var(--gold)]/35 bg-[rgba(224,178,76,0.08)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                    {entry.kind}
                  </span>
                </div>
                <p className="text-sm leading-6 text-[var(--muted)]">{entry.definition}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
          <div className="gold-rule mb-6" />
          <p className="text-center font-display text-xs leading-6 tracking-[0.14em] text-[var(--muted-2)] sm:text-sm sm:tracking-[0.2em]">
            THE LONG ROAD · PARKER&apos;S PRODUCTIVITY PROGRAM
          </p>
        </footer>
        </>
        )}
      </div>
    </main>
  );
}

function TrophiesPage({
  achievements,
  unlockedAchievements,
  onBack,
}: {
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  onBack: () => void;
}) {
  const unlockedIds = new Set(unlockedAchievements.map((item) => item.id));
  const sorted = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id) ? 0 : 1;
    const bUnlocked = unlockedIds.has(b.id) ? 0 : 1;
    if (aUnlocked !== bUnlocked) return aUnlocked - bUnlocked;
    return a.unlock_threshold - b.unlock_threshold;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onBack}
        className="hover-lift mb-6 inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.5)] px-4 py-2 font-display text-sm tracking-wide text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ChevronRight className="size-4 rotate-180" />
        Back to dashboard
      </button>

      <SectionTitle
        icon={Trophy}
        kicker="The Trophy Hall"
        title="All Trophies"
        subtitle={`Every honor in the realm — ${unlockedAchievements.length} of ${achievements.length} claimed.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((achievement) => {
          const unlocked = unlockedIds.has(achievement.id);
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
                {unlocked ? `Claimed · +${achievement.xp_bonus} XP` : `+${achievement.xp_bonus} XP`}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SiteHeader({
  profile,
  isLocalMode,
  isSignedIn,
  localWorkspaces,
  activeLocalProfileId,
  newProfileName,
  accountEmail,
  onNewProfileNameChange,
  onAddLocalProfile,
  onSwitchLocalProfile,
  onSignOut,
}: {
  profile: Profile;
  isLocalMode: boolean;
  isSignedIn: boolean;
  localWorkspaces: LocalWorkspace[];
  activeLocalProfileId: string;
  newProfileName: string;
  accountEmail: string | null;
  onNewProfileNameChange: (value: string) => void;
  onAddLocalProfile: () => void;
  onSwitchLocalProfile: (profileId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(10,9,7,0.88)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:min-h-20 sm:px-6 lg:px-8">
        <a href="#dashboard" className="group flex min-w-0 items-center gap-3">
          <span
            className="size-10 shrink-0 rounded-md border border-[var(--gold)]/40 sm:size-11"
            style={{ backgroundImage: "url('/art/crest.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <span className="min-w-0 leading-tight">
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-[var(--gold)] sm:text-[10px] sm:tracking-[0.28em]">Parker System</span>
            <span className="block truncate font-display text-base tracking-wide sm:text-lg">The Long Road</span>
          </span>
        </a>
        <nav className="hidden items-center gap-4 font-display text-xs tracking-wide text-[var(--muted)] md:flex lg:gap-7 lg:text-sm">
          <a href="#dashboard" className="hover:text-[var(--gold-bright)]">War Table</a>
          <a href="#planner" className="hover:text-[var(--gold-bright)]">Map</a>
          <a href="#quests" className="hover:text-[var(--gold-bright)]">Quests</a>
          <a href="#analytics" className="hover:text-[var(--gold-bright)]">Chronicle</a>
          <a href="#profile" className="hover:text-[var(--gold-bright)]">Legend</a>
          <a href="#codex" className="hover:text-[var(--gold-bright)]">Codex</a>
        </nav>
        <ProfileMenu
          profile={profile}
          isLocalMode={isLocalMode}
          isSignedIn={isSignedIn}
          localWorkspaces={localWorkspaces}
          activeLocalProfileId={activeLocalProfileId}
          newProfileName={newProfileName}
          accountEmail={accountEmail}
          onNewProfileNameChange={onNewProfileNameChange}
          onAddLocalProfile={onAddLocalProfile}
          onSwitchLocalProfile={onSwitchLocalProfile}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}

function ProfileMenu({
  profile,
  isLocalMode,
  isSignedIn,
  localWorkspaces,
  activeLocalProfileId,
  newProfileName,
  accountEmail,
  onNewProfileNameChange,
  onAddLocalProfile,
  onSwitchLocalProfile,
  onSignOut,
}: {
  profile: Profile;
  isLocalMode: boolean;
  isSignedIn: boolean;
  localWorkspaces: LocalWorkspace[];
  activeLocalProfileId: string;
  newProfileName: string;
  accountEmail: string | null;
  onNewProfileNameChange: (value: string) => void;
  onAddLocalProfile: () => void;
  onSwitchLocalProfile: (profileId: string) => void;
  onSignOut: () => void;
}) {
  const profileLetter = getProfileFirstLetter(profile.display_name);
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<ProfileMenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) {
      return;
    }

    const rect = button.getBoundingClientRect();
    const gap = 12;
    const viewportPadding = 16;
    const maxHeight = Math.max(
      120,
      Math.min(512, window.innerHeight - rect.bottom - gap - viewportPadding),
    );

    setMenuPosition({
      top: rect.bottom + gap,
      right: window.innerWidth - rect.right,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const lockedScrollY = lockBodyScroll();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuPanelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll(lockedScrollY);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((open) => !open)}
        className="btn-ghost flex items-center gap-2 rounded-full px-2.5 py-2 text-sm font-semibold sm:px-3"
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-[var(--gold)]/55 bg-[rgba(224,178,76,0.12)] text-[var(--gold-bright)]">
          <UserRound className="size-4" />
        </span>
        <span className="flex size-8 items-center justify-center rounded-full bg-[var(--gold)] font-display text-base font-black text-[#1a1305]">
          {profileLetter}
        </span>
        <ChevronDown
          className={`size-4 text-[var(--muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
        <span className="sr-only">{isOpen ? "Close profile menu" : "Open profile menu"}</span>
      </button>

      {isOpen && menuPosition ? (
      <div
        ref={menuPanelRef}
        role="menu"
        className="fixed z-[80] w-[min(calc(100vw-2rem),24rem)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--line)] bg-[rgba(16,13,9,0.98)] p-4 shadow-2xl shadow-black/60 backdrop-blur-xl [-webkit-overflow-scrolling:touch]"
        style={{
          top: menuPosition.top,
          right: menuPosition.right,
          maxHeight: menuPosition.maxHeight,
        }}
      >
        <div className="mb-4 flex items-start gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/55 bg-[rgba(224,178,76,0.12)] font-display text-xl font-black text-[var(--gold-bright)]">
            {profileLetter}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Profile</p>
            <p className="mt-1 truncate font-display text-xl tracking-wide">{profile.display_name}</p>
            <p className="mt-1 break-all font-mono text-xs text-[var(--muted)]">{accountEmail ?? "Local profile"}</p>
          </div>
        </div>

        {isLocalMode ? (
          <div className="grid gap-3 border-b border-[var(--line)] pb-4">
            <Field label="Switch profile">
              <select
                value={activeLocalProfileId}
                onChange={(event) => onSwitchLocalProfile(event.target.value)}
                className="field-input text-sm"
              >
                {localWorkspaces.map((workspace) => (
                  <option key={workspace.profile.id} value={workspace.profile.id}>
                    {workspace.profile.display_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                value={newProfileName}
                onChange={(event) => onNewProfileNameChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onAddLocalProfile();
                  }
                }}
                placeholder="New profile"
                className="field-input text-sm"
              />
              <button
                onClick={onAddLocalProfile}
                className="btn-gold inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-bold"
              >
                <Plus className="size-3.5" /> Add
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-[var(--success)]/30 bg-[rgba(155,176,102,0.08)] px-3 py-2.5 font-mono text-xs text-[var(--muted)]">
            <span className="size-1.5 rounded-full bg-[var(--success)]" />
            Live Sync active
          </div>
        )}

        {isSignedIn ? (
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onSignOut();
            }}
            className="btn-ghost mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold"
          >
            <LogOut className="size-4" /> Sign Out
          </button>
        ) : null}
      </div>
      ) : null}
    </div>
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
  onOpenGallery: () => void;
};

function Hero(props: HeroProps) {
  const { profile, rank, levelProgress, message, dailyProgress, dailyDone, dailyTarget, onOpenGallery } = props;

  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundImage: "url('/art/hero-vista.webp')", backgroundSize: "cover", backgroundPosition: "center 35%" }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[rgba(10,9,7,0.55)] via-[rgba(10,9,7,0.78)] to-[var(--background)]" />
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[rgba(10,9,7,0.85)] via-transparent to-[rgba(10,9,7,0.55)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20 xl:py-24">
        <div className="rise flex flex-col justify-center">
          <p className="eyebrow mb-5 flex items-center gap-2">
            <Compass className="size-3.5" /> Personal Command Center
          </p>
          <h1 className="max-w-3xl text-balance font-display text-[clamp(2.6rem,12vw,4.75rem)] font-black leading-[1.02] tracking-tight text-[#f7f1df] drop-shadow-[0_2px_24px_rgba(0,0,0,0.8)] sm:text-6xl lg:text-6xl xl:text-7xl">
            Rise, <span className="text-gold-gradient">Wanderer</span>.<br />
            Walk the Long Road.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#d8cfb8] sm:mt-6 sm:text-lg sm:leading-8">
            Schedule the day, fell your missions, swear your oaths, and earn the XP that turns small wins into
            relentless momentum.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="#dashboard" className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-bold sm:w-auto sm:px-7">
              <Swords className="size-4" /> Enter the War Table
            </a>
            <a href="#quests" className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-bold sm:w-auto sm:px-7">
              <Flame className="size-4" /> Swear an Oath
            </a>
            <button
              type="button"
              onClick={onOpenGallery}
              className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-md px-5 py-3.5 text-sm font-bold sm:w-auto sm:px-7"
            >
              <Sparkles className="size-4" /> View the Art
            </button>
          </div>
          <p className="mt-6 flex max-w-xl items-start gap-2 text-sm leading-6 text-[var(--muted)]">
            <Sparkles className="size-4 text-[var(--gold)]" /> {message}
          </p>
        </div>

        <aside className="rise frame rounded-lg p-4 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-6">
          <div className="mb-5 flex flex-col gap-4 border-b border-[var(--line)] pb-5 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:mb-6">
            <div className="min-w-0">
              <p className="eyebrow">Operator</p>
              <h2 className="mt-1 font-display text-2xl tracking-wide">{profile.display_name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--gold)]">
                <Crown className="size-4" /> {rank}
              </p>
            </div>
            <div
              className="relative flex size-16 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/60 sm:size-20"
              style={{ backgroundImage: "url('/art/crest.webp')", backgroundSize: "cover", backgroundPosition: "center" }}
            >
              <span className="absolute inset-0 rounded-xl bg-black/30" />
              <span className="relative font-display text-3xl font-black text-[var(--gold-bright)] drop-shadow">
                {profile.avatar_initials}
              </span>
            </div>
          </div>

          {/* Momentum meter */}
          <div className="mb-5 flex flex-col gap-3 rounded-md border border-[var(--ember)]/30 bg-[rgba(217,120,67,0.08)] p-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:gap-4">
            <Flame className="flame-glow size-8 shrink-0 text-[var(--flame)] sm:size-9" />
            <div className="flex-1">
              <p className="eyebrow text-[var(--ember-bright)]">Momentum</p>
              <p className="font-display text-2xl tracking-wide">
                {profile.current_streak}-Day Streak
              </p>
            </div>
            <div className="min-[420px]:text-right">
              <p className="font-mono text-xs text-[var(--muted)]">Best</p>
              <p className="font-display text-xl text-[var(--gold)]">{profile.longest_streak}d</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
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
        </aside>
      </div>
    </section>
  );
}

function GallerySection({
  artworks,
  onOpenArtwork,
}: {
  artworks: GalleryArtwork[];
  onOpenArtwork: (artwork: GalleryArtwork) => void;
}) {
  return (
    <section id="gallery" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8">
      <SectionTitle
        icon={Sparkles}
        kicker="Armory Gallery"
        title="Artwork of the Realm"
        subtitle="A closer look at the vista, map, and crest that shape the command center."
      />
      <div className="grid gap-5 md:grid-cols-3">
        {artworks.map((artwork) => (
          <button
            key={artwork.id}
            type="button"
            onClick={() => onOpenArtwork(artwork)}
            className="group hover-lift overflow-hidden rounded-lg border border-[var(--line)] bg-[rgba(28,24,16,0.6)] text-left shadow-xl shadow-black/30 focus-visible:border-[var(--gold)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(224,178,76,0.35)]"
          >
            <span className="relative block aspect-[4/3] overflow-hidden bg-[#080705]">
              <Image
                src={artwork.src}
                alt={artwork.title}
                width={1200}
                height={900}
                sizes="(min-width: 768px) 33vw, 100vw"
                className="size-full object-cover transition duration-500 group-hover:scale-105"
                style={{ objectPosition: artwork.position }}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-[rgba(8,7,5,0.82)] via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 rounded-full border border-[var(--gold)]/40 bg-[rgba(8,7,5,0.72)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">
                Click to inspect
              </span>
            </span>
            <span className="block p-4">
              <span className="eyebrow">{artwork.kicker}</span>
              <span className="mt-2 block font-display text-xl font-bold tracking-wide text-[#f4ecd6]">{artwork.title}</span>
              <span className="mt-2 block text-sm leading-6 text-[var(--muted)]">{artwork.description}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ArtworkLightbox({ artwork, onClose }: { artwork: GalleryArtwork; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const zoomRef = useRef(1);
  const isZoomed = zoom > 1;

  const clampZoom = useCallback((value: number) => Math.min(4, Math.max(1, Number(value.toFixed(2)))), []);

  const updateZoom = useCallback(
    (nextZoom: number) => {
      const clampedZoom = clampZoom(nextZoom);
      setZoom(clampedZoom);
      if (clampedZoom === 1) {
        setOffset({ x: 0, y: 0 });
      }
    },
    [clampZoom],
  );

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const lockedScrollY = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "+" || event.key === "=") {
        updateZoom(zoomRef.current + 0.25);
      }
      if (event.key === "-") {
        updateZoom(zoomRef.current - 0.25);
      }
      if (event.key === "0") {
        updateZoom(1);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      unlockBodyScroll(lockedScrollY);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, updateZoom]);

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!isZoomed) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    setOffset({
      x: drag.offsetX + event.clientX - drag.x,
      y: drag.offsetY + event.clientY - drag.y,
    });
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  return (
    <div className="fixed inset-0 z-[120] bg-[rgba(5,4,3,0.9)] p-3 backdrop-blur-xl sm:p-6" role="dialog" aria-modal="true" aria-label={`${artwork.title} artwork viewer`}>
      <button type="button" aria-label="Close artwork viewer" onClick={onClose} className="absolute inset-0 z-0 cursor-default" />
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[rgba(16,13,9,0.98)] shadow-2xl shadow-black/70">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">{artwork.kicker}</p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-[#f4ecd6]">{artwork.title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => updateZoom(zoom - 0.25)} className="btn-ghost inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold">
              <ZoomOut className="size-4" /> Zoom Out
            </button>
            <button type="button" onClick={() => updateZoom(zoom + 0.25)} className="btn-gold inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold">
              <ZoomIn className="size-4" /> Zoom In
            </button>
            <button type="button" onClick={() => updateZoom(1)} className="btn-ghost rounded-md px-3 py-2 text-sm font-semibold">
              Reset
            </button>
            <button type="button" aria-label="Close artwork viewer" onClick={onClose} className="btn-ghost inline-flex items-center justify-center rounded-md p-2.5">
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div
          className={`relative min-h-0 flex-1 overflow-hidden bg-[#050403] ${isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onDoubleClick={() => updateZoom(isZoomed ? 1 : 2)}
          style={{ touchAction: isZoomed ? "none" : "pan-y" }}
        >
          <Image
            src={artwork.src}
            alt={artwork.title}
            width={1920}
            height={1080}
            sizes="100vw"
            draggable={false}
            className="size-full select-none object-contain transition-transform duration-100"
            style={{
              objectPosition: artwork.position,
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            }}
          />
        </div>
        <div className="flex flex-col gap-2 border-t border-[var(--line)] p-4 text-sm leading-6 text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>{artwork.description}</p>
          <p className="shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-[var(--gold)]">
            {Math.round(zoom * 100)}% · Wheel or double-click to zoom, drag to pan
          </p>
        </div>
      </div>
    </div>
  );
}

function CelebrationOverlay({ celebration }: { celebration: Celebration }) {
  const Icon = celebration.tone === "crown" ? Crown : celebration.tone === "ember" ? Flame : Swords;
  return (
    <div className="celebrate">
      <div className="celebrate-text">
        <Icon className="mx-auto mb-3 size-16 text-[var(--gold-bright)] drop-shadow-[0_0_24px_rgba(246,213,122,0.8)]" />
        <p className="text-gold-gradient text-[clamp(2.6rem,14vw,5rem)] font-black tracking-[0.08em] drop-shadow-[0_2px_30px_rgba(0,0,0,0.9)] sm:tracking-[0.15em]">
          {celebration.title}
        </p>
        <p className="mt-3 px-4 font-display text-base leading-7 tracking-[0.12em] text-[#e8dcc0] sm:text-xl sm:tracking-[0.3em]">{celebration.subtitle}</p>
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
    <div className="frame rounded-lg p-5 shadow-xl shadow-black/30 sm:p-6">
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
    <div className="hover-lift rounded-lg border border-[var(--line)] bg-[rgba(28,24,16,0.6)] p-5">
      <div className="flex items-start justify-between gap-3">
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
    <div className="flex flex-col gap-1.5 rounded-md border border-[var(--line)] bg-[rgba(28,24,16,0.45)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="flex items-center gap-2 text-[var(--muted)]">
        <Icon className="size-4 text-[var(--gold)]" /> {label}
      </span>
      <span className="break-all font-mono text-sm text-[var(--foreground)] sm:text-right">{value}</span>
    </div>
  );
}

function TaskList({
  tasks,
  categories,
  emptyText,
  confirmingTaskId,
  onConfirmationChange,
  onComplete,
  onUndoComplete,
}: {
  tasks: Task[];
  categories: Map<string, TaskCategory>;
  emptyText: string;
  confirmingTaskId: string | null;
  onConfirmationChange: (taskId: string | null) => void;
  onComplete: (task: Task) => void;
  onUndoComplete: (task: Task) => void;
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
        const isConfirming = confirmingTaskId === task.id;
        return (
          <article
            key={task.id}
            className={`hover-lift rounded-md border p-4 ${done ? "border-[var(--line)] bg-[rgba(8,7,5,0.4)] opacity-70" : "border-[var(--line)] bg-[rgba(28,24,16,0.55)]"}`}
          >
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
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-36">
                {done ? (
                  <button
                    onClick={() => onUndoComplete(task)}
                    className="btn-ghost inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold sm:w-auto"
                  >
                    <RotateCcw className="size-4" /> Undo
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => (isConfirming ? onComplete(task) : onConfirmationChange(task.id))}
                      className="btn-gold inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold sm:w-auto"
                    >
                      {isConfirming ? (
                        <>
                          <Check className="size-4" /> Confirm
                        </>
                      ) : (
                        <>
                          <Swords className="size-4" /> Fell It
                        </>
                      )}
                    </button>
                    {isConfirming ? (
                      <button
                        onClick={() => onConfirmationChange(null)}
                        className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--gold-bright)]"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  color?: string;
  icon?: LucideIcon;
};

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const SelectedIcon = selected?.icon;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-open={open}
        data-placeholder={selected ? undefined : "true"}
        onClick={() => setOpen((prev) => !prev)}
        className="select-trigger"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected?.color ? (
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
          ) : null}
          {SelectedIcon ? <SelectedIcon className="size-4 shrink-0 text-[var(--gold)]" /> : null}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown className="select-chevron size-4" />
      </button>
      {open ? (
        <ul role="listbox" className="select-menu" aria-label={ariaLabel}>
          {options.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected ? "true" : undefined}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="select-option"
                >
                  {option.color ? (
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} />
                  ) : null}
                  {OptionIcon ? <OptionIcon className="size-4 shrink-0 text-[var(--gold)]" /> : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.hint ? (
                      <span className="mt-0.5 block truncate font-mono text-[11px] text-[var(--muted)]">{option.hint}</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="size-4 shrink-0 text-[var(--gold)]" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
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
  const recommendation = suggestGoalDetails(input, categories);

  function updateWithAutomation(nextInput: NewTaskInput) {
    onChange(applyGoalAutomation(nextInput, categories));
  }

  function fillSuggestion(suggestion: GoalSuggestion | undefined) {
    if (!suggestion) {
      return;
    }

    onChange({
      ...input,
      title: suggestion.title,
      notes: suggestion.notes,
      category_id: selectAvailableCategory(suggestion.categoryId, categories, input.category_id),
      priority: suggestion.priority,
      xp_value: suggestion.xpValue,
    });
  }

  const recommendationName =
    categories.find((category) => category.id === recommendation.categoryId)?.name ?? "Domain";

  return (
    <div className="mission-form">
      <div className="mission-form__top grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Field label="Mission title">
          <input
            value={input.title}
            placeholder="Ship the portfolio update…"
            onChange={(event) => updateWithAutomation({ ...input, title: event.target.value })}
            className="field-input"
          />
        </Field>
        <div className="rounded-lg border border-[var(--line)] bg-[rgba(8,7,5,0.4)] p-3 lg:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-[var(--gold)]" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--gold)]">Quick goal fills</p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Suggested: {recommendationName} · {priorityLabel[recommendation.priority]} · {recommendation.xpValue} XP
            </p>
          </div>
          <CustomSelect
            value=""
            placeholder={`Choose from ${goalSuggestions.length} preset examples…`}
            ariaLabel="Choose a preset goal"
            onChange={(value) => fillSuggestion(goalSuggestions[Number(value)])}
            options={goalSuggestions.map((suggestion, index) => ({
              value: String(index),
              label: suggestion.title,
              color: categories.find((category) => category.id === suggestion.categoryId)?.color,
              hint: `${categories.find((category) => category.id === suggestion.categoryId)?.name ?? "Suggested"} · ${priorityLabel[suggestion.priority]} · ${suggestion.xpValue} XP`,
            }))}
          />
        </div>
      </div>

      <div className="mission-form__meta grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Domain">
          <CustomSelect
            value={input.category_id}
            ariaLabel="Choose a domain"
            onChange={(value) => onChange({ ...input, category_id: value })}
            options={categories.map((category) => ({
              value: category.id,
              label: category.name,
              color: category.color,
              icon: categoryIcon(category.id),
            }))}
          />
        </Field>
        <Field label="Due time">
          <input
            type="datetime-local"
            value={input.due_at}
            onChange={(event) => onChange({ ...input, due_at: event.target.value })}
            className="field-input field-input-datetime"
          />
        </Field>
        <Field label="Schedule date">
          <input
            type="date"
            value={input.scheduled_for}
            onChange={(event) => onChange({ ...input, scheduled_for: event.target.value })}
            className="field-input field-input-datetime"
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

      <div className="grid gap-2 text-sm font-medium text-[var(--foreground)]">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--muted)]">Stakes</span>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(Object.keys(priorityLabel) as Priority[]).map((priority) => {
            const active = input.priority === priority;
            const color = priorityColor[priority];
            return (
              <button
                key={priority}
                type="button"
                onClick={() => onChange({ ...input, priority })}
                data-active={active ? "true" : undefined}
                className="priority-pill"
                style={active ? { borderColor: color, color, background: `${color}1f` } : undefined}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {priorityLabel[priority]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mission-form__footer grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <Field label="Notes">
          <textarea
            value={input.notes}
            placeholder="The smallest visible step to victory…"
            onChange={(event) => updateWithAutomation({ ...input, notes: event.target.value })}
            rows={2}
            className="field-input"
          />
        </Field>
        <button
          onClick={onSubmit}
          className="btn-gold inline-flex h-[2.75rem] items-center justify-center gap-2 self-end rounded-md px-6 text-sm font-bold lg:min-w-52"
        >
          <Plus className="size-4" /> Inscribe Mission
        </button>
      </div>
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
    <label className="grid min-w-0 gap-2 text-sm font-medium text-[var(--foreground)]">
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
