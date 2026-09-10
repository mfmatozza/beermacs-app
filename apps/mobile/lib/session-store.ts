import { create } from "zustand";

/**
 * Whether this device has a session. Small enough to be a single global flag
 * rather than React Context, and it needs to be both read (RootLayout, to
 * decide between the register screen and the app) and written from deep
 * inside the tab navigator (Profile, after sign-out or account deletion) —
 * further from the root than a prop can reasonably thread.
 */
interface SessionState {
  readonly signedIn: boolean | null;
  readonly setSignedIn: (v: boolean) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  signedIn: null,
  setSignedIn: (v) => set({ signedIn: v }),
}));
