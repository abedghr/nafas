import { Alert, Platform } from "react-native";

// Cross-platform dialogs. react-native's Alert.alert is a NO-OP on
// react-native-web, so every confirm/alert must route through here or it
// silently does nothing in the web PWA.

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  const { title, message = "", confirmText = "OK", cancelText = "Cancel", destructive } = opts;
  if (Platform.OS === "web") {
    if (typeof window === "undefined" || !window.confirm) return Promise.resolve(false);
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message || undefined, [
      { text: cancelText, style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

export function alertDialog(title: string, message?: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.alert) window.alert(message ? `${title}\n\n${message}` : title);
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    Alert.alert(title, message || undefined, [{ text: "OK", onPress: () => resolve() }]);
  });
}
