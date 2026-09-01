import ComingSoon from "../../components/ComingSoon";

export default function HistoryTab() {
  return (
    <ComingSoon
      icon="time-outline"
      title="History"
      detail="Every tournament you've played, where you finished, and your record. Needs tournaments to be archived rather than deleted — the original app wiped its tables to reset, which is why there are no past results to show yet."
      milestone="Milestone 11"
    />
  );
}
