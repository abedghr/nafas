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
import type { WeightUnit } from './units';

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
    id: log.id, // let server honor the client id so delete/PR stay consistent (no id remap)
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
  birthDate?: string | null;
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

export type AssistKind = 'none' | 'band' | 'assisted' | 'partner';
export interface SetConfig {
  type: 'reps' | 'hold' | 'emom';
  reps?: number;
  weight?: number;
  durationSeconds?: number;
  repsPerInterval?: number;
  intervalSeconds?: number;
  totalIntervals?: number;
  minutes?: number[]; // EMOM per-minute reps override (length = totalIntervals); absent = uniform repsPerInterval
  note?: string;
  // ── composable prescription (all optional; missing = today's behavior) ──
  measure?: 'reps' | 'time' | 'distance'; // default derived from type
  distanceMeters?: number;
  tempo?: string;        // e.g. "3/1/2/0" or "x/2/2/1"
  assist?: AssistKind;   // band / machine / partner assisted
  toFailure?: boolean;   // max-time hold, AMRAP-of-one-move
  rpe?: number;          // 1..10 target effort
  dropSteps?: { value?: number; load?: number; assist?: AssistKind }[];
}

// Interval / cardio block (running, HIIT) — a third block kind besides single-exercise + combo.
export interface IntervalBlock {
  work: { measure: 'time' | 'distance'; durationSeconds?: number; distanceMeters?: number; pace?: string };
  recovery?: { measure: 'time' | 'distance'; durationSeconds?: number; distanceMeters?: number; kind?: 'passive' | 'active' };
  rounds: number;
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
  components?: {
    exerciseId: string; name: string; muscleGroup: string;
    setType?: 'reps' | 'hold' | 'emom'; // absent = 'reps' (backward compat)
    reps?: number; weight?: number;
    durationSeconds?: number; repsPerInterval?: number; intervalSeconds?: number; totalIntervals?: number;
  }[];
  comboRounds?: number;
  comboReps?: number;
  // combo execution mode: 'circuit' (default), 'emom', or 'amrap' (rounds in a time cap).
  mode?: 'circuit' | 'emom' | 'amrap';
  intervalSeconds?: number; // emom mode: seconds per minute-slot (default 60)
  timeCapSeconds?: number;  // amrap mode: total time cap; count rounds
  // interval/cardio block (running, HIIT) — when set, this entry is an interval block.
  kind?: 'exercise' | 'combo' | 'intervals';
  intervals?: IntervalBlock;
}

export interface ProgramDay {
  id?: string;
  weekIndex: number;
  dayIndex: number; // 0=Mon .. 6=Sun
  restDay: boolean;
  templateId?: string | null;
  name?: string;                  // inline workout name (when not using a template)
  exercises?: TemplateExercise[]; // inline workout exercises (either this or templateId)
  // a day can hold 1+ sessions (morning run + evening calisthenics). Read via
  // daySessions() (lib/program-sessions) which falls back to the legacy fields above.
  sessions?: { id: string; label?: string; name?: string; templateId?: string | null; exercises?: TemplateExercise[] }[];
  label: string;
  notes: string;
}
export interface WeekMeta {
  index: number; // 0-based week index
  name: string;
  notes: string;
}
export interface Program {
  id: string;
  userId: string;
  name: string;
  startDate?: string | null;
  weeks: number;
  notes: string;
  days: ProgramDay[];
  weekMeta?: WeekMeta[];
  // server-provided sharing metadata (present on objects hydrated from the API)
  canShare?: boolean;      // true only for user-authored originals
  expired?: boolean;       // a received snapshot whose access window lapsed
  sourceOwnerId?: string | null; // set on received copies
}

// ── program enrollment / scheduling ──
export type DayStatus = 'done' | 'skipped' | 'rest';
export interface DayCompletion {
  weekIndex: number;
  dayIndex: number;
  status: DayStatus;
  completedDate?: string | null;
  durationMin?: number | null;
  logId?: string | null;
}
// per-day flagged deviation for an enrollment, keyed by "<week>-<day>"
export interface DayEdit { added?: TemplateExercise[]; removed?: string[] }
export interface Enrollment {
  id: string;
  userId: string;
  programId: string;
  startDate: string;
  status: 'active' | 'finished' | 'abandoned';
  dayEdits: Record<string, DayEdit>;
  dayOrder?: string[]; // per-enrollment day sequence (from swaps); "<week>-<day>" keys
  completions: DayCompletion[];
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
  primaryMuscle?: string;
  otherMuscles?: string[];
  equipment?: string;
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
  // set when this session is a program day being run, so finishing marks it done
  // + records add/remove deviations vs the template exercise ids.
  program?: { enrollmentId: string; weekIndex: number; slotDay: number; templateExerciseIds?: string[]; substitute?: boolean };
  exercises: {
    exerciseId: string;
    name: string;
    muscleGroup: string;
    restSeconds: number;
    weightUnit?: 'kg' | 'lb'; // per-exercise display/input unit; weights stored canonically in kg
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
    // combo execution mode: 'circuit' (default) or 'emom'. In emom mode the
    // rounds structure is unchanged — rounds = cycles through the component
    // sequence; minute m maps to rounds[floor(m/len)].entries[m % len].
    mode?: 'circuit' | 'emom' | 'amrap';
    intervalSeconds?: number; // emom mode: seconds per minute-slot (default 60)
    timeCapSeconds?: number;  // amrap mode: total time cap
    kind?: 'exercise' | 'combo' | 'intervals';
    intervals?: IntervalBlock;
    components?: { exerciseId: string; name: string; muscleGroup: string }[];
    rounds?: {
      status: 'pending' | 'done' | 'skipped' | 'in_progress';
      // aligned to components; each entry carries its component's set type + fields.
      // Sessions persisted before per-component set types have {reps,weight}-only
      // entries (no `type`) — readers must treat a missing type as 'reps'.
      entries: SetConfig[];
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
  weightUnit: WeightUnit;
  setWeightUnit: (u: WeightUnit) => void;
  likedPosts: Set<string>;
  toggleLike: (postId: string) => void;
  streak: number;
  weeklyWorkouts: number;
  inBodyTests: InBodyTest[];
  addInBodyTest: (test: Omit<InBodyTest, 'id'>) => void;
  deleteInBodyTest: (id: string) => void;
  workoutTemplates: WorkoutTemplate[];
  addWorkoutTemplate: (t: Omit<WorkoutTemplate, 'id'>) => void;
  updateWorkoutTemplate: (id: string, t: Omit<WorkoutTemplate, 'id'>) => void;
  deleteWorkoutTemplate: (id: string) => void;
  programs: Program[];
  addProgram: (p: Omit<Program, 'id' | 'userId'>) => string;
  updateProgram: (id: string, p: Omit<Program, 'id' | 'userId'>) => void;
  deleteProgram: (id: string) => void;
  refreshPrograms: () => void;
  enrollments: Enrollment[];
  activeEnrollment: Enrollment | null;
  refreshEnrollments: () => void;
  startProgram: (programId: string, startDate: string) => Promise<void>;
  endEnrollment: (id: string) => void;
  updateEnrollmentLocal: (id: string, patch: { startDate?: string; status?: Enrollment['status']; dayEdits?: Enrollment['dayEdits']; dayOrder?: string[] }) => void;
  setEnrollmentDay: (id: string, weekIndex: number, dayIndex: number, status: DayStatus, opts?: { completedDate?: string; durationMin?: number; logId?: string }) => void;
  clearEnrollmentDay: (id: string, weekIndex: number, dayIndex: number) => void;
  setEnrollmentDayEdit: (id: string, weekIndex: number, dayIndex: number, edit: DayEdit) => void;
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
  WEIGHT_UNIT: 'nafas_weight_unit',
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
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>('kg');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set(['p2', 'p5']));
  const [inBodyTests, setInBodyTests] = useState<InBodyTest[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
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
        AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_UNIT).then(u => { if (u === 'lb' || u === 'kg') setWeightUnitState(u); });
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
              // server is source of truth — set unconditionally (including []), so a
              // cleared history actually clears locally instead of keeping stale logs.
              if (Array.isArray(logs)) setWorkoutLogs(logs.map((l: any) => ({
                ...l,
                totalVolumeKg: Number(l.totalVolumeKg) || 0,
                totalSets: Number(l.totalSets) || 0,
                completedSets: Number(l.completedSets) || 0,
                skippedSets: Number(l.skippedSets) || 0,
                totalReps: Number(l.totalReps) || 0,
                durationMinutes: Number(l.durationMinutes) || 0,
              })) as any);
              if (tmpls?.length) setWorkoutTemplates(tmpls as any);
              workoutApi.programs().then(ps => { if (Array.isArray(ps)) setPrograms(ps as any); }).catch(() => {});
              workoutApi.enrollments().then(es => { if (Array.isArray(es)) setEnrollments(es as any); }).catch(() => {});
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

  const setWeightUnit = useCallback((u: WeightUnit) => {
    setWeightUnitState(u);
    AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_UNIT, u);
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

  // remove a test; InBody stats (latest/trend/target/history) derive from this list, so they recompute
  const deleteInBodyTest = useCallback((id: string) => {
    setInBodyTests(prev => {
      const updated = prev.filter(t => t.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.INBODY, JSON.stringify(updated));
      return updated;
    });
    nutritionApi.deleteInbody(id).catch(() => {});
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

  const updateWorkoutTemplate = useCallback((id: string, t: Omit<WorkoutTemplate, 'id'>) => {
    setWorkoutTemplates(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...t, id } : p);
      AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    workoutApi.updateTemplate(id, { name: t.name, exercises: (t as any).exercises ?? [] })
      .then(() => workoutApi.templates())
      .then(srv => setWorkoutTemplates(srv as any))
      .catch(() => {});
  }, []);

  const deleteWorkoutTemplate = useCallback((id: string) => {
    setWorkoutTemplates(prev => {
      const updated = prev.filter(t => t.id !== id);
      AsyncStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
      return updated;
    });
    workoutApi.deleteTemplate(id).catch(() => {});
  }, []);

  // ── programs (multi-week schedules) ───────────────────────────────────────
  const programToApi = (p: Omit<Program, 'id' | 'userId'> & { id?: string }) => ({
    id: p.id, name: p.name, startDate: p.startDate ?? null, weeks: p.weeks, notes: p.notes ?? '',
    days: (p.days ?? []).map(d => ({
      weekIndex: d.weekIndex, dayIndex: d.dayIndex, restDay: !!d.restDay,
      templateId: d.templateId ?? null, name: d.name ?? '', exercises: d.exercises ?? [],
      sessions: d.sessions ?? [],
      label: d.label ?? '', notes: d.notes ?? '',
    })),
    weekMeta: (p.weekMeta ?? []).map(m => ({ index: m.index, name: m.name ?? '', notes: m.notes ?? '' })),
  });
  const addProgram = useCallback((p: Omit<Program, 'id' | 'userId'>): string => {
    const id = Crypto.randomUUID();
    const local: Program = { ...p, id, userId: user?.id || 'u1' };
    setPrograms(prev => [...prev, local]);
    workoutApi.createProgram(programToApi({ ...p, id }))
      .then(() => workoutApi.programs()).then(srv => { if (Array.isArray(srv)) setPrograms(srv as any); })
      .catch(() => {});
    return id;
  }, [user]);
  const updateProgram = useCallback((id: string, p: Omit<Program, 'id' | 'userId'>) => {
    setPrograms(prev => prev.map(x => x.id === id ? { ...x, ...p, id } : x));
    workoutApi.updateProgram(id, programToApi({ ...p, id }))
      .then(() => workoutApi.programs()).then(srv => { if (Array.isArray(srv)) setPrograms(srv as any); })
      .catch(() => {});
  }, []);
  const deleteProgram = useCallback((id: string) => {
    setPrograms(prev => prev.filter(x => x.id !== id));
    workoutApi.deleteProgram(id).catch(() => {});
  }, []);
  const refreshPrograms = useCallback(() => {
    workoutApi.programs().then(srv => { if (Array.isArray(srv)) setPrograms(srv as any); }).catch(() => {});
  }, []);

  const refreshEnrollments = useCallback(() => {
    workoutApi.enrollments().then(srv => { if (Array.isArray(srv)) setEnrollments(srv as any); }).catch(() => {});
  }, []);

  // The mount fetch can run before a fresh login's token exists (leaving programs/
  // enrollments empty until a reload). Refetch once the user is known.
  useEffect(() => {
    if (!user?.id) return;
    refreshPrograms();
    refreshEnrollments();
  }, [user?.id, refreshPrograms, refreshEnrollments]);

  // Start a program for a period. Server retires any prior active enrollment.
  const startProgram = useCallback(async (programId: string, startDate: string) => {
    const created: any = await workoutApi.enroll(programId, startDate);
    setEnrollments(prev => {
      const retired = prev.map(e => e.status === 'active' ? { ...e, status: 'abandoned' as const } : e);
      return created?.id ? [created as Enrollment, ...retired] : retired;
    });
  }, []);

  const endEnrollment = useCallback((id: string) => {
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status: 'finished' as const } : e));
    workoutApi.updateEnrollment(id, { status: 'finished' }).catch(() => {});
  }, []);

  const updateEnrollmentLocal = useCallback((id: string, patch: { startDate?: string; status?: Enrollment['status']; dayEdits?: Enrollment['dayEdits']; dayOrder?: string[] }) => {
    setEnrollments(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    workoutApi.updateEnrollment(id, patch).catch(() => {});
  }, []);

  // add/remove exercises on a program day for this enrollment (flagged deviation)
  const setEnrollmentDayEdit = useCallback((id: string, weekIndex: number, dayIndex: number, edit: DayEdit) => {
    const key = `${weekIndex}-${dayIndex}`;
    setEnrollments(prev => prev.map(e => {
      if (e.id !== id) return e;
      const dayEdits = { ...(e.dayEdits || {}) };
      const empty = (!edit.added || edit.added.length === 0) && (!edit.removed || edit.removed.length === 0);
      if (empty) delete dayEdits[key]; else dayEdits[key] = edit;
      workoutApi.updateEnrollment(id, { dayEdits }).catch(() => {});
      return { ...e, dayEdits };
    }));
  }, []);

  const setEnrollmentDay = useCallback((id: string, weekIndex: number, dayIndex: number, status: DayStatus, opts?: { completedDate?: string; durationMin?: number; logId?: string }) => {
    const completedDate = opts?.completedDate ?? new Date().toISOString();
    const durationMin = opts?.durationMin ?? null;
    setEnrollments(prev => prev.map(e => {
      if (e.id !== id) return e;
      const rest = e.completions.filter(c => !(c.weekIndex === weekIndex && c.dayIndex === dayIndex));
      return { ...e, completions: [...rest, { weekIndex, dayIndex, status, completedDate, durationMin, logId: opts?.logId ?? null }] };
    }));
    workoutApi.setEnrollmentDay(id, { weekIndex, dayIndex, status, completedDate, durationMin, logId: opts?.logId ?? null }).catch(() => {});
  }, []);

  const clearEnrollmentDay = useCallback((id: string, weekIndex: number, dayIndex: number) => {
    setEnrollments(prev => prev.map(e => e.id === id
      ? { ...e, completions: e.completions.filter(c => !(c.weekIndex === weekIndex && c.dayIndex === dayIndex)) }
      : e));
    workoutApi.clearEnrollmentDay(id, weekIndex, dayIndex).catch(() => {});
  }, []);

  const activeEnrollment = useMemo(() => enrollments.find(e => e.status === 'active') ?? null, [enrollments]);

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
    // normalize to LOCAL Y-M-D on both sides — log dates may be full ISO timestamps,
    // and UTC (toISOString) shifts the day for non-UTC users → mismatched keys, streak 0.
    const key = (x: any) => { const d = new Date(x); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const days = new Set<string>([...workouts.map(w => w.date), ...workoutLogs.map(l => l.date)].map(key));
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (days.has(key(d))) count++;
      else if (i > 0) break; // allow "no workout yet today" without breaking the streak
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
    language, setLanguage, isDark, toggleTheme, weightUnit, setWeightUnit,
    enrollments, activeEnrollment, refreshEnrollments, startProgram, endEnrollment, updateEnrollmentLocal, setEnrollmentDay, clearEnrollmentDay, setEnrollmentDayEdit,
    likedPosts, toggleLike, streak, weeklyWorkouts,
    inBodyTests, addInBodyTest, deleteInBodyTest,
    workoutTemplates, addWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate,
    programs, addProgram, updateProgram, deleteProgram, refreshPrograms,
    workoutLogs, addWorkoutLog, deleteWorkoutLog,
    customExercises, addCustomExercise,
    exerciseLibrary, workoutTypes: workoutTypesData, muscleGroups: WORKOUT_MUSCLE_GROUPS,
    activeSession, setActiveSession,
    logout, deleteAccount,
  }), [user, onboardingComplete, workouts, todayNutrition, foodNames, setNutritionTargets, language, isDark, weightUnit, setWeightUnit, likedPosts, streak, weeklyWorkouts, inBodyTests, workoutTemplates, workoutLogs, customExercises, exerciseLibrary, workoutTypesData, activeSession, setUser, setOnboardingComplete, addWorkout, addMealItem, setLanguage, toggleTheme, toggleLike, addInBodyTest, deleteInBodyTest, addWorkoutTemplate, updateWorkoutTemplate, deleteWorkoutTemplate, programs, addProgram, updateProgram, deleteProgram, refreshPrograms, enrollments, activeEnrollment, refreshEnrollments, startProgram, endEnrollment, updateEnrollmentLocal, setEnrollmentDay, clearEnrollmentDay, setEnrollmentDayEdit, addWorkoutLog, deleteWorkoutLog, addCustomExercise, setActiveSession, logout, deleteAccount]);

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
