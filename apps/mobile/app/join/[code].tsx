import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useCurrentTeam } from "../../lib/use-current-team";
import { useJoinTournament } from "../../lib/use-join-tournament";
import { raw } from "../../lib/theme";

/**
 * `beermacs://join/<code>` — the QR/link half of U-3's "numeric code, QR
 * scan, or link" trio (QR itself needs expo-camera and the native rebuild
 * that comes with it, deferred — see docs/DECISIONS.md; a link needs neither,
 * since expo-router already wires this file to the scheme with no extra
 * native code). Runs the exact same join call Home's code box does, then
 * hands off to Home, which reads the pending-tournament pointer this sets
 * and takes it from there (team creation/join).
 */
export default function JoinByLink() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { me, isLoading: meLoading } = useCurrentTeam();
  const { join, joining, error } = useJoinTournament(me?.user.displayName);
  const attempted = useRef(false);

  useEffect(() => {
    if (meLoading || attempted.current || typeof code !== "string") return;
    attempted.current = true;
    void join(code).then((ok) => {
      if (ok) router.replace("/");
    });
  }, [meLoading, code, join]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-stout-900 px-8">
      {meLoading || joining ? (
        <>
          <ActivityIndicator color={raw.beer} />
          <Text className="font-sans text-[13px] text-cream-dim">Joining your tournament…</Text>
        </>
      ) : error ? (
        <>
          <Text className="text-center font-sans text-[15px] leading-[21px] text-dispute">
            {error}
          </Text>
          <Text
            role="button"
            onPress={() => router.replace("/")}
            className="font-sans-med text-[13px] uppercase tracking-[0.8px] text-beer-400"
          >
            Back to Home
          </Text>
        </>
      ) : null}
    </View>
  );
}
