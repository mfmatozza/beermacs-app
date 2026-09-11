import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type CountryCode, countryCodes, flagEmoji } from "../lib/country-codes";
import { raw } from "../lib/theme";

/**
 * The country-code half of the phone field. A full-screen modal rather than
 * a dropdown/picker component — 49 entries doesn't fit a native `<Picker>`
 * usefully, and a searchable list is exactly what the spec asks for
 * ("searchable/typeable").
 */
export default function CountryCodePicker({
  value,
  onChange,
}: {
  value: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countryCodes;
    return countryCodes.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.iso2.toLowerCase() === q
    );
  }, [query]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Country code, currently ${value.name} ${value.dial}`}
        className="min-h-[48px] flex-row items-center gap-1.5 rounded-lg border border-stout-500 bg-stout-900/70 px-3"
      >
        <Text className="text-lg">{flagEmoji(value.iso2)}</Text>
        <Text className="font-sans-med text-[15px] tabular-nums text-cream">{value.dial}</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View
          className="flex-1 bg-stout-900"
          style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center gap-3 px-5 pb-3">
            <Text className="flex-1 font-display text-xl uppercase tracking-[1px] text-cream">
              Country code
            </Text>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="px-2 py-1"
            >
              <Text className="font-sans-med text-[13px] text-beer-400">Close</Text>
            </Pressable>
          </View>
          <View className="px-5 pb-3">
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={raw.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search country"
              className="rounded-lg border border-stout-500 bg-stout-900/70 px-4 py-3 font-sans text-[15px] text-cream"
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(c) => c.iso2}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item);
                  setQuery("");
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${item.name} ${item.dial}`}
                className={`flex-row items-center gap-3 px-5 py-3 active:opacity-70 ${
                  item.iso2 === value.iso2 ? "bg-beer-500/10" : ""
                }`}
              >
                <Text className="text-xl">{flagEmoji(item.iso2)}</Text>
                <Text className="flex-1 font-sans-med text-[15px] text-cream">{item.name}</Text>
                <Text className="font-sans text-[13px] tabular-nums text-cream-dim">
                  {item.dial}
                </Text>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View className="h-px bg-stout-700" />}
            ListEmptyComponent={
              <Text className="px-5 py-6 text-center font-sans text-[13px] text-cream-dim">
                No matching country.
              </Text>
            }
          />
        </View>
      </Modal>
    </>
  );
}
