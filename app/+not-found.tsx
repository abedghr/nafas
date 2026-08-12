import { Stack, router } from "expo-router";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Screen, EmptyState } from "@/components/ui";

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            icon="compass-outline"
            title={t("notFound.title", { defaultValue: "This screen doesn't exist" })}
            subtitle={t("notFound.subtitle", { defaultValue: "The page you're looking for can't be found." })}
            actionLabel={t("notFound.home", { defaultValue: "Go home" })}
            onAction={() => router.replace("/(tabs)/coach" as any)}
          />
        </View>
      </Screen>
    </>
  );
}
