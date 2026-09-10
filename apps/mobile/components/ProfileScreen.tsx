import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type MeResponse } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { useSessionStore } from "../lib/session-store";
import { raw, TAB_BAR_HEIGHT } from "../lib/theme";

/**
 * Account info, sign-out, and account deletion.
 *
 * The deletion control exists because App Store guideline 5.1.1(v) requires
 * it reachable INSIDE the app — "email support to delete your account" does
 * not satisfy review once signup collects real contact details (G-1). It is
 * not a stub: it actually calls Better Auth's delete-user endpoint and signs
 * the device out on success.
 */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const setSignedIn = useSessionStore((s) => s.setSignedIn);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .me()
      .then((r) => {
        if (!cancelled) setMe(r);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load your profile. Check your connection.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setSignedIn(false);
  }, [setSignedIn]);

  return (
    <ScrollView
      className="flex-1 bg-stout-900"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
      }}
      contentContainerClassName="gap-6 px-4"
      showsVerticalScrollIndicator={false}
    >
      <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">Profile</Text>

      {me ? (
        <View className="gap-3 rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
          <Row label="Name" value={me.user.displayName} />
          <Row label="Email" value={me.user.email} />
          <Row label="Phone" value={me.user.phone || "—"} />
        </View>
      ) : loadError ? (
        <Text className="font-sans text-[13px] text-dispute">{loadError}</Text>
      ) : (
        <ActivityIndicator color={raw.beer} />
      )}

      <Pressable
        onPress={() => void signOut()}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        className="min-h-[48px] items-center justify-center rounded-lg border border-stout-500 px-6 active:opacity-70"
      >
        <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">Sign out</Text>
      </Pressable>

      <DeleteAccount onDeleted={() => setSignedIn(false)} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-0.5">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {label}
      </Text>
      <Text className="font-sans text-[15px] text-cream">{value}</Text>
    </View>
  );
}

function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your account and personal data. Match results you played in stay in the venue's history with your name removed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              const res = await authClient.deleteUser({ password });
              setBusy(false);
              if (res.error) {
                setError(res.error.message ?? "Couldn't delete your account. Check your password.");
                return;
              }
              onDeleted();
            })();
          },
        },
      ]
    );
  }, [password, onDeleted]);

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        className="items-center py-2"
      >
        <Text className="font-sans-med text-[13px] text-dispute">Delete account</Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-3 rounded-2xl border border-dispute/50 bg-dispute/10 p-4">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-dispute">
        Confirm your password to delete your account
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        placeholder="Password"
        placeholderTextColor={raw.textFaint}
        accessibilityLabel="Password"
        className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 font-sans text-[15px] text-cream"
      />
      {error ? <Text className="font-sans text-[13px] text-dispute">{error}</Text> : null}
      <View className="flex-row gap-3">
        <Pressable
          onPress={() => {
            setOpen(false);
            setPassword("");
            setError(null);
          }}
          className="min-h-[44px] flex-1 items-center justify-center rounded-lg border border-stout-500 active:opacity-70"
        >
          <Text className="font-sans-med text-[13px] text-cream">Cancel</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          disabled={busy || password.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          className={`min-h-[44px] flex-1 items-center justify-center rounded-lg bg-dispute active:opacity-70 ${
            busy || password.length === 0 ? "opacity-50" : ""
          }`}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="font-sans-med text-[13px] text-white">Delete</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
