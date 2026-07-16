import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { useApp } from "@/lib/app-context";
import Colors from "@/constants/colors";
import { isEnabled } from "@/lib/features";

// Phase 1: land on the Workout tab (the "coach" route, relabelled).
export const unstable_settings = { initialRouteName: "coach" };

// Deferred tabs stay as routes but are hidden from the bar until their phase.
const tabHref = (enabled: boolean) => (enabled ? undefined : (null as any));

function NativeTabLayout() {
  return (
    <NativeTabs>
      {isEnabled("social") && (
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: "person.3", selected: "person.3.fill" }} />
          <Label>Communities</Label>
        </NativeTabs.Trigger>
      )}
      {isEnabled("discovery") && (
        <NativeTabs.Trigger name="events">
          <Icon sf={{ default: "calendar", selected: "calendar" }} />
          <Label>Discover</Label>
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="coach">
        <Icon sf={{ default: "figure.strengthtraining.traditional", selected: "figure.strengthtraining.traditional" }} />
        <Label>Workout</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="nutrition">
        <Icon sf={{ default: "fork.knife", selected: "fork.knife" }} />
        <Label>Nutrition</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const { isDark } = useApp();
  const { t } = useTranslation();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: isDark ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
        tabBarLabelStyle: { fontFamily: 'Rubik_500Medium', fontSize: 11 },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : isDark ? Colors.dark.tabBar : Colors.light.tabBar,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: isDark ? Colors.dark.border : Colors.light.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? Colors.dark.tabBar : Colors.light.tabBar }]} />
          ) : null,
      }}
    >
      {/* Communities — hidden until Phase 3 (social) */}
      <Tabs.Screen
        name="index"
        options={{
          href: tabHref(isEnabled("social")),
          title: t("nav.communities"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* Discover — hidden until Phase 2 (discovery) */}
      <Tabs.Screen
        name="events"
        options={{
          href: tabHref(isEnabled("discovery")),
          title: t("discover.title"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "compass" : "compass-outline"} size={24} color={color} />
          ),
        }}
      />
      {/* Workout (the "coach" route, AI folded in) — Phase 1 home */}
      <Tabs.Screen
        name="coach"
        options={{
          title: t("nav.workout"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "barbell" : "barbell-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: t("nav.nutrition"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "nutrition" : "nutrition-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
