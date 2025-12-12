import { PlayerRef } from "@remotion/player";
import { RefObject, useEffect, useRef } from "react";
import useStore from "../store/use-store";
import { dispatch } from "@designcombo/events";
import { ENTER_EDIT_MODE } from "@designcombo/state";
import { getTargetById, getTypeFromClassName } from "../utils/target";

export default function useUpdateAnsestors({
  playing,
  playerRef
}: {
  playing: boolean;
  playerRef: RefObject<PlayerRef> | null;
}) {
  const { trackItemIds, activeIds } = useStore();
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  useEffect(() => {
    if (!playing) {
      updateAnsestorsPointerEvents();
    }
  }, [playing, trackItemIds, activeIds]);

  useEffect(() => {
    if (playerRef && playerRef.current) {
      playerRef.current.addEventListener(
        "seeked",
        updateAnsestorsPointerEvents
      );
    }
    return () => {
      if (playerRef && playerRef.current) {
        playerRef.current.removeEventListener(
          "seeked",
          updateAnsestorsPointerEvents
        );
      }
    };
  }, [playerRef]);

  useEffect(() => {
    if (activeIds.length !== 1) {
      dispatch(ENTER_EDIT_MODE, {
        payload: {
          id: null
        }
      });
      lastClickRef.current = null;
      return;
    }
    const element = getTargetById(activeIds[0]);
    if (!element) return;
    const type = getTypeFromClassName(element.className);
    if (type !== "text") return;

    const handleDoubleClick = (e: MouseEvent) => {
      dispatch(ENTER_EDIT_MODE, {
        payload: {
          id: activeIds[0]
        }
      });
      e.stopPropagation();
    };

    // Also handle single click to enter edit mode if already selected
    // This helps when double-click timing is missed
    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      const lastClick = lastClickRef.current;

      // If clicked same element within 500ms, treat as double-click
      if (lastClick && lastClick.id === activeIds[0] && now - lastClick.time < 500) {
        dispatch(ENTER_EDIT_MODE, {
          payload: {
            id: activeIds[0]
          }
        });
        e.stopPropagation();
        lastClickRef.current = null;
      } else {
        lastClickRef.current = { id: activeIds[0], time: now };
      }
    };

    element.addEventListener("dblclick", handleDoubleClick);
    element.addEventListener("click", handleClick);
    return () => {
      element.removeEventListener("dblclick", handleDoubleClick);
      element.removeEventListener("click", handleClick);
    };
  }, [activeIds]);

  const updateAnsestorsPointerEvents = () => {
    const elements = document.querySelectorAll(
      '[data-track-item="transition-element"]'
    );

    elements.forEach((element) => {
      let currentElement = element;
      // Traverse up the DOM tree and collect the ancestors
      while (currentElement.parentElement?.className !== "__remotion-player") {
        const parentElement = currentElement.parentElement;
        if (parentElement) {
          currentElement = parentElement;
          parentElement.style.pointerEvents = "none";
          // if (parentElement.parentElement?.className !== "__remotion-player") {
          //   console.log("parentElement", parentElement);
          // }
        }
      }
    });
  };
}
