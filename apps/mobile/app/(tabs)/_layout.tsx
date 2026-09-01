import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CenterTabButton from "../../components/CenterTabButton";
import { raw, TAB_BAR_HEIGHT } from "../../lib/theme";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

// react-navigation types the icon colour as ColorValue; Ionicons wants a
// string. The cast is at this single boundary rather than at four call sites.
function tabIcon(name: IoniconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={name} color={color as string} size={size} />
  );
}

/**
 * Five tabs, Home raised in the centre.
 *
 * Order is deliberate and matches the brief: the two tabs you reach for
 * *during* a match sit left of Home (where is my match, who am I talking to),
 * and the two you reach for between nights sit right (what happened, who am I).
 * Home is the thumb's resting position.
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: raw.tabActive,
          tabBarInactiveTintColor: raw.tabInactive,
          tabBarStyle: {
            backgroundColor: raw.surface,
            borderTopColor: raw.hairline,
            borderTopWidth: 1,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            // The centre button overhangs the bar; without this it is clipped.
            overflow: "visible",
          },
          tabBarLabelStyle: {
            fontFamily: "DMSans_500Medium",
            fontSize: 10,
            letterSpacing: 0.4,
          },
          sceneStyle: { backgroundColor: raw.canvas },
        }}
      >
        <Tabs.Screen
          name="bracket"
          options={{ title: "Bracket", tabBarIcon: tabIcon("git-network-outline") }}
        />
        <Tabs.Screen
          name="chat"
          options={{ title: "Chat", tabBarIcon: tabIcon("chatbubbles-outline") }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "",
            // The slot stays empty; the real button is an overlay drawn above
            // the bar so it can overhang it and still be tappable.
            tabBarButton: () => <View className="flex-1" />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: "History", tabBarIcon: tabIcon("time-outline") }}
        />
        <Tabs.Screen
          name="profile"
          options={{ title: "Profile", tabBarIcon: tabIcon("person-outline") }}
        />
      </Tabs>
      {/* Outside <Tabs> on purpose — see CenterTabButton. */}
      <CenterTabButton />
    </View>
  );
}
