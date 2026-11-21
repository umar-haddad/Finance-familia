import { Alert, Platform } from "react-native";

export function confirmDestructiveAction(
  title: string,
  message: string,
  actionLabel: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === "web") {
    if (
      typeof globalThis.confirm === "function" &&
      globalThis.confirm(`${title}\n\n${message}`)
    ) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: "Batal", style: "cancel" },
    { text: actionLabel, style: "destructive", onPress: onConfirm },
  ]);
}

export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    if (typeof globalThis.alert === "function") {
      globalThis.alert(`${title}\n\n${message}`);
    }
    return;
  }

  Alert.alert(title, message);
}
