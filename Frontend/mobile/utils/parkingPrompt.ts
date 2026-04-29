import AsyncStorage from "@react-native-async-storage/async-storage";

const PROMPT_KEY = "parking_prompt_last";
const PROMPT_COOLDOWN_MS = 15 * 60 * 1000;

export async function shouldShowParkingPrompt(): Promise<boolean> {
  try {
    const lastRaw = await AsyncStorage.getItem(PROMPT_KEY);
    if (!lastRaw) return true;
    const last = Number(lastRaw);
    if (!Number.isFinite(last)) return true;
    return Date.now() - last > PROMPT_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export async function markParkingPromptShown(): Promise<void> {
  await AsyncStorage.setItem(PROMPT_KEY, String(Date.now()));
}
