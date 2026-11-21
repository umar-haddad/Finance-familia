import { Stack } from 'expo-router';

import { AppContextProvider, useAppContext } from '@/providers/app-provider';

function AppRoutes() {
  const { colors } = useAppContext();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AppContextProvider>
      <AppRoutes />
    </AppContextProvider>
  );
}
