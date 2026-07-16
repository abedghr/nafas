import {
  LayoutDashboard,
  Users,
  Globe,
  Dumbbell,
  ListChecks,
  Apple,
  Languages,
  Building2,
  LayoutGrid,
  GraduationCap,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  ready: boolean; // false = section built in a later feature
  phase?: string;
}

// Sections light up as each feature ships (Phase 1: Users, Countries, Exercises, Foods).
// label = i18n key (resolved with t() at render).
export const NAV: NavItem[] = [
  { to: "/app", label: "nav.dashboard", icon: LayoutDashboard, ready: true },
  { to: "/app/users", label: "nav.users", icon: Users, ready: true },
  { to: "/app/countries", label: "nav.countries", icon: Globe, ready: true },
  { to: "/app/exercises", label: "nav.exercises", icon: Dumbbell, ready: true },
  { to: "/app/workout-types", label: "nav.workoutTypes", icon: ListChecks, ready: true },
  { to: "/app/localization", label: "nav.localization", icon: Languages, ready: true },
  { to: "/app/foods", label: "nav.foods", icon: Apple, ready: true },
  { to: "/app/gyms", label: "nav.gyms", icon: Building2, ready: true },
  { to: "/app/facilities", label: "nav.facilities", icon: LayoutGrid, ready: true },
  // Restaurants hidden for now — route/page kept, just unlinked. Re-add when the domain is built out.
  // { to: "/app/restaurants", label: "nav.restaurants", icon: UtensilsCrossed, ready: true },
  { to: "/app/coaches", label: "nav.coaches", icon: GraduationCap, ready: true },
  { to: "/app/events", label: "nav.events", icon: Trophy, ready: true },
];
