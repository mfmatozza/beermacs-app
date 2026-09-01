import { usePathname } from "expo-router";
import type { ComponentProps } from "react";
import { Image, Pressable, View } from "react-native";
import logoMark from "../assets/logo-mark.png";

type PressableOnPress = ComponentProps<typeof Pressable>["onPress"];

/**
 * The centre tab: the Beermacs mark in a gold ring.
 *
 * Bigger than its neighbours and ringed, because it is the thumb's home
 * position — Home is where you land after every other tab, and it is the one
 * target someone hits one-handed while holding a drink.
 *
 * It sits fully inside the bar rather than overhanging it. Overhanging reads
 * better in a mockup and is not tappable on iOS, which does not deliver touches
 * to a subview outside its superview's bounds.
 */
export default function CenterTabButton({ onPress }: { onPress?: PressableOnPress }) {
  // Focus comes from the router, not from the button's props: React Navigation 7
  // does not pass `accessibilityState.selected` into a custom `tabBarButton`, so
  // reading it there left the ring permanently unfocused.
  const focused = usePathname() === "/";

  return (
    <View className="flex-1 items-center justify-center" pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        hitSlop={14}
        accessibilityRole="button"
        accessibilityLabel="Home"
        accessibilityState={{ selected: focused }}
        className={`h-[54px] w-[54px] items-center justify-center rounded-full border-2 bg-stout-900 active:opacity-80 ${
          focused ? "border-beer-500" : "border-stout-500"
        }`}
      >
        <Image
          source={logoMark}
          className="h-10 w-10"
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </View>
  );
}
