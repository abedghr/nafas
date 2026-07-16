import { tokens } from "@/src/lib/auth-tokens";
import type { Me, TokenPair } from "./api";
import type { UserProfile } from "@/lib/app-context";

// Map the backend's Me onto the app's UserProfile shape.
export function mapMeToProfile(me: Me): UserProfile {
  return {
    id: me.id,
    name: me.name,
    username: me.username,
    email: me.email,
    type: me.role === "coach" ? "coach" : "athlete",
    avatar: me.avatarUrl || `https://i.pravatar.cc/150?u=${me.id}`,
    height: me.height ?? 0,
    weight: me.weight ?? 0,
    age: me.age ?? 0,
    gender: me.gender ?? "",
    interests: me.interests ?? [],
    goal: me.goal ?? "",
    rank: me.rank,
    followers: 0,
    following: 0,
    bio: me.bio ?? "",
    profileComplete: me.profileComplete,
  };
}

// Store tokens after a successful auth, return the mapped profile.
export async function persistSession(pair: TokenPair): Promise<UserProfile> {
  await tokens.set(pair.accessToken, pair.refreshToken);
  return mapMeToProfile(pair.user);
}

export async function clearSession() {
  await tokens.clear();
}
