import React, { useRef, Suspense } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import { RoleProvider } from './src/context/RoleContext';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef, setNavigationReady } from './src/navigation/navigationRef';
import RootNavigator from './src/navigation/index';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  const routeNameRef = useRef<string | undefined>(undefined);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <AuthProvider>
      <RoleProvider>
      <NavigationContainer 
        ref={navigationRef}
        onReady={() => {
          routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
          setNavigationReady();
        }}
        onStateChange={async () => {
          const previousRouteName = routeNameRef.current;
          const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
          
          if (previousRouteName !== currentRouteName) {
            console.log('Navigated to:', currentRouteName);
          }
          
          routeNameRef.current = currentRouteName;
        }}
      >
        <Suspense fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        }>
          <RootNavigator />
          <StatusBar style="auto" />
        </Suspense>
      </NavigationContainer>
      </RoleProvider>
    </AuthProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
