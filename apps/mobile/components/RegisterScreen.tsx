import { Ionicons } from "@expo/vector-icons";
import { registerInput, signInInput } from "@beermacs/shared";
import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authClient } from "../lib/auth-client";
import { API_URL } from "../lib/config";
import { raw } from "../lib/theme";
import { networkErrorMessage } from "../lib/with-timeout";
import AmbientBeer from "./AmbientBeer";
import GlowLogo from "./GlowLogo";

// Every branch below runs its network call inside try/catch/finally so `busy`
// always resets, and `networkErrorMessage` turns a dead connection into an
// explicit, user-visible message instead of an infinite spinner.

/** Where forgot-password emails send people back to (D16-adjacent: see
 *  apps/web/lib/auth.ts's sendResetPassword). Handled inline by this same
 *  screen (mode "reset") rather than a separate route — see the mode-switch
 *  effect below for why a route can't do this while signed out. */
const RESET_PASSWORD_REDIRECT = "beermacs://reset-password";

type Mode = "register" | "signin" | "forgot" | "forgot_sent" | "reset";

/**
 * One form for everyone (docs/DECISIONS.md D10) — a player creating their first
 * team and a bar owner setting up their venue go through the exact same screen,
 * just with a "create account" / "sign in" toggle. Also owns forgot/reset
 * password (D16): both are dead ends without an authenticated Stack to route
 * into (see RootLayout — it renders this screen INSTEAD of <Stack> while
 * signed out), so "reset" is a mode of this screen, entered by catching the
 * `beermacs://reset-password?token=...` link directly with expo-linking
 * rather than through expo-router navigation.
 *
 * Name + email + password is all signup asks for (G-1) — there is no
 * anonymous or guest path. Phone is NOT collected here: App Review rejected
 * build 11 under 5.1.1(v) for requiring it, so it's an optional Profile field
 * now, explained where it's asked for.
 */
/**
 * `onAuthenticated` still exists as a prop rather than reading the store
 * directly, so this component stays testable/reusable without the store —
 * RootLayout is the one place that wires it to useSessionStore.
 */
export default function RegisterScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("register");
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Catch the reset-password link regardless of whether it arrives while
  // the app is already open (addEventListener) or cold-launches it
  // (getInitialURL) — both are real: tapping the email link on a phone that
  // already has Beermacs backgrounded is the common case, but a fresh
  // install/force-quit is not rare either.
  useEffect(() => {
    function handle(url: string | null) {
      if (!url) return;
      const parsed = Linking.parse(url);
      const isReset = parsed.hostname === "reset-password" || parsed.path === "reset-password";
      const token = parsed.queryParams?.token;
      if (isReset && typeof token === "string") {
        setResetToken(token);
        setMode("reset");
      }
    }
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener("url", (e) => handle(e.url));
    return () => sub.remove();
  }, []);

  const switchMode = useCallback((m: Mode) => {
    setError(null);
    setNotice(null);
    setMode(m);
  }, []);

  const submit = useCallback(async () => {
    setError(null);
    setNotice(null);

    if (mode === "signin") {
      const parsed = signInInput.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Check your email and password.");
        return;
      }
      setBusy(true);
      try {
        const res = await authClient.signIn.email(parsed.data);
        if (res.error) {
          setError(res.error.message ?? "Couldn't sign in. Check your email and password.");
          return;
        }
        onAuthenticated();
      } catch (e) {
        setError(networkErrorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "forgot") {
      const parsed = signInInput.shape.email.safeParse(email);
      if (!parsed.success) {
        setError("Enter the email on your account.");
        return;
      }
      setBusy(true);
      try {
        const res = await authClient.requestPasswordReset({
          email: parsed.data,
          redirectTo: RESET_PASSWORD_REDIRECT,
        });
        if (res.error) {
          setError(res.error.message ?? "Couldn't send that email. Try again in a moment.");
          return;
        }
        switchMode("forgot_sent");
      } catch (e) {
        setError(networkErrorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "reset") {
      if (password.length < 10) {
        setError("Password must be at least 10 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords don't match.");
        return;
      }
      if (!resetToken) {
        setError("This reset link is missing its token. Request a new one.");
        return;
      }
      setBusy(true);
      try {
        const res = await authClient.resetPassword({ newPassword: password, token: resetToken });
        if (res.error) {
          setError(res.error.message ?? "That reset link has expired. Request a new one.");
          return;
        }
        setPassword("");
        setConfirmPassword("");
        setResetToken(null);
        // Order matters: switchMode clears `notice` as part of resetting the
        // screen for the new mode, so the message it should carry INTO that
        // mode has to be set after, not before.
        switchMode("signin");
        setNotice("Password updated — sign in with your new password.");
      } catch (e) {
        setError(networkErrorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    // mode === "register"
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    const parsed = registerInput.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form for a mistake.");
      return;
    }
    setBusy(true);
    try {
      // Built as a variable, not passed as an object literal: the mobile
      // client isn't type-linked to the server's `auth` instance (separate
      // app), so TS only knows the base signUp.email shape and would apply
      // excess-property checking to a literal. Better Auth's additional
      // fields (displayName — see apps/web/lib/auth.ts) still reach
      // the server at runtime either way; this only works around the
      // compile-time check.
      const payload = {
        email: parsed.data.email,
        password: parsed.data.password,
        name: parsed.data.displayName,
        displayName: parsed.data.displayName,
      };
      const res = await authClient.signUp.email(payload);
      if (res.error) {
        setError(res.error.message ?? "Couldn't create that account.");
        return;
      }
      onAuthenticated();
    } catch (e) {
      setError(networkErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [
    mode,
    email,
    password,
    confirmPassword,
    displayName,
    resetToken,
    onAuthenticated,
    switchMode,
  ]);

  return (
    <View className="flex-1 bg-stout-900">
      <AmbientBeer />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.select({ ios: "padding", default: undefined })}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }}
          contentContainerClassName="gap-6 px-5"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-2">
            <GlowLogo size={72} />
            <Text className="font-display text-2xl uppercase tracking-[1.2px] text-cream">
              {headline(mode)}
            </Text>
            <Text className="max-w-[320px] text-center font-sans text-[13px] leading-[19px] text-cream-dim">
              {subhead(mode)}
            </Text>
          </View>

          {mode === "forgot_sent" ? null : (
            <View className="gap-3">
              {mode === "register" ? (
                <Field
                  label="Name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  textContentType="name"
                  autoComplete="name"
                />
              ) : null}

              {mode !== "reset" ? (
                <Field
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                  autoComplete="email"
                />
              ) : null}

              {mode !== "forgot" ? (
                <Field
                  label={mode === "reset" ? "New password" : "Password"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  toggleSecure={() => setShowPassword((v) => !v)}
                  secureVisible={showPassword}
                  textContentType={mode === "signin" ? "password" : "newPassword"}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  onSubmitEditing={mode === "register" || mode === "reset" ? undefined : submit}
                />
              ) : null}

              {mode === "register" || mode === "reset" ? (
                <Field
                  label="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
                  onSubmitEditing={submit}
                />
              ) : null}

              {mode === "signin" ? (
                <Pressable
                  onPress={() => switchMode("forgot")}
                  accessibilityRole="button"
                  className="self-end py-1"
                >
                  <Text className="font-sans-med text-[12px] text-beer-400">Forgot password?</Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {error ? (
            <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
          ) : null}
          {notice && mode !== "forgot_sent" ? (
            <Text className="font-sans text-[13px] leading-[19px] text-live">{notice}</Text>
          ) : null}

          {mode === "forgot_sent" ? (
            <Pressable
              onPress={() => switchMode("signin")}
              accessibilityRole="button"
              className="min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70"
            >
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
                Back to sign in
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={submit}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={submitLabel(mode)}
              accessibilityState={{ disabled: busy, busy }}
              className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
                busy ? "opacity-60" : ""
              }`}
            >
              {busy ? (
                <ActivityIndicator size="small" color={raw.canvas} />
              ) : (
                <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
                  {submitLabel(mode)}
                </Text>
              )}
            </Pressable>
          )}

          {mode === "register" ? (
            <Text className="text-center font-sans text-[12px] leading-[18px] text-cream-dim">
              By creating an account you agree to the{" "}
              <Text
                onPress={() => void Linking.openURL(`${API_URL}/terms`)}
                accessibilityRole="link"
                className="text-beer-400 underline"
              >
                Terms of use
              </Text>{" "}
              (zero tolerance for abusive content or users) and the{" "}
              <Text
                onPress={() => void Linking.openURL(`${API_URL}/privacy`)}
                accessibilityRole="link"
                className="text-beer-400 underline"
              >
                Privacy policy
              </Text>
              .
            </Text>
          ) : null}

          {mode === "register" || mode === "signin" ? (
            <Pressable
              onPress={() => switchMode(mode === "register" ? "signin" : "register")}
              accessibilityRole="button"
              className="items-center py-2"
            >
              <Text className="font-sans-med text-[13px] text-beer-400">
                {mode === "register"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </Text>
            </Pressable>
          ) : mode === "forgot" ? (
            <Pressable
              onPress={() => switchMode("signin")}
              accessibilityRole="button"
              className="items-center py-2"
            >
              <Text className="font-sans-med text-[13px] text-beer-400">Back to sign in</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function headline(mode: Mode): string {
  switch (mode) {
    case "register":
      return "Create your account";
    case "signin":
      return "Welcome back";
    case "forgot":
      return "Reset your password";
    case "forgot_sent":
      return "Check your email";
    case "reset":
      return "Set a new password";
  }
}

function subhead(mode: Mode): string {
  switch (mode) {
    case "register":
      return "One account gets you into any tournament at any bar.";
    case "signin":
      return "Sign in to pick up where you left off.";
    case "forgot":
      return "Enter the email on your account and we'll send you a link to reset your password.";
    case "forgot_sent":
      return "If that email has an account, a reset link is on its way. It expires in an hour. Not arriving? Email support@beermacs.com.";
    case "reset":
      return "Choose a new password for your account.";
  }
}

function submitLabel(mode: Mode): string {
  switch (mode) {
    case "register":
      return "Create account";
    case "signin":
      return "Sign in";
    case "forgot":
      return "Send reset link";
    case "forgot_sent":
      return "Back to sign in";
    case "reset":
      return "Update password";
  }
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "words";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  toggleSecure?: () => void;
  secureVisible?: boolean;
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  onSubmitEditing?: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {props.label}
      </Text>
      <View className="flex-row items-center rounded-lg border border-stout-500 bg-stout-900/70">
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          keyboardType={props.keyboardType}
          autoCapitalize={props.autoCapitalize ?? "none"}
          autoCorrect={props.autoCorrect ?? true}
          secureTextEntry={props.secureTextEntry}
          textContentType={props.textContentType}
          autoComplete={props.autoComplete}
          onSubmitEditing={props.onSubmitEditing}
          placeholderTextColor={raw.textFaint}
          accessibilityLabel={props.label}
          className="min-h-[48px] flex-1 px-4 font-sans text-[15px] text-cream"
        />
        {props.toggleSecure ? (
          <Pressable
            onPress={props.toggleSecure}
            accessibilityRole="button"
            accessibilityLabel={props.secureVisible ? "Hide password" : "Show password"}
            className="px-3"
            hitSlop={8}
          >
            <Ionicons
              name={props.secureVisible ? "eye-off-outline" : "eye-outline"}
              size={18}
              color={raw.textFaint}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
