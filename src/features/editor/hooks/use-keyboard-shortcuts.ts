import { useEffect, useRef, useCallback } from "react";
import { dispatch } from "@designcombo/events";
import {
  HISTORY_UNDO,
  HISTORY_REDO,
  LAYER_DELETE,
  LAYER_CLONE
} from "@designcombo/state";
import useStore from "../store/use-store";

// Use individual selectors to prevent unnecessary re-renders
const selectActiveIds = (state: ReturnType<typeof useStore.getState>) => state.activeIds;
const selectTrackItemsMap = (state: ReturnType<typeof useStore.getState>) => state.trackItemsMap;
const selectPlayerRef = (state: ReturnType<typeof useStore.getState>) => state.playerRef;
const selectFps = (state: ReturnType<typeof useStore.getState>) => state.fps;
const selectTimeline = (state: ReturnType<typeof useStore.getState>) => state.timeline;

/**
 * Hook to handle keyboard shortcuts for the editor
 *
 * Supported shortcuts:
 * - Ctrl/Cmd + Z: Undo
 * - Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
 * - Delete/Backspace: Delete selected items
 * - Ctrl/Cmd + D: Duplicate/Clone selected items
 * - Ctrl/Cmd + C: Copy selected items (stores for paste)
 * - Ctrl/Cmd + V: Paste copied items (clones them)
 * - [ (Left Bracket): Move playhead to start of selection
 * - ] (Right Bracket): Move playhead to end of selection
 */
const useKeyboardShortcuts = () => {
  const activeIds = useStore(selectActiveIds);
  const trackItemsMap = useStore(selectTrackItemsMap);
  const playerRef = useStore(selectPlayerRef);
  const fps = useStore(selectFps);
  const timeline = useStore(selectTimeline);
  const copiedIdsRef = useRef<string[]>([]);

  // Get the start time (minimum from) of selected items
  const getSelectionStartTime = useCallback(() => {
    if (activeIds.length === 0) return null;

    const startTimes = activeIds
      .map(id => trackItemsMap[id]?.display?.from)
      .filter((time): time is number => typeof time === "number");

    if (startTimes.length === 0) return null;
    return Math.min(...startTimes);
  }, [activeIds, trackItemsMap]);

  // Get the end time (maximum to) of selected items
  const getSelectionEndTime = useCallback(() => {
    if (activeIds.length === 0) return null;

    const endTimes = activeIds
      .map(id => trackItemsMap[id]?.display?.to)
      .filter((time): time is number => typeof time === "number");

    if (endTimes.length === 0) return null;
    return Math.max(...endTimes);
  }, [activeIds, trackItemsMap]);

  // Seek playhead to a specific time in milliseconds
  const seekToTime = useCallback((timeMs: number) => {
    if (playerRef?.current) {
      const frameNumber = Math.round((timeMs / 1000) * fps);
      playerRef.current.seekTo(frameNumber);
    }
  }, [playerRef, fps]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputField) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

      // Undo: Ctrl/Cmd + Z (without Shift)
      if (ctrlKey && event.key.toLowerCase() === "z" && !event.shiftKey) {
        if (!timeline) return; // Guard: ensure timeline is initialized
        event.preventDefault();
        dispatch(HISTORY_UNDO);
        return;
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (
        (ctrlKey && event.key.toLowerCase() === "y") ||
        (ctrlKey && event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        if (!timeline) return; // Guard: ensure timeline is initialized
        event.preventDefault();
        dispatch(HISTORY_REDO);
        return;
      }

      // Delete: Delete or Backspace key
      if (event.key === "Delete" || event.key === "Backspace") {
        if (activeIds.length > 0 && timeline) {
          event.preventDefault();
          dispatch(LAYER_DELETE);
        }
        return;
      }

      // Duplicate/Clone: Ctrl/Cmd + D
      if (ctrlKey && event.key.toLowerCase() === "d") {
        if (activeIds.length > 0 && timeline) {
          event.preventDefault();
          dispatch(LAYER_CLONE);
        }
        return;
      }

      // Copy: Ctrl/Cmd + C
      if (ctrlKey && event.key.toLowerCase() === "c") {
        if (activeIds.length > 0) {
          event.preventDefault();
          copiedIdsRef.current = [...activeIds];
        }
        return;
      }

      // Paste: Ctrl/Cmd + V
      if (ctrlKey && event.key.toLowerCase() === "v") {
        if (copiedIdsRef.current.length > 0 && timeline) {
          event.preventDefault();
          // Clone the previously copied items
          dispatch(LAYER_CLONE);
        }
        return;
      }

      // Go to Selection Start: [ (Left Bracket)
      if (event.key === "[") {
        const startTime = getSelectionStartTime();
        if (startTime !== null) {
          event.preventDefault();
          seekToTime(startTime);
        }
        return;
      }

      // Go to Selection End: ] (Right Bracket)
      if (event.key === "]") {
        const endTime = getSelectionEndTime();
        if (endTime !== null) {
          event.preventDefault();
          seekToTime(endTime);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIds, timeline, getSelectionStartTime, getSelectionEndTime, seekToTime]);
};

export default useKeyboardShortcuts;
