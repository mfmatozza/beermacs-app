import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { raw } from "../lib/theme";

/**
 * The one card that matters. Everything else on the bracket screen is
 * context; this answers "am I playing, and what do I need to do right now".
 *
 * A discriminated union rather than a raw `Match` + a pile of booleans: the
 * six match states split into meaningfully different things to show a
 * captain (waiting to be paired isn't even a match yet), and the caller
 * already has to do that classification to know which mutation to wire up —
 * this component only renders what it's told, per the rest of this screen's
 * pattern of pure display components fed pre-computed props.
 */
export type NextUpState =
  | { readonly kind: "waiting_to_be_paired" }
  | { readonly kind: "waiting_for_table"; readonly opponent: string }
  | {
      readonly kind: "on_table";
      readonly opponent: string;
      readonly tableLabel: string;
      readonly onReport: (winnerIsMe: boolean) => void;
      readonly reporting: boolean;
    }
  | { readonly kind: "reported_mine"; readonly opponent: string }
  | {
      readonly kind: "reported_theirs";
      readonly opponent: string;
      readonly theyClaimedThemselves: boolean;
      readonly onConfirm: () => void;
      readonly onDispute: () => void;
      readonly busy: boolean;
    }
  | { readonly kind: "disputed"; readonly opponent: string };

export default function NextUpCard({
  state,
  roundIndex,
}: {
  state: NextUpState;
  roundIndex: number;
}) {
  const { pillLabel, pillTone } = pillFor(state);

  return (
    <View className={`gap-3 rounded-2xl border p-4 ${cardTone(state)}`}>
      <View className="flex-row items-center gap-2">
        <View
          className={`flex-row items-center gap-1.5 self-start rounded-full border px-2.5 py-1 ${pillTone.border} ${pillTone.wash}`}
        >
          {state.kind === "on_table" ? <View className="h-1.5 w-1.5 rounded-full bg-live" /> : null}
          <Text className={`font-sans-med text-[11px] uppercase tracking-[1.1px] ${pillTone.text}`}>
            {pillLabel}
          </Text>
        </View>
        <View className="flex-1" />
        {state.kind !== "waiting_to_be_paired" ? (
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-dim">
            {`Round ${roundIndex}`}
          </Text>
        ) : null}
      </View>

      <Body state={state} />
    </View>
  );
}

function Body({ state }: { state: NextUpState }) {
  switch (state.kind) {
    case "waiting_to_be_paired":
      return (
        <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
          You&rsquo;re in — we&rsquo;ll pair you with an opponent the moment one is free.
        </Text>
      );

    case "waiting_for_table":
      return (
        <View className="gap-0.5">
          <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-dim">
            Waiting for a table — vs
          </Text>
          <Text
            className="font-display text-4xl leading-10 tracking-[1.2px] text-cream"
            numberOfLines={1}
          >
            {state.opponent.toUpperCase()}
          </Text>
        </View>
      );

    case "on_table":
      return (
        <>
          <View className="flex-row items-end gap-4">
            <View>
              <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-beer-400">
                Head to
              </Text>
              <Text className="font-display text-5xl leading-[48px] tracking-[1.2px] text-cream">
                {state.tableLabel.toUpperCase()}
              </Text>
            </View>
            {/* flex-1, not shrink: `shrink` alone lets the Text report its full
                intrinsic width and run off the card — a long team name needs a
                bounded box before numberOfLines can truncate it. */}
            <View className="flex-1 pb-2">
              <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-dim">
                vs
              </Text>
              <Text
                className="font-display text-2xl leading-7 tracking-[0.9px] text-cream"
                numberOfLines={1}
              >
                {state.opponent.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">Who won?</Text>
          <View className="flex-row gap-3">
            <ActionButton
              label="We won"
              onPress={() => state.onReport(true)}
              busy={state.reporting}
              tone="fill"
            />
            <ActionButton
              label="They won"
              onPress={() => state.onReport(false)}
              busy={state.reporting}
              tone="outline"
            />
          </View>
        </>
      );

    case "reported_mine":
      return (
        <View className="gap-0.5">
          <Text
            className="font-display text-2xl leading-7 tracking-[0.9px] text-cream"
            numberOfLines={1}
          >
            {state.opponent.toUpperCase()}
          </Text>
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            Reported. Waiting for the other team to confirm.
          </Text>
        </View>
      );

    case "reported_theirs":
      return (
        <>
          <Text className="font-sans text-[13px] leading-[19px] text-cream">
            {state.theyClaimedThemselves
              ? `${state.opponent} says they won.`
              : `${state.opponent} says you won.`}
          </Text>
          <View className="flex-row gap-3">
            <ActionButton label="Confirm" onPress={state.onConfirm} busy={state.busy} tone="fill" />
            <ActionButton
              label="Dispute"
              onPress={state.onDispute}
              busy={state.busy}
              tone="outline-dispute"
            />
          </View>
        </>
      );

    case "disputed":
      return (
        <View className="gap-0.5">
          <Text
            className="font-display text-2xl leading-7 tracking-[0.9px] text-cream"
            numberOfLines={1}
          >
            {state.opponent.toUpperCase()}
          </Text>
          <Text className="font-sans text-[13px] leading-[19px] text-cream-dim">
            The two reports don&rsquo;t match — a staff member will settle this one.
          </Text>
        </View>
      );
  }
}

function ActionButton({
  label,
  onPress,
  busy,
  tone,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
  tone: "fill" | "outline" | "outline-dispute";
}) {
  const toneClass =
    tone === "fill"
      ? "bg-beer-500"
      : tone === "outline-dispute"
        ? "border border-dispute bg-transparent"
        : "border border-stout-500 bg-transparent";
  const textClass =
    tone === "fill" ? "text-stout-900" : tone === "outline-dispute" ? "text-dispute" : "text-cream";

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: busy, busy }}
      className={`min-h-[48px] flex-1 items-center justify-center rounded-lg px-4 active:opacity-70 ${toneClass} ${busy ? "opacity-40" : ""}`}
    >
      {busy ? (
        <ActivityIndicator size="small" color={tone === "fill" ? raw.canvas : raw.textFaint} />
      ) : (
        <Text className={`font-display text-lg uppercase tracking-[0.6px] ${textClass}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function cardTone(state: NextUpState): string {
  if (state.kind === "disputed") return "border-dispute/40 bg-dispute/10";
  if (state.kind === "on_table") return "border-beer-500/40 bg-beer-500/10";
  return "border-stout-600 bg-stout-700";
}

function pillFor(state: NextUpState): {
  pillLabel: string;
  pillTone: { border: string; wash: string; text: string };
} {
  switch (state.kind) {
    case "on_table":
      return {
        pillLabel: "You're up",
        pillTone: { border: "border-live", wash: "bg-live-wash", text: "text-live" },
      };
    case "reported_theirs":
      return {
        pillLabel: "Needs your answer",
        pillTone: { border: "border-notice", wash: "bg-notice-wash", text: "text-notice" },
      };
    case "disputed":
      return {
        pillLabel: "Disputed",
        pillTone: { border: "border-dispute", wash: "bg-dispute/20", text: "text-dispute" },
      };
    case "waiting_to_be_paired":
      return {
        pillLabel: "In the round",
        pillTone: { border: "border-notice", wash: "bg-notice-wash", text: "text-notice" },
      };
    case "reported_mine":
      return {
        pillLabel: "Reported",
        pillTone: { border: "border-notice", wash: "bg-notice-wash", text: "text-notice" },
      };
    case "waiting_for_table":
      return {
        pillLabel: "Up next",
        pillTone: { border: "border-notice", wash: "bg-notice-wash", text: "text-notice" },
      };
  }
}
