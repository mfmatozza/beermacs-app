import { router, usePathname } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import logoMark from "../assets/logo-mark.png";
import { TAB_BAR_HEIGHT } from "../lib/theme";

const SIZE = 66;
/** How far the button's top edge sits above the tab bar's top edge. */
const OVERHANG = 22;

/**
 * The centre tab: the Beermacs mark in a gold ring, sitting proud of the bar.
 *
 * Rendered as an overlay SIBLING of <Tabs>, not as a `tabBarButton` inside it.
 * That is the whole trick. A button placed in a tab slot and pushed upward with
 * a negative offset is drawn outside the bar but cannot be tapped there — iOS
 * does not deliver touches to a subview outside its superview's bounds, and
 * `overflow: "visible"` affects drawing only, not hit-testing. As an overlay its
 * parent is the full screen, so the whole circle is live.
 *
 * It navigates itself rather than taking an onPress, because its destination is
 * not a variable: it is the Home tab.
 */
export default function CenterTabButton() {
  const insets = useSafeAreaInsets();
  const focused = usePathname() === "/";

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center"
      style={{ bottom: insets.bottom + TAB_BAR_HEIGHT - SIZE + OVERHANG }}
    >
      <Pressable
        onPress={() => router.navigate("/")}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Home"
        accessibilityState={{ selected: focused }}
        className={`items-center justify-center rounded-full border-2 bg-stout-900 active:opacity-80 ${
          focused ? "border-beer-500" : "border-stout-500"
        }`}
        style={{ width: SIZE, height: SIZE }}
      >
        <Image
          source={logoMark}
          className="h-11 w-11"
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </Pressable>
    </View>
  );
}
