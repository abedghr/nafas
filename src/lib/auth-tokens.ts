import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS = "nafas_access_token";
const REFRESH = "nafas_refresh_token";

export const tokens = {
  async get(): Promise<{ access: string | null; refresh: string | null }> {
    const pairs = await AsyncStorage.multiGet([ACCESS, REFRESH]);
    const map = Object.fromEntries(pairs);
    return { access: map[ACCESS] ?? null, refresh: map[REFRESH] ?? null };
  },
  async set(access: string, refresh: string) {
    await AsyncStorage.multiSet([[ACCESS, access], [REFRESH, refresh]]);
  },
  async clear() {
    await AsyncStorage.multiRemove([ACCESS, REFRESH]);
  },
};
