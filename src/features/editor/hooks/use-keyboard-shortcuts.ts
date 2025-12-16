import { useEffect, useRef } from "react";
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
 */
const useKeyboardShortcuts = () => {
  const activeIds = useStore(selectActiveIds);
  const copiedIdsRef = useRef<string[]>([]);

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
        event.preventDefault();
        dispatch(HISTORY_UNDO);
        return;
      }

      // Redo: Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z
      if (
        (ctrlKey && event.key.toLowerCase() === "y") ||
        (ctrlKey && event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        dispatch(HISTORY_REDO);
        return;
      }

      // Delete: Delete or Backspace key
      if (event.key === "Delete" || event.key === "Backspace") {
        if (activeIds.length > 0) {
          event.preventDefault();
          dispatch(LAYER_DELETE);
        }
        return;
      }

      // Duplicate/Clone: Ctrl/Cmd + D
      if (ctrlKey && event.key.toLowerCase() === "d") {
        if (activeIds.length > 0) {
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
        if (copiedIdsRef.current.length > 0) {
          event.preventDefault();
          // Clone the previously copied items
          dispatch(LAYER_CLONE);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIds]);
};

export default useKeyboardShortcuts;
