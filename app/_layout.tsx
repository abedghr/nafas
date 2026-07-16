import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider, useApp } from "@/lib/app-context";
import { useFonts, Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold } from "@expo-google-fonts/rubik";
import "@/lib/i18n";

SplashScreen.preventAutoHideAsync();

function NavigationGuard() {
  const { user, onboardingComplete } = useApp();
  const segments = useSegments();
  // nudge to complete profile ONCE per app launch (not a hard lock — user can Skip)
  const promptedProfile = useRef(false);

  useEffect(() => {
    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';
    const isAuthenticated = user !== null && onboardingComplete;
    const profileDone = !!user?.profileComplete;

    // once the user has reached onboarding this launch, don't auto-redirect again (lets "Later" work)
    if (inOnboarding) promptedProfile.current = true;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/auth');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (isAuthenticated && !profileDone && !promptedProfile.current && !inOnboarding) {
      // first landing after opening the app with an incomplete profile → send once to finish it.
      // Skipping ("Later") returns to the app; a banner keeps offering it later.
      promptedProfile.current = true;
      router.replace('/onboarding');
    }
  }, [user, onboardingComplete, segments]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NavigationGuard />
      <Stack screenOptions={{ headerBackTitle: "Back", headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="community/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="workout-logger" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="meal-logger" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="user-profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="coach-profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="gym-profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="find-partner" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="comments/[postId]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="prepare-workout" options={{ headerShown: false }} />
        <Stack.Screen name="live-workout" options={{ headerShown: false, gestureEnabled: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="workout-summary" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="share-workout" options={{ headerShown: false }} />
        <Stack.Screen name="saved-workouts" options={{ headerShown: false }} />
        <Stack.Screen name="workout-detail/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppProvider>
              <RootLayoutNav />
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
