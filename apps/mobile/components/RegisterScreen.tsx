import { registerInput, signInInput } from "@beermacs/shared";
import { useCallback, useState } from "react";
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
import { raw } from "../lib/theme";
import AmbientBeer from "./AmbientBeer";
import GlowLogo from "./GlowLogo";

/**
 * One form for everyone (docs/DECISIONS.md D10) — a player creating their first
 * team and a bar owner setting up their venue go through the exact same screen,
 * just with a "create account" / "sign in" toggle.
 *
 * Email + password + phone is mandatory (G-1) — there is no anonymous or guest
 * path any more. Phone is validated loosely: it's stored so a venue can
 * re-contact players later (G-2/A-21), not checked against a delivery
 * mechanism, because there is no OTP anywhere in this app to fail if the
 * format is slightly wrong.
 */
/**
 * `onAuthenticated` still exists as a prop rather than reading the store
 * directly, so this component stays testable/reusable without the store —
 * RootLayout is the one place that wires it to useSessionStore.
 */
export default function RegisterScreen({ onAuthenticated }: { onAuthenticated: () => void }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"register" | "signin">("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async () => {
    setError(null);

    if (mode === "signin") {
      const parsed = signInInput.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Check your email and password.");
        return;
      }
      setBusy(true);
      const res = await authClient.signIn.email(parsed.data);
      setBusy(false);
      if (res.error) {
        setError(res.error.message ?? "Couldn't sign in. Check your email and password.");
        return;
      }
      onAuthenticated();
      return;
    }

    const parsed = registerInput.safeParse({ email, password, displayName, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form for a mistake.");
      return;
    }
    setBusy(true);
    // Built as a variable, not passed as an object literal: the mobile client
    // isn't type-linked to the server's `auth` instance (separate app), so TS
    // only knows the base signUp.email shape and would apply excess-property
    // checking to a literal. Better Auth's additional fields (displayName,
    // phone — see apps/web/lib/auth.ts) still reach the server at runtime
    // either way; this only works around the compile-time check.
    const payload = {
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.displayName,
      displayName: parsed.data.displayName,
      phone: parsed.data.phone,
    };
    const res = await authClient.signUp.email(payload);
    setBusy(false);
    if (res.error) {
      setError(res.error.message ?? "Couldn't create that account.");
      return;
    }
    onAuthenticated();
  }, [mode, email, password, displayName, phone, onAuthenticated]);

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
              {mode === "register" ? "Create your account" : "Welcome back"}
            </Text>
            <Text className="max-w-[320px] text-center font-sans text-[13px] leading-[19px] text-cream-dim">
              {mode === "register"
                ? "One account gets you into any tournament, and lets the bar reach you about the next one."
                : "Sign in to pick up where you left off."}
            </Text>
          </View>

          <View className="gap-3">
            {mode === "register" ? (
              <Field
                label="Name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                textContentType="name"
              />
            ) : null}
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            {mode === "register" ? (
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
              />
            ) : null}
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType={mode === "register" ? "newPassword" : "password"}
              onSubmitEditing={submit}
            />
          </View>

          {error ? (
            <Text className="font-sans text-[13px] leading-[19px] text-dispute">{error}</Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={mode === "register" ? "Create account" : "Sign in"}
            accessibilityState={{ disabled: busy, busy }}
            className={`min-h-[48px] items-center justify-center rounded-lg bg-beer-500 px-6 active:opacity-70 ${
              busy ? "opacity-60" : ""
            }`}
          >
            {busy ? (
              <ActivityIndicator size="small" color={raw.canvas} />
            ) : (
              <Text className="font-display text-xl uppercase tracking-[0.8px] text-stout-900">
                {mode === "register" ? "Create account" : "Sign in"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setMode((m) => (m === "register" ? "signin" : "register"));
            }}
            accessibilityRole="button"
            className="items-center py-2"
          >
            <Text className="font-sans-med text-[13px] text-beer-400">
              {mode === "register"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "words";
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  textContentType?: React.ComponentProps<typeof TextInput>["textContentType"];
  onSubmitEditing?: () => void;
}) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {props.label}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize ?? "none"}
        autoCorrect={props.autoCorrect ?? true}
        secureTextEntry={props.secureTextEntry}
        textContentType={props.textContentType}
        onSubmitEditing={props.onSubmitEditing}
        placeholderTextColor={raw.textFaint}
        accessibilityLabel={props.label}
        className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 font-sans text-[15px] text-cream"
      />
    </View>
  );
}
