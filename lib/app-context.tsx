import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import i18n from './i18n';
import { users as mockUsers } from './mock-data';
import { router } from 'expo-router';
import { authApi } from '@/src/features/auth/api';
import { setOnAuthExpired } from '@/src/lib/api';
import { mapMeToProfile, clearSession } from '@/src/features/auth/session';
import { tokens } from '@/src/lib/auth-tokens';
import { workoutApi, mapExercise, MUSCLE_GROUPS as WORKOUT_MUSCLE_GROUPS } from '@/src/features/workout/api';
import { setWorkoutLibrary } from '@/src/features/workout/library-cache';
import { nutritionApi, todayLocal } from '@/src/features/nutrition/api';

// App-wide layout direction for the language (web uses document.dir; native uses I18nManager).
function applyDirection(lang: string) {
  const isRTL = lang === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  } else {
    try {
      I18nManager.allowRTL(true);
      if (I18nManager.isRTL !== isRTL) I18nManager.forceRTL(isRTL); // native needs a reload to relayout
    } catch {}
  }
}

const TYPE_ICON: Record<string, string> = {
  'Push Day': 'arrow-up-circle-outline', 'Pull Day': 'arrow-down-circle-outline', 'Leg Day': 'walk-outline',
  'Upper Body': 'body-outline', 'Lower Body': 'body-outline', 'Full Body': 'fitness-outline',
  Cardio: 'heart-outline', HIIT: 'flash-outline', Core: 'ellipse-outline', Calisthenics: 'body-outline',
  Mobility: 'accessibility-outline', Functional: 'barbell-outline', 'Olympic Lifting': 'barbell-outline',
  Powerlifting: 'barbell-outline', 'CrossFit / WOD': 'fitness-outline',
};

// Map the app's local WorkoutLog → API LogCreate body.
function logToApi(log: any) {
  return {
    name: log.name,
    date: log.date,
    durationMinutes: log.durationMinutes ?? 0,
    preWorkout: !!log.preWorkout,
    totalVolumeKg: log.totalVolumeKg ?? 0,
    totalSets: log.totalSets ?? 0,
    completedSets: log.completedSets ?? 0,
    skippedSets: log.skippedSets ?? 0,
    totalReps: log.totalReps ?? 0,
    aiInsight: log.aiInsight ?? '',
    exercises: (log.exercises ?? []).map((e: any) => ({
      exerciseId: typeof e.exerciseId === 'string' && e.exerciseId.length > 20 ? e.exerciseId : undefined,
      name: e.name, muscleGroup: e.muscleGroup ?? '', sets: e.sets ?? [],
    })),
  };
}

export interface CoachInfo {
  specialty: string;
  yearsExperience: number;
  certifications: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  type: 'athlete' | 'coach';
  avatar: string;
  height: number;
  weight: number;
  age: number;
  gender: string;
  interests: string[];
  goal: string;
  rank: string;
  followers: number;
  following: number;
  bio: string;
  isCoach?: boolean;
  coachInfo?: CoachInfo;
  profileComplete?: boolean;
}

export interface SetConfig {
  type: 'reps' | 'hold' | 'emom';
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  repsPerInterval?: number;
  intervalSeconds?: number;
  totalIntervals?: number;
  note?: string;
}

export interface TemplateExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  restSeconds: number;
  sets: SetConfig[];
  isCustom?: boolean;
  // combo plan (optional): a planned back-to-back combo set. `sets` stays empty.
  combo?: boolean;
  unbroken?: boolean;
  components?: { exerciseId: string; name: string; muscleGroup: string }[];
  comboRounds?: number;
  comboReps?: number;
}

export const WORKOUT_TYPES = [
  'Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body',
  'Full Body', 'Cardio', 'HIIT', 'Strength', 'Mobility', 'Custom',
] as const;
export type WorkoutType = typeof WORKOUT_TYPES[number];

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  workoutType?: WorkoutType;
  createdAt: string;
  exercises: TemplateExercise[];
}

// content signature for a template — dedup saves (same name + exercises = same template).
// deliberately ignores workoutType so the prepare screen and the summary screen agree.
// canonical (sorted keys) so a freshly-built template matches one hydrated from the server
// (pg jsonb doesn't preserve key order).
const canonJson = (v: any): string => {
  if (Array.isArray(v)) return `[${v.map(canonJson).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${k}:${canonJson(v[k])}`).join(',')}}`;
  return JSON.stringify(v);
};
export const templateSig = (name?: string, exs?: any[]) =>
  canonJson({
    n: (name || '').trim().toLowerCase(),
    e: (exs || []).map((x) => ({ id: x.exerciseId, s: x.sets })),
  });

export interface LogSetData {
  type: 'reps' | 'hold' | 'emom';
  planned: SetConfig;
  actual: SetConfig;
  status: 'pending' | 'done' | 'skipped' | 'in_progress';
}

export interface LogExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: LogSetData[];
  // combo grouping: movements sharing a comboId were performed as one unbroken/back-to-back
  // combo set. Set at save time when a live-session combo is expanded into per-movement exercises.
  comboId?: string;
  comboLabel?: string;
  comboUnbroken?: boolean;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  templateId?: string;
  name: string;
  workoutType?: WorkoutType;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  preWorkout: boolean;
  totalVolumeKg: number;
  totalSets: number;
  completedSets: number;
  skippedSets: number;
  totalReps: number;
  exercises: LogExercise[];
  aiInsight: string;
}

export interface CustomExercise {
  id: string;
  userId: string;
  name: string;
  muscleGroup: string;
  defaultSetType: SetConfig['type'];
  notes: string;
  isCustom: true;
  createdAt: string;
}

export interface ActiveSession {
  workoutName: string;
  workoutType?: WorkoutType;
  startTimestamp: number;
  preWorkout: boolean;
  exercises: {
    exerciseId: string;
    name: string;
    muscleGroup: string;
    restSeconds: number;
    sets: {
      config: SetConfig;
      actual: SetConfig;
      status: 'pending' | 'done' | 'skipped' | 'in_progress';
    }[];
    // ── combo set (optional) ──────────────────────────────────────────────
    // When combo=true, this entry represents multiple movements done back-to-back
    // as one set. `sets` stays empty; the work lives in `rounds`. On finish it is
    // expanded into one LogExercise per component (so PRs/volume/history all work).
    combo?: boolean;
    unbroken?: boolean;
    components?: { exerciseId: string; name: string; muscleGroup: string }[];
    rounds?: {
      status: 'pending' | 'done' | 'skipped' | 'in_progress';
      entries: { reps: number; weight: number }[]; // aligned to components
    }[];
  }[];
}

interface WorkoutSet {
  reps: number;
  weight: number;
}

interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

interface Workout {
  id: string;
  type: string;
  date: string;
  duration: number;
  preWorkout: boolean;
  exercises: WorkoutExercise[];
  totalVolume: number;
}

interface MealItem {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  quantity: number;
}

interface Meal {
  type: string;
  items: MealItem[];
}

interface DayNutrition {
  date: string;
  meals: Meal[];
  targets: { protein: number; carbs: number; fat: number; calories: number };
}

export interface InBodyTest {
  id: string;
  date: string;
  weight: number;
  muscleMass: number;
  bodyFat: number;
  bodyWater: number;
  bmi: number;
  bmr: number;
  visceralFat: number;
  skeletalMuscle: number;
}

interface AppContextValue {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  onboardingComplete: boolean;
  setOnboardingComplete: (val: boolean) => void;
  workouts: Workout[];
  addWorkout: (workout: Omit<Workout, 'id'>) => void;
  todayNutrition: DayNutrition;
  foodNames: Record<string, string>;
  setNutritionTargets: (targets: { protein: number; carbs: number; fat: number; calories: number }) => void;
  addMealItem: (mealType: string, item: Omit<MealItem, 'id' | 'quantity'> & { quantity?: number; foodId?: string }) => void;
  removeMealItem: (mealType: string, itemId: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  likedPosts: Set<string>;
  toggleLike: (postId: string) => void;
  streak: number;
  weeklyWorkouts: number;
  inBodyTests: InBodyTest[];
  addInBodyTest: (test: Omit<InBodyTest, 'id'>) => void;
  workoutTemplates: WorkoutTemplate[];
  addWorkoutTemplate: (t: Omit<WorkoutTemplate, 'id'>) => void;
  deleteWorkoutTemplate: (id: string) => void;
  workoutLogs: WorkoutLog[];
  addWorkoutLog: (log: Omit<WorkoutLog, 'id'> & { id?: string }) => string;
  deleteWorkoutLog: (id: string) => void;
  customExercises: CustomExercise[];
  addCustomExercise: (ex: Omit<CustomExercise, 'id' | 'createdAt'>) => void;
  exerciseLibrary: any[];
  workoutTypes: any[];
  muscleGroups: string[];
  activeSession: ActiveSession | null;
  setActiveSession: (s: ActiveSession | null) => void;
  logout: () => void;
  deleteAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const STORAGE_KEYS = {
  USER: 'nafas_user',
  ONBOARDING: 'nafas_onboarding',
  WORKOUTS: 'nafas_workouts',
  NUTRITION: 'nafas_nutrition',
  LANGUAGE: 'nafas_language',
  THEME: 'nafas_theme',
  LIKED: 'nafas_liked',
  INBODY: 'nafas_inbody',
  TEMPLATES: 'nafas_templates',
  LOGS: 'nafas_logs',
  CUSTOM_EX: 'nafas_custom_exercises',
  ACTIVE_SESSION: 'nafas_active_session',
};

function getDefaultTargets(weight: number, goal: string) {
  const proteinPerKg = goal === 'build_muscle' ? 2.2 : goal === 'lose_weight' ? 2 : 1.8;
  const protein = Math.round(weight * proteinPerKg);
  const fatCals = goal === 'lose_weight' ? 0.2 : 0.25;
  const totalCals = goal === 'build_muscle' ? weight * 33 : goal === 'lose_weight' ? weight * 24 : weight * 28;
  const calories = Math.round(totalCals);
  const fatGrams = Math.round((calories * fatCals) / 9);
  const carbGrams = Math.round((calories - protein * 4 - fatGrams * 9) / 4);
  return { protein, carbs: carbGrams, fat: fatGrams, calories };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserProfile | null>(null);
  const [onboardingComplete, setOnboardingState] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [todayNutrition, setTodayNutrition] = useState<DayNutrition>({
    date: new Date().toISOString().split('T')[0],
    meals: [
      { type: 'breakfast', items: [] },
      { type: 'lunch', items: [] },
      { type: 'dinner', items: [] },
      { type: 'snacks', items: [] },
    ],
    targets: { protein: 164, carbs: 300, fat: 60, calories: 2400 },
  });
  const [language, setLangState] = useState('en');
  const [isDark, setIsDark] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set(['p2', 'p5']));
  const [inBodyTests, setInBodyTests] = useState<InBodyTest[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [activeSession, setActiveSessionState] = useState<ActiveSession | null>(null);
  const [exerciseLibrary, setExerciseLibrary] = useState<any[]>([]);
  const [workoutTypesData, setWorkoutTypesData] = useState<any[]>([]);
  // foodId → localized name, so logged meal items follow the current language
  // (item.name is only a snapshot from when it was logged).
  const [foodNames, setFoodNames] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  const loadFoodNames = useCallback(async () => {
    try {
      const foods = await nutritionApi.foods();
      if (foods?.length) setFoodNames(Object.fromEntries(foods.map((f) => [f.id, f.name])));
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedUser, savedOnboarding, savedWorkouts, savedLang, savedTheme, savedLiked, savedInBody, savedTemplates, savedLogs, savedCustomEx, savedSession] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER),
          AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING),
          AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS),
          AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEYS.THEME),
          AsyncStorage.getItem(STORAGE_KEYS.LIKED),
          AsyncStorage.getItem(STORAGE_KEYS.INBODY),
          AsyncStorage.getItem(STORAGE_KEYS.TEMPLATES),
          AsyncStorage.getItem(STORAGE_KEYS.LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EX),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION),
        ]);
        if (savedUser) setUserState(JSON.parse(savedUser));
        if (savedOnboarding === 'true') setOnboardingState(true);
        if (savedWorkouts) setWorkouts(JSON.parse(savedWorkouts));
        if (savedLang) { setLangState(savedLang); i18n.changeLanguage(savedLang); applyDirection(savedLang); }
        if (savedTheme) setIsDark(savedTheme === 'dark');
        if (savedLiked) setLikedPosts(new Set(JSON.parse(savedLiked)));
        if (savedInBody) setInBodyTests(JSON.parse(savedInBody));
        if (savedTemplates) setWorkoutTemplates(JSON.parse(savedTemplates));
        if (savedLogs) setWorkoutLogs(JSON.parse(savedLogs));
        if (savedCustomEx) setCustomExercises(JSON.parse(savedCustomEx));
        if (savedSession) setActiveSessionState(JSON.parse(savedSession));

        // Session = server source of truth. If a token exists, hydrate from /me.
        const { access } = await tokens.get();
        if (access) {
          try {
            const me = await authApi.me();
            setUserState(mapMeToProfile(me));
            setOnboardingState(true);
            // workout reference data + user's server-side workout state
            try {
              const [exs, types, logs, tmpls, sess] = await Promise.all([
                workoutApi.exercises(), workoutApi.workoutTypes(), workoutApi.logs(),
                workoutApi.templates(), workoutApi.getActiveSession(),
              ]);
              const mappedEx = exs.map(mapExercise);
              const mappedTypes = types.map((t) => ({ id: t.id, name: t.name, icon: TYPE_ICON[t.name] || 'fitness-outline' }));
              setExerciseLibrary(mappedEx);
              setWorkoutTypesData(mappedTypes);
              setWorkoutLibrary(mappedEx, mappedTypes); // fill the import-cache the picker screens read

              // numeric columns come back as strings from pg — coerce so the
              // client's volume sums don't string-concatenate.
              if (logs?.length) setWorkoutLogs(logs.map((l: any) => ({
                ...l,
                totalVolumeKg: Number(l.totalVolumeKg) || 0,
                totalSets: Number(l.totalSets) || 0,
                completedSets: Number(l.completedSets) || 0,
                skippedSets: Number(l.skippedSets) || 0,
                totalReps: Number(l.totalReps) || 0,
                durationMinutes: Number(l.durationMinutes) || 0,
              })) as any);
              if (tmpls?.length) setWorkoutTemplates(tmpls as any);
              if (sess) setActiveSessionState(sess as any);
            } catch {}
            // nutrition: today's day (+targets) and InBody history
            try {
              const [day, inbody] = await Promise.all([nutritionApi.getDay(todayLocal()), nutritionApi.inbody()]);
              if (day) setTodayNutrition({ date: day.date, meals: day.meals, targets: day.targets });
              if (inbody?.length) setInBodyTests(inbody as any);
              loadFoodNames();
            } catch {}
          } catch {
            // token invalid/expired and refresh failed → drop it
            await clearSession();
            setUserState(null);
            setOnboardingState(false);
          }
        }
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const setUser = useCallback((u: UserProfile | null) => {
    setUserState(u);
    if (u) {
      AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
      setTodayNutrition(prev => ({
        ...prev,
        targets: getDefaultTargets(u.weight, u.goal),
      }));
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, []);

  const setOnboardingComplete = useCallback((val: boolean) => {
    setOnboardingState(val);
    AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, val ? 'true' : 'false');
  }, []);

  const addWorkout = useCallback((workout: Omit<Workout, 'id'>) => {
    const id = Crypto.randomUUID();
    setWorkouts(prev => {
      const updated = [{ ...workout, id }, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addMealItem = useCallback((mealType: string, item: Omit<MealItem, 'id' | 'quantity'> & { quantity?: number; foodId?: string }) => {
    const id = Crypto.randomUUID();
    // optimistic
    setTodayNutrition(prev => ({
      ...prev,
      meals: prev.meals.map(m =>
        m.type === mealType ? { ...m, items: [...m.items, { ...item, id, quantity: item.quantity || 1 }] } : m
      ),
    }));
    // sync to server, adopt authoritative day (totals etc.)
    nutritionApi.addItem(todayLocal(), mealType, {
      foodId: (item as any).foodId, name: item.name,
      protein: item.protein, carbs: item.carbs, fat: item.fat, calories: item.calories,
      quantity: item.quantity || 1,
    }).then(day => setTodayNutrition({ date: day.date, meals: day.meals, targets: day.targets })).catch(() => {});
  }, []);

  const removeMealItem = useCallback((mealType: string, itemId: string) => {
    setTodayNutrition(prev => ({
      ...prev, meals: prev.meals.map(m => m.type === mealType ? { ...m, items: m.items.filter(it => it.id !== itemId) } : m),
    }));
    nutritionApi.removeItem(todayLocal(), mealType, itemId)
      .then(day => setTodayNutrition({ date: day.date, meals: day.meals, targets: day.targets })).catch(() => {});
  }, []);

  const setNutritionTargets = useCallback((targets: { protein: number; carbs: number; fat: number; calories: number }) => {
    setTodayNutrition(prev => ({ ...prev, targets }));   // optimistic
    nutritionApi.setTargets(targets).catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: string) => {
    setLangState(lang);
    i18n.changeLanguage(lang);          // UI strings (t()) across all screens
    applyDirection(lang);               // RTL/LTR layout direction app-wide
    // persist first (api client reads x-lang from storage), then re-fetch localized content
    (async () => {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      try {
        const [exs, types] = await Promise.all([workoutApi.exercises(), workoutApi.workoutTypes()]);
        const mappedEx = exs.map(mapExercise);
        const mappedTypes = types.map((t) => ({ id: t.id, name: t.name, icon: TYPE_ICON[t.name] || 'fitness-outline' }));
        setExerciseLibrary(mappedEx);
        setWorkoutTypesData(mappedTypes);
        setWorkoutLibrary(mappedEx, mappedTypes);
        loadFoodNames(); // re-localize logged meal-item names
      } catch {}
    })();
  }, [loadFoodNames]);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEYS.THEME, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const toggleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      AsyncStorage.setItem(STORAGE_KEYS.LIKED, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const addInBodyTest = useCallback((test: Omit<InBodyTest, 'id'>) => {
    const id = Crypto.randomUUID();
    setInBodyTests(prev => {
      const updated = [{ ...test, id }, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.INBODY, JSON.stringify(updated));
      return updated;
    });
    // sync to server, adopt server list (server ids)
    nutritionApi.addInbody(test as any)
      .then(() => nutritionApi.inbody())
      .then(rows => { if (rows) setInBodyTests(rows as any); })
      .catch(() => {});
  }, []);

  const addWorkoutTemplate = useCallback((t: Omit<WorkoutTemplate, 'id'>) => {
    // dedup by content signature (name+type+exercises) so the same workout can't be
    // saved twice — covers both the prepare screen and the post-workout summary.
    const sig = templateSig(t.name, (t as any).exercises);
    if (workoutTemplates.some(p => templateSig(p.name, p.exercises) === sig)) return;
    const id = Crypto.randomUUID();
    setWorkoutTemplates(prev => {
      const updated = [{ ...t, id }, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    // sync: POST then refetch to adopt the server id (server also dedups)
    workoutApi.createTemplate({ name: t.name, exercises: (t as any).exercises ?? [] })
      .then(() => workoutApi.templates())
      .then(srv => setWorkoutTemplates(srv as any))
      .catch(() => {});
  }, [workoutTemplates]);

  const deleteWorkoutTemplate = useCallback((id: string) => {
    setWorkoutTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    workoutApi.deleteTemplate(id).catch(() => {});
  }, []);

  const addWorkoutLog = useCallback((log: Omit<WorkoutLog, 'id'> & { id?: string }): string => {
    const id = log.id || Crypto.randomUUID();
    setWorkoutLogs(prev => {
      const updated = [{ ...log, id } as WorkoutLog, ...prev];
      AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
      return updated;
    });
    // sync to server (fire-and-forget). Keep the optimistic local entry + its id
    // so workout-summary?logId=<id> resolves immediately; server is source of
    // truth on next app load (hydrate).
    workoutApi.createLog(logToApi({ ...log, id })).catch(() => {});
    return id;
  }, []);

  const deleteWorkoutLog = useCallback((id: string) => {
    setWorkoutLogs(prev => {
      const updated = prev.filter(l => l.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updated));
      return updated;
    });
    workoutApi.deleteLog(id).catch(() => {});
  }, []);

  const addCustomExercise = useCallback((ex: Omit<CustomExercise, 'id' | 'createdAt'>) => {
    const id = Crypto.randomUUID();
    setCustomExercises(prev => {
      const updated = [...prev, { ...ex, id, createdAt: new Date().toISOString().split('T')[0] }];
      AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_EX, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setActiveSession = useCallback((s: ActiveSession | null) => {
    setActiveSessionState(s);
    if (s) {
      AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(s));
      workoutApi.putActiveSession(s).catch(() => {});
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      workoutApi.clearActiveSession().catch(() => {});
    }
  }, []);

  const clearLocalSession = useCallback(async () => {
    setUserState(null);
    setOnboardingState(false);
    setWorkouts([]);
    setInBodyTests([]);
    setWorkoutTemplates([]);
    setWorkoutLogs([]);
    setCustomExercises([]);
    setActiveSessionState(null);
    await clearSession();
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.ONBOARDING,
      STORAGE_KEYS.WORKOUTS,
      STORAGE_KEYS.INBODY,
      STORAGE_KEYS.TEMPLATES,
      STORAGE_KEYS.LOGS,
      STORAGE_KEYS.CUSTOM_EX,
      STORAGE_KEYS.ACTIVE_SESSION,
    ]);
  }, []);

  const logout = useCallback(async () => {
    // revoke the refresh token server-side before dropping local tokens
    const { refresh } = await tokens.get();
    if (refresh) await authApi.logout(refresh).catch(() => {});
    await clearLocalSession();
  }, [clearLocalSession]);

  const deleteAccount = useCallback(async () => {
    await authApi.deleteAccount();
    await clearLocalSession();
  }, [clearLocalSession]);

  // Auto-logout when the session is unrecoverable (access + refresh both dead).
  // apiFetch fires this after a 401 it couldn't refresh; drop local state and
  // send the user to the login screen instead of leaving them on broken screens.
  useEffect(() => {
    setOnAuthExpired(() => {
      clearLocalSession();
      router.replace('/auth');
    });
    return () => setOnAuthExpired(null);
  }, [clearLocalSession]);

  const streak = useMemo(() => {
    if (workouts.length === 0 && workoutLogs.length === 0) return 0;
    let count = 0;
    const today = new Date();
    const allDates = [
      ...workouts.map(w => w.date),
      ...workoutLogs.map(l => l.date),
    ];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (allDates.includes(dateStr)) count++;
      else if (i > 0) break;
    }
    return count;
  }, [workouts, workoutLogs]);

  const weeklyWorkouts = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const fromOld = workouts.filter(w => new Date(w.date) >= weekAgo).length;
    const fromLogs = workoutLogs.filter(l => new Date(l.date) >= weekAgo).length;
    return fromOld + fromLogs;
  }, [workouts, workoutLogs]);

  const value = useMemo(() => ({
    user, setUser, onboardingComplete, setOnboardingComplete,
    workouts, addWorkout, todayNutrition, foodNames, addMealItem, removeMealItem, setNutritionTargets,
    language, setLanguage, isDark, toggleTheme,
    likedPosts, toggleLike, streak, weeklyWorkouts,
    inBodyTests, addInBodyTest,
    workoutTemplates, addWorkoutTemplate, deleteWorkoutTemplate,
    workoutLogs, addWorkoutLog, deleteWorkoutLog,
    customExercises, addCustomExercise,
    exerciseLibrary, workoutTypes: workoutTypesData, muscleGroups: WORKOUT_MUSCLE_GROUPS,
    activeSession, setActiveSession,
    logout, deleteAccount,
  }), [user, onboardingComplete, workouts, todayNutrition, foodNames, setNutritionTargets, language, isDark, likedPosts, streak, weeklyWorkouts, inBodyTests, workoutTemplates, workoutLogs, customExercises, exerciseLibrary, workoutTypesData, activeSession, setUser, setOnboardingComplete, addWorkout, addMealItem, setLanguage, toggleTheme, toggleLike, addInBodyTest, addWorkoutTemplate, deleteWorkoutTemplate, addWorkoutLog, deleteWorkoutLog, addCustomExercise, setActiveSession, logout, deleteAccount]);

  if (!loaded) return null;

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
