import { createRef } from 'react';
import { CommonActions, NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createRef<NavigationContainerRef<RootStackParamList>>();

// Readiness flag to avoid dispatching before container mounts
export let isNavigationReady = false;

// Queue to buffer navigation actions until ready
const pendingActions: Array<() => void> = [];

export const setNavigationReady = () => {
  isNavigationReady = true;
  // Flush any queued actions
  while (pendingActions.length > 0) {
    const fn = pendingActions.shift();
    try { fn && fn(); } catch {}
  }
};

// Enqueue a navigation action to run when ready
export const enqueueNavAction = (fn: () => void) => {
  if (isNavigationReady && navigationRef.current) {
    try { fn(); } catch {}
  } else {
    pendingActions.push(fn);
  }
};

// Convenience: reset to Login safely
export const safeResetToLogin = () => enqueueNavAction(() => {
  const nav = navigationRef.current;
  if (!nav) return;
  // Only attempt reset if 'Login' is a registered route in the current tree.
  const rootState: any = (nav as any).getRootState?.();
  const routeNames: string[] | undefined = rootState?.routeNames;
  if (!Array.isArray(routeNames) || !routeNames.includes('Login')) {
    // Auth state change (clearing tokens) will re-render the root to unauth stack.
    return;
  }
  const route = nav.getCurrentRoute();
  if (route?.name === 'Login') return;
  nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Login' as any }] }));
});
