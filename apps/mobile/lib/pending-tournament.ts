import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

/**
 * A tournament I've joined (POST /api/tournaments/join granted me a
 * VenueMembership) but haven't formed or joined a team in yet.
 *
 * There is no server-side record of this — joining a tournament and joining
 * a team are two separate steps (see apps/web/app/api/teams/join/route.ts's
 * header comment), and the first one leaves no row keyed to "this device is
 * mid-way through onboarding into tournament X". Rather than add a schema
 * just to represent a transient client-side waiting room, this is kept here
 * and persisted to SecureStore (already a dependency, via the auth session)
 * so it survives a force-quit between joining and forming a team.
 */
interface PendingTournament {
  readonly tournamentId: string;
  readonly tournamentName: string;
  readonly venueName: string | null;
}

interface PendingTournamentState {
  readonly pending: PendingTournament | null;
  readonly hydrated: boolean;
  readonly setPending: (v: PendingTournament | null) => void;
}

const STORE_KEY = "beermacs.pendingTournament";

export const usePendingTournamentStore = create<PendingTournamentState>((set) => ({
  pending: null,
  hydrated: false,
  setPending: (v) => {
    set({ pending: v });
    void (v
      ? SecureStore.setItemAsync(STORE_KEY, JSON.stringify(v))
      : SecureStore.deleteItemAsync(STORE_KEY));
  },
}));

// Fire-and-forget hydration at module load — mirrors how the auth session
// itself resolves asynchronously before RootLayout can route. Home renders
// its "loading" branch (already needed for the /api/me query) until this and
// the me query both settle, so there's no separate loading state to add.
void SecureStore.getItemAsync(STORE_KEY).then((raw) => {
  if (!raw) {
    usePendingTournamentStore.setState({ hydrated: true });
    return;
  }
  try {
    usePendingTournamentStore.setState({
      pending: JSON.parse(raw) as PendingTournament,
      hydrated: true,
    });
  } catch {
    usePendingTournamentStore.setState({ hydrated: true });
  }
});
