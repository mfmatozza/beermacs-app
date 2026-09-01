import { Blur, Canvas, Circle, Group, RadialGradient, vec } from "@shopify/react-native-skia";
import { Image, View } from "react-native";
import logoMark from "../assets/logo-mark.png";

/**
 * The mark with a real bloom behind it.
 *
 * The glow is Skia — a blurred radial gradient — rather than a React Native
 * shadow, because `shadowColor` on iOS gives one hard-edged drop shadow and
 * nothing on Android. This reads as light coming off the glass, which is the
 * point: the mark is a backlit pint.
 */
export default function GlowLogo({ size = 96 }: { size?: number }) {
  const canvas = size * 1.75;
  const c = canvas / 2;

  return (
    <View style={{ width: canvas, height: canvas }} className="items-center justify-center">
      <Canvas style={{ position: "absolute", width: canvas, height: canvas }}>
        <Group>
          <Circle cx={c} cy={c} r={size * 0.78}>
            <RadialGradient
              c={vec(c, c)}
              r={size * 0.78}
              colors={[
                "rgba(255, 196, 92, 0.55)",
                "rgba(245, 163, 0, 0.28)",
                "rgba(245, 163, 0, 0.00)",
              ]}
              positions={[0, 0.45, 1]}
            />
          </Circle>
          <Blur blur={size * 0.16} />
        </Group>
      </Canvas>
      <Image
        source={logoMark}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        accessibilityLabel="Beermacs"
      />
    </View>
  );
}
