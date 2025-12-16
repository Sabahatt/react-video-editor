import { SequenceItem } from "./sequence-item";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { dispatch, filter, subject } from "@designcombo/events";
import { EDIT_OBJECT, ENTER_EDIT_MODE } from "@designcombo/state";
import { groupTrackItems } from "../utils/track-items";
import { TransitionSeries, Transitions } from "@designcombo/transitions";
import { calculateTextHeight } from "../utils/text";
import { useCurrentFrame } from "remotion";
import useStore from "../store/use-store";

// Use individual selectors to prevent unnecessary re-renders
const selectTrackItemIds = (state: ReturnType<typeof useStore.getState>) => state.trackItemIds;
const selectTrackItemsMap = (state: ReturnType<typeof useStore.getState>) => state.trackItemsMap;
const selectFps = (state: ReturnType<typeof useStore.getState>) => state.fps;
const selectSceneMoveableRef = (state: ReturnType<typeof useStore.getState>) => state.sceneMoveableRef;
const selectSize = (state: ReturnType<typeof useStore.getState>) => state.size;
const selectTransitionsMap = (state: ReturnType<typeof useStore.getState>) => state.transitionsMap;

// Reusable measurement element (created once, reused for all measurements)
let measurementDiv: HTMLDivElement | null = null;
const getMeasurementDiv = () => {
  if (!measurementDiv) {
    measurementDiv = document.createElement("div");
    measurementDiv.style.visibility = "hidden";
    measurementDiv.style.position = "absolute";
    measurementDiv.style.top = "-1000px";
    measurementDiv.style.whiteSpace = "nowrap";
    document.body.appendChild(measurementDiv);
  }
  return measurementDiv;
};

const Composition = () => {
  const [editableTextId, setEditableTextId] = useState<string | null>(null);

  // Use individual selectors to minimize re-renders
  const trackItemIds = useStore(selectTrackItemIds);
  const trackItemsMap = useStore(selectTrackItemsMap);
  const fps = useStore(selectFps);
  const sceneMoveableRef = useStore(selectSceneMoveableRef);
  const size = useStore(selectSize);
  const transitionsMap = useStore(selectTransitionsMap);

  const frame = useCurrentFrame();

  // Debounce timer ref for text change updates
  const textChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Memoize groupedItems to avoid recalculation on every render
  const groupedItems = useMemo(() => groupTrackItems({
    trackItemIds,
    transitionsMap,
    trackItemsMap: trackItemsMap
  }), [trackItemIds, transitionsMap, trackItemsMap]);

  // Debounced moveable update to prevent excessive layout recalculations
  const debouncedMoveableUpdate = useCallback(() => {
    if (textChangeTimerRef.current) {
      clearTimeout(textChangeTimerRef.current);
    }
    textChangeTimerRef.current = setTimeout(() => {
      sceneMoveableRef?.current?.moveable.updateRect();
      sceneMoveableRef?.current?.moveable.forceUpdate();
    }, 50); // 50ms debounce
  }, [sceneMoveableRef]);

  const handleTextChange = useCallback((id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    if (!elRef) return;

    // Find the text layer element by data attribute for more reliable selection
    const textDiv = elRef.querySelector(
      `[data-text-id="${id}"]`
    ) as HTMLDivElement;
    if (!textDiv) return;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
      textTransform
    } = textDiv.style;
    if (!elRef.innerText) return;

    // Check if any word is wider than current container
    const words = elRef.innerText.split(/\s+/);
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      ""
    );

    // Reuse measurement element instead of creating/destroying on every keystroke
    const tempDiv = getMeasurementDiv();
    tempDiv.style.fontSize = fontSize;
    tempDiv.style.fontFamily = fontFamily;
    tempDiv.style.fontWeight = fontWeight;
    tempDiv.style.letterSpacing = letterSpacing;
    tempDiv.textContent = longestWord;
    const wordWidth = tempDiv.offsetWidth;

    // Expand width if word is wider than current container
    const currentWidth = elRef.clientWidth;
    if (wordWidth > currentWidth) {
      elRef.style.width = `${wordWidth}px`;
    }

    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText || "",
      textShadow: textShadow,
      webkitTextStroke,
      width: elRef.style.width || `${currentWidth}px`,
      id: id,
      textTransform
    });

    // Always update height to match content
    if (newHeight > 0) {
      elRef.style.height = `${newHeight}px`;
    }

    // Debounced update to prevent layout thrashing
    debouncedMoveableUpdate();
  }, [debouncedMoveableUpdate]);

  const onTextBlur = (id: string, _: string) => {
    const elRef = document.querySelector(`.id-${id}`) as HTMLDivElement;
    if (!elRef) return;

    // Find the text layer element by data attribute for more reliable selection
    const textDiv = elRef.querySelector(
      `[data-text-id="${id}"]`
    ) as HTMLDivElement;
    if (!textDiv) return;

    const {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textShadow,
      webkitTextStroke,
      textTransform
    } = textDiv.style;
    const width = elRef.style.width || `${elRef.clientWidth}px`;
    if (!elRef.innerText) return;

    const newHeight = calculateTextHeight({
      family: fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      text: elRef.innerText || "",
      textShadow: textShadow,
      webkitTextStroke,
      width,
      id: id,
      textTransform
    });

    // Update both width and height on blur to ensure state is synced
    dispatch(EDIT_OBJECT, {
      payload: {
        [id]: {
          details: {
            height: newHeight,
            width: elRef.clientWidth
          }
        }
      }
    });
  };

  //   handle track and track item events - updates
  useEffect(() => {
    const stateEvents = subject.pipe(
      filter(({ key }) => key.startsWith(ENTER_EDIT_MODE))
    );

    const subscription = stateEvents.subscribe((obj) => {
      if (obj.key === ENTER_EDIT_MODE) {
        if (editableTextId) {
          // get element by  data-text-id={id}
          const element = document.querySelector(
            `[data-text-id="${editableTextId}"]`
          ) as HTMLDivElement;

          let text = "";
          if (element) {
            for (let i = 0; i < element.childNodes.length; i++) {
              const node = element.childNodes[i];
              if (node.nodeType === Node.TEXT_NODE) {
                const nodeText = node.textContent || "";
                text += nodeText;
              } else if (node.nodeType === Node.ELEMENT_NODE) {
                const nodeText = node.textContent || "";
                text += `\n${nodeText}`;
              }
            }
          }

          if (trackItemIds.includes(editableTextId)) {
            dispatch(EDIT_OBJECT, {
              payload: {
                [editableTextId]: {
                  details: {
                    text: text || ""
                  }
                }
              }
            });
          }
        }
        setEditableTextId(obj.value?.payload.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [editableTextId]);

  // Click outside to exit edit mode
  useEffect(() => {
    if (!editableTextId) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textElement = document.querySelector(`[data-text-id="${editableTextId}"]`);

      // If click is outside the text element, exit edit mode
      if (textElement && !textElement.contains(target)) {
        // Save text before exiting
        const text = (textElement as HTMLElement).innerText || "";
        if (trackItemIds.includes(editableTextId)) {
          dispatch(EDIT_OBJECT, {
            payload: {
              [editableTextId]: {
                details: { text }
              }
            }
          });
        }
        setEditableTextId(null);
      }
    };

    // Use setTimeout to avoid immediate trigger from the double-click that entered edit mode
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [editableTextId, trackItemIds]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (textChangeTimerRef.current) {
        clearTimeout(textChangeTimerRef.current);
      }
    };
  }, []);

  return (
    <>
      {groupedItems.map((group, index) => {
        if (group.length === 1) {
          const item = trackItemsMap[group[0].id];
          return SequenceItem[item.type](item, {
            fps,
            handleTextChange,
            onTextBlur,
            editableTextId,
            frame,
            size,
            isTransition: false
          });
        }
        const firstItem = trackItemsMap[group[0].id];
        const from = (firstItem.display.from / 1000) * fps;
        return (
          <TransitionSeries from={from} key={index}>
            {group.map((item) => {
              if (item.type === "transition") {
                const durationInFrames = (item.duration / 1000) * fps;
                return Transitions[item.kind]({
                  durationInFrames,
                  ...size,
                  id: item.id,
                  direction: item.direction
                });
              }
              return SequenceItem[item.type](trackItemsMap[item.id], {
                fps,
                handleTextChange,
                editableTextId,
                isTransition: true,
                size
              });
            })}
          </TransitionSeries>
        );
      })}
    </>
  );
};

export default Composition;
