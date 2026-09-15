import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, type MeResponse } from "../lib/api";
import { authClient } from "../lib/auth-client";
import { useSessionStore } from "../lib/session-store";
import { raw, TAB_BAR_HEIGHT } from "../lib/theme";
import { networkErrorMessage, withTimeout } from "../lib/with-timeout";

/**
 * Account, stats, notification preferences, security, sign-out, and
 * deletion. Everything here reads real data — stats and the history link
 * are only meaningful once a tournament can actually reach COMPLETE (see
 * docs/DECISIONS.md D16), which it now can.
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
  const [helpOpen, setHelpOpen] = useState(false);

  const meQuery = useQuery({ queryKey: ["me"], queryFn: api.me });
  const historyQuery = useQuery({ queryKey: ["history"], queryFn: api.history });

  const stats = useMemo(() => {
    const entries = historyQuery.data?.entries ?? [];
    return {
      tournaments: entries.length,
      wins: entries.reduce((sum, e) => sum + e.wins, 0),
      losses: entries.reduce((sum, e) => sum + e.losses, 0),
    };
  }, [historyQuery.data]);

  const signOut = useCallback(async () => {
    // Clears local session regardless of whether the server call itself
    // succeeds — "sign me out" should never leave someone stuck signed in
    // just because the network hung (see with-timeout.ts's own doc comment).
    try {
      await withTimeout(authClient.signOut());
    } catch {
      // Local sign-out below still happens.
    }
    setSignedIn(false);
  }, [setSignedIn]);

  return (
    <>
      <ScrollView
        className="flex-1 bg-stout-900"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 24,
        }}
        contentContainerClassName="gap-5 px-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-display text-3xl uppercase tracking-[1.2px] text-cream">
            Profile
          </Text>
          <Pressable
            onPress={() => setHelpOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Get help or send feedback"
            className="h-9 w-9 items-center justify-center rounded-full border border-stout-500 active:opacity-70"
          >
            <Ionicons name="help-outline" size={18} color={raw.textFaint} />
          </Pressable>
        </View>

        {meQuery.isLoading || !meQuery.data ? (
          meQuery.isError ? (
            <Text className="font-sans text-[13px] text-dispute">
              Couldn&rsquo;t load your profile. Check your connection.
            </Text>
          ) : (
            <ActivityIndicator color={raw.beer} />
          )
        ) : (
          <>
            <AccountCard me={meQuery.data} />

            <View className="flex-row gap-3">
              <StatBox label="Tournaments" value={stats.tournaments} />
              <StatBox label="Wins" value={stats.wins} />
              <StatBox label="Losses" value={stats.losses} />
            </View>

            <Pressable
              onPress={() => router.navigate("/history")}
              accessibilityRole="button"
              accessibilityLabel="View tournament history"
              className="min-h-[48px] flex-row items-center justify-between rounded-2xl border border-stout-600 bg-stout-850 px-4 active:opacity-70"
            >
              <Text className="font-sans-med text-[14px] text-cream">Tournament history</Text>
              <Text className="font-sans text-[13px] text-beer-400">View →</Text>
            </Pressable>

            {meQuery.data.memberships.some(
              (m) => m.role === "VENUE_ADMIN" || m.role === "VENUE_OWNER"
            ) ? (
              <Pressable
                onPress={() => router.push("/admin")}
                accessibilityRole="button"
                accessibilityLabel="Manage a venue"
                className="min-h-[48px] flex-row items-center justify-between rounded-2xl border border-beer-500/40 bg-beer-500/10 px-4 active:opacity-70"
              >
                <Text className="font-sans-med text-[14px] text-cream">Manage a venue</Text>
                <Text className="font-sans text-[13px] text-beer-400">Open →</Text>
              </Pressable>
            ) : null}

            <NotificationPreferences />
            <SecuritySection />

            <Pressable
              onPress={() => void signOut()}
              accessibilityRole="button"
              accessibilityLabel="Sign out"
              className="min-h-[48px] items-center justify-center rounded-lg border border-stout-500 px-6 active:opacity-70"
            >
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-cream">
                Sign out
              </Text>
            </Pressable>

            <DeleteAccount onDeleted={() => setSignedIn(false)} />
          </>
        )}
      </ScrollView>
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}

// ── Help: Profile's "?" button — feeds the same /api/support inbox the web
// contact form does, so there's one backoffice queue, not two. ─────────────

function HelpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);

  const submitMutation = useMutation({
    mutationFn: () => api.submitSupport({ body: body.trim() }),
    onSuccess: () => setSent(true),
    onError: () => Alert.alert("Couldn't send that", "Check your connection and try again."),
  });

  const close = () => {
    onClose();
    // Reset after the close animation, not before — an instant reset would
    // flash the form back to empty while the sheet is still visibly sliding
    // away.
    setTimeout(() => {
      setBody("");
      setSent(false);
      submitMutation.reset();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <View
        className="flex-1 bg-stout-900 px-5"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      >
        <View className="mb-6 flex-row items-center justify-between">
          <Text className="font-display text-2xl uppercase tracking-[1.2px] text-cream">
            Help &amp; feedback
          </Text>
          <Pressable
            onPress={close}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            className="h-9 w-9 items-center justify-center rounded-full border border-stout-500 active:opacity-70"
          >
            <Ionicons name="close" size={18} color={raw.textFaint} />
          </Pressable>
        </View>

        {sent ? (
          <View className="flex-1 items-center justify-center gap-3">
            <Ionicons name="checkmark-circle" size={40} color={raw.beer} />
            <Text className="font-sans-med text-[15px] text-cream">
              Sent — we&rsquo;ll reply by email.
            </Text>
          </View>
        ) : (
          <>
            <Text className="mb-4 font-sans text-[13px] leading-[19px] text-cream-dim">
              A bug, a suggestion, a question about your account — this goes straight to us, along
              with your name and email.
            </Text>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="What's going on?"
              placeholderTextColor={raw.textFaint}
              multiline
              autoFocus
              maxLength={2000}
              textAlignVertical="top"
              className="min-h-[160px] rounded-lg border border-stout-500 bg-stout-850 px-4 py-3 font-sans text-[15px] text-cream"
            />
            <Pressable
              onPress={() => void submitMutation.mutate()}
              disabled={!body.trim() || submitMutation.isPending}
              accessibilityRole="button"
              accessibilityLabel="Send"
              className={`mt-4 min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
                !body.trim() || submitMutation.isPending ? "opacity-40" : ""
              }`}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator size="small" color={raw.canvas} />
              ) : (
                <Text className="font-display text-lg uppercase tracking-[0.6px] text-stout-900">
                  Send
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

// ── Account: avatar, name/phone edit, email verification ───────────────────

function AccountCard({ me }: { me: MeResponse }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(me.user.displayName);
  const [phone, setPhone] = useState(me.user.phone);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const initials = me.user.displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const save = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      // Built as a variable, not an object literal: same reason RegisterScreen's
      // signUp.email payload is — the mobile client isn't type-linked to the
      // server's `auth` instance, so TS only knows the base updateUser shape
      // and would apply excess-property checking to a literal. `displayName`/
      // `phone` (Better Auth additionalFields, see apps/web/lib/auth.ts) still
      // reach the server at runtime either way.
      const payload = {
        name: displayName.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
      };
      const res = await withTimeout(authClient.updateUser(payload));
      if (res.error) {
        setSaveError(res.error.message ?? "Couldn't save those changes.");
        return;
      }
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setSaveError(networkErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [displayName, phone, queryClient]);

  const pickAvatar = useCallback(async () => {
    setAvatarError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setAvatarError("Allow photo library access in Settings to set a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.base64) {
      setAvatarError("Couldn't read that photo. Try another one.");
      return;
    }
    setAvatarBusy(true);
    try {
      await api.setAvatar({
        image: `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
      });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setAvatarError("Couldn't upload that photo. Try again in a moment.");
    } finally {
      setAvatarBusy(false);
    }
  }, [queryClient]);

  const removeAvatar = useCallback(async () => {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.removeAvatar();
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch {
      setAvatarError("Couldn't remove your photo. Try again in a moment.");
    } finally {
      setAvatarBusy(false);
    }
  }, [queryClient]);

  return (
    <View className="gap-4 rounded-2xl border border-stout-600 bg-stout-750/85 p-4">
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => void pickAvatar()}
          disabled={avatarBusy}
          accessibilityRole="button"
          accessibilityLabel="Change profile picture"
          className="h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-beer-500"
        >
          {avatarBusy ? (
            <ActivityIndicator size="small" color={raw.canvas} />
          ) : me.user.image ? (
            <Image source={{ uri: me.user.image }} className="h-14 w-14" resizeMode="cover" />
          ) : (
            <Text className="font-display text-xl text-stout-900">{initials || "?"}</Text>
          )}
        </Pressable>
        <View className="flex-1 gap-0.5">
          {editing ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              accessibilityLabel="Name"
              className="rounded-lg border border-stout-500 bg-stout-900/70 px-3 py-2 font-sans-med text-[15px] text-cream"
            />
          ) : (
            <Text className="font-display text-lg text-cream">{me.user.displayName}</Text>
          )}
          <Text className="font-sans text-[13px] text-cream-dim" numberOfLines={1}>
            {me.user.email}
          </Text>
        </View>
        <Pressable
          onPress={() => (editing ? void save() : setEditing(true))}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel={editing ? "Save profile" : "Edit profile"}
          className="px-2 py-1"
        >
          {saving ? (
            <ActivityIndicator size="small" color={raw.beer} />
          ) : (
            <Text className="font-sans-med text-[13px] text-beer-400">
              {editing ? "Save" : "Edit"}
            </Text>
          )}
        </Pressable>
      </View>

      {editing ? (
        <View className="gap-1.5">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
            Phone
          </Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            accessibilityLabel="Phone"
            className="rounded-lg border border-stout-500 bg-stout-900/70 px-3 py-2 font-sans text-[15px] text-cream"
          />
        </View>
      ) : (
        <Text className="font-sans text-[13px] text-cream-dim">
          {me.user.phone || "No phone on file"}
        </Text>
      )}
      {saveError ? <Text className="font-sans text-[12px] text-dispute">{saveError}</Text> : null}
      {avatarError ? (
        <Text className="font-sans text-[12px] text-dispute">{avatarError}</Text>
      ) : null}

      {me.user.image ? (
        <Pressable
          onPress={() => void removeAvatar()}
          disabled={avatarBusy}
          accessibilityRole="button"
        >
          <Text className="font-sans-med text-[12px] text-cream-faint">Remove photo</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-2xl border border-stout-600 bg-stout-850 py-3">
      <Text className="font-display text-2xl tabular-nums text-cream">{value}</Text>
      <Text className="font-sans-med text-[10px] uppercase tracking-[0.8px] text-cream-faint">
        {label}
      </Text>
    </View>
  );
}

// ── Notification preferences ────────────────────────────────────────────────

function NotificationPreferences() {
  const queryClient = useQueryClient();
  const prefsQuery = useQuery({ queryKey: ["push-prefs"], queryFn: api.notificationPreferences });
  const mutation = useMutation({
    mutationFn: api.setNotificationPreferences,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["push-prefs"] }),
  });

  return (
    <View className="gap-3 rounded-2xl border border-stout-600 bg-stout-850 p-4">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        Notifications
      </Text>
      <PrefRow
        label="Match updates"
        detail="You're up, results to confirm, disputes"
        value={prefsQuery.data?.match ?? true}
        onChange={(v) => mutation.mutate({ match: v })}
        disabled={prefsQuery.isLoading}
      />
      <PrefRow
        label="Messages from the bar"
        detail="Announcements and direct messages from staff"
        value={prefsQuery.data?.news ?? true}
        onChange={(v) => mutation.mutate({ news: v })}
        disabled={prefsQuery.isLoading}
      />
    </View>
  );
}

function PrefRow({
  label,
  detail,
  value,
  onChange,
  disabled,
}: {
  label: string;
  detail: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-med text-[14px] text-cream">{label}</Text>
        <Text className="font-sans text-[12px] text-cream-dim">{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: raw.hairline, true: raw.beer }}
        accessibilityLabel={label}
      />
    </View>
  );
}

// ── Account & security: change password ─────────────────────────────────────

function SecuritySection() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);
    if (next.length < 10) {
      setError("New password must be at least 10 characters.");
      return;
    }
    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await withTimeout(
        authClient.changePassword({ currentPassword: current, newPassword: next })
      );
      if (res.error) {
        setError(res.error.message ?? "Couldn't change your password. Check your current one.");
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice("Password changed.");
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [current, next, confirm]);

  return (
    <View className="gap-3 rounded-2xl border border-stout-600 bg-stout-850 p-4">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        className="flex-row items-center justify-between"
      >
        <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
          Account & security
        </Text>
        <Text className="font-sans-med text-[12px] text-beer-400">
          {open ? "Hide" : "Change password"}
        </Text>
      </Pressable>

      {open ? (
        <View className="gap-2">
          <SecureField label="Current password" value={current} onChangeText={setCurrent} />
          <SecureField label="New password" value={next} onChangeText={setNext} />
          <SecureField label="Confirm new password" value={confirm} onChangeText={setConfirm} />
          {error ? <Text className="font-sans text-[12px] text-dispute">{error}</Text> : null}
          {notice ? <Text className="font-sans text-[12px] text-live">{notice}</Text> : null}
          <Pressable
            onPress={() => void submit()}
            disabled={busy || !current || !next || !confirm}
            accessibilityRole="button"
            accessibilityLabel="Update password"
            className={`min-h-[44px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
              busy || !current || !next || !confirm ? "opacity-40" : ""
            }`}
          >
            {busy ? (
              <ActivityIndicator size="small" color={raw.canvas} />
            ) : (
              <Text className="font-display text-lg uppercase tracking-[0.6px] text-stout-900">
                Update password
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SecureField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View className="gap-1">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {label}
      </Text>
      <View className="flex-row items-center rounded-lg border border-stout-500 bg-stout-900/70">
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          accessibilityLabel={label}
          className="min-h-[44px] flex-1 px-3 font-sans text-[15px] text-cream"
        />
        <Pressable onPress={() => setVisible((v) => !v)} className="px-3" hitSlop={8}>
          <Text className="font-sans-med text-[11px] text-cream-faint">
            {visible ? "Hide" : "Show"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Danger zone ──────────────────────────────────────────────────────────────

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
              try {
                const res = await withTimeout(authClient.deleteUser({ password }));
                if (res.error) {
                  setError(
                    res.error.message ?? "Couldn't delete your account. Check your password."
                  );
                  return;
                }
                onDeleted();
              } catch (e) {
                setError(networkErrorMessage(e));
              } finally {
                setBusy(false);
              }
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
