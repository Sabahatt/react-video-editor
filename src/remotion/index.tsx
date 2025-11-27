import { Composition } from "remotion";
import RenderComposition, {
  RenderCompositionProps
} from "../features/editor/player/render-composition";
import { ITrackItem, ITransition } from "@designcombo/types";

/**
 * Default props for preview in Remotion Studio.
 * When rendering via API, these are overridden by inputProps.
 */
const defaultProps: RenderCompositionProps = {
  fps: 30,
  width: 1080,
  height: 1920,
  trackItemIds: [] as string[],
  trackItemsMap: {} as Record<string, ITrackItem>,
  transitionIds: [] as string[],
  transitionsMap: {} as Record<string, ITransition>,
  background: {
    type: "color" as const,
    value: "#000000"
  }
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoEditor"
        component={RenderComposition}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => {
          // Calculate actual duration from the track items
          let maxEndTime = 0;
          const trackItemsMap = (props.trackItemsMap || {}) as Record<string, ITrackItem>;

          Object.values(trackItemsMap).forEach((item) => {
            if (item?.display?.to && item.display.to > maxEndTime) {
              maxEndTime = item.display.to;
            }
          });

          const fps = (props.fps as number) || 30;
          const durationInFrames = Math.max(
            Math.ceil((maxEndTime / 1000) * fps),
            1
          );

          return {
            durationInFrames,
            fps,
            width: (props.width as number) || 1080,
            height: (props.height as number) || 1920
          };
        }}
      />
    </>
  );
};
