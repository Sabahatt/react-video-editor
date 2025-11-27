import { ISize, ITrackItem, ITransition } from "@designcombo/types";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SequenceItem } from "./sequence-item";
import { groupTrackItems } from "../utils/track-items";
import { TransitionSeries, Transitions } from "@designcombo/transitions";

/**
 * Props for the RenderComposition component.
 * This is what gets passed as inputProps to Remotion's renderMedia.
 */
export interface RenderCompositionProps {
  fps: number;
  width: number;
  height: number;
  trackItemIds: string[];
  trackItemsMap: Record<string, ITrackItem>;
  transitionIds: string[];
  transitionsMap: Record<string, ITransition>;
  background?: {
    type: "color" | "image";
    value: string;
  };
  // Index signature for Remotion compatibility
  [key: string]: unknown;
}

/**
 * A headless composition component for Remotion rendering.
 * Unlike the editor Composition, this accepts all data as props
 * instead of using the Zustand store.
 */
const RenderComposition: React.FC<RenderCompositionProps> = (props) => {
  const {
    trackItemIds,
    trackItemsMap,
    fps,
    transitionsMap,
    background,
    width,
    height
  } = props;
  const frame = useCurrentFrame();
  const size: ISize = { width, height };

  const groupedItems = groupTrackItems({
    trackItemIds,
    transitionsMap,
    trackItemsMap
  });

  const backgroundStyle: React.CSSProperties = {
    backgroundColor:
      background?.type === "color" ? background.value : "transparent",
    backgroundImage:
      background?.type === "image" ? `url(${background.value})` : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center"
  };

  return (
    <AbsoluteFill style={backgroundStyle}>
      {groupedItems.map((group, index) => {
        if (group.length === 1) {
          const item = trackItemsMap[group[0].id];
          if (!item) return null;

          return SequenceItem[item.type]?.(item, {
            fps,
            frame,
            size,
            isTransition: false
          });
        }

        const firstItem = trackItemsMap[group[0].id];
        if (!firstItem) return null;

        const from = (firstItem.display.from / 1000) * fps;

        return (
          <TransitionSeries from={from} key={index}>
            {group.map((groupItem) => {
              if (groupItem.type === "transition") {
                const transition = groupItem as unknown as ITransition;
                const durationInFrames = (transition.duration / 1000) * fps;
                const transitionFn =
                  Transitions[transition.kind as keyof typeof Transitions];

                if (!transitionFn) return null;

                return transitionFn({
                  durationInFrames,
                  ...size,
                  id: transition.id,
                  direction: (transition as any).direction
                });
              }

              const item = trackItemsMap[groupItem.id];
              if (!item) return null;

              return SequenceItem[item.type]?.(item, {
                fps,
                frame,
                size,
                isTransition: true
              });
            })}
          </TransitionSeries>
        );
      })}
    </AbsoluteFill>
  );
};

export default RenderComposition;
