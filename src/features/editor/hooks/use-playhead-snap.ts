import { useEffect, useRef } from "react";
import useStore from "../store/use-store";

// Use individual selectors to prevent unnecessary re-renders
const selectActiveIds = (state: ReturnType<typeof useStore.getState>) => state.activeIds;
const selectTrackItemsMap = (state: ReturnType<typeof useStore.getState>) => state.trackItemsMap;
const selectPlayerRef = (state: ReturnType<typeof useStore.getState>) => state.playerRef;
const selectFps = (state: ReturnType<typeof useStore.getState>) => state.fps;

/**
 * Hook that automatically snaps the playhead to the start of selected items
 * when the selection changes (auto-snap on select behavior)
 */
const usePlayheadSnap = () => {
  const activeIds = useStore(selectActiveIds);
  const trackItemsMap = useStore(selectTrackItemsMap);
  const playerRef = useStore(selectPlayerRef);
  const fps = useStore(selectFps);

  // Track previous activeIds to detect actual selection changes
  const prevActiveIdsRef = useRef<string[]>([]);

  useEffect(() => {
    // Check if this is an actual selection change (not just a re-render)
    const prevIds = prevActiveIdsRef.current;
    const currentIds = activeIds;

    // Update ref for next comparison
    prevActiveIdsRef.current = currentIds;

    // Skip if no items selected or if selection hasn't changed
    if (currentIds.length === 0) return;

    // Check if selection actually changed
    const selectionChanged =
      prevIds.length !== currentIds.length ||
      !currentIds.every((id, i) => prevIds[i] === id);

    if (!selectionChanged) return;

    // Skip if no player available
    if (!playerRef?.current) return;

    // Get the start times of all selected items
    const startTimes = currentIds
      .map(id => trackItemsMap[id]?.display?.from)
      .filter((time): time is number => typeof time === "number");

    if (startTimes.length === 0) return;

    // Snap to the earliest start time
    const earliestStart = Math.min(...startTimes);
    const frameNumber = Math.round((earliestStart / 1000) * fps);
    playerRef.current.seekTo(frameNumber);
  }, [activeIds, trackItemsMap, playerRef, fps]);
};

export default usePlayheadSnap;
