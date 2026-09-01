import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { raw } from "../lib/theme";

/**
 * Placeholder for a tab whose screen is not built yet.
 *
 * Says what will be here and which milestone it belongs to, rather than
 * "Coming soon" — a stub that explains itself is a to-do list you can navigate.
 */
export default function ComingSoon({
  icon,
  title,
  detail,
  milestone,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  detail: string;
  milestone: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-stout-900 px-8">
      <Ionicons name={icon} size={34} color={raw.tabInactive} />
      <Text className="text-center font-display text-2xl uppercase tracking-[0.9px] text-cream">
        {title}
      </Text>
      <Text className="max-w-[320px] text-center font-sans text-[13px] leading-[19px] text-cream-dim">
        {detail}
      </Text>
      <Text className="font-sans-med text-[11px] uppercase tracking-[1.1px] text-cream-faint">
        {milestone}
      </Text>
    </View>
  );
}
