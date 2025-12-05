import { IVideo } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles, mediaFillStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { OffthreadVideo, Video as RemotionVideo, getRemotionEnvironment } from "remotion";

export const Video = ({
  item,
  options
}: {
  item: IVideo;
  options: SequenceItemOptions;
}) => {
  const { fps, frame } = options;
  const { details, animations } = item;
  const playbackRate = item.playbackRate || 1;
  const { animationIn, animationOut, animationTimed } = getAnimations(
    animations!,
    item,
    frame,
    fps
  );
  const crop = details?.crop || {
    x: 0,
    y: 0,
    width: details.width,
    height: details.height
  };
  const { durationInFrames } = calculateFrames(item.display, fps);
  const currentFrame = (frame || 0) - (item.display.from * fps) / 1000;

  // Calculate trim values - if not set, use full duration based on display
  const trimFrom = item.trim?.from ?? 0;
  const trimTo = item.trim?.to ?? (item.display.to - item.display.from);
  const startFromFrame = Math.round((trimFrom / 1000) * fps);
  const endAtFrame = Math.round((trimTo / 1000) * fps) || undefined;

  const children = (
    <BoxAnim
      style={calculateContainerStyles(details, crop, {
        overflow: "hidden"
      })}
      animationIn={animationIn}
      animationOut={animationOut}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed}
          frame={frame || 0}
        >
          <div style={calculateMediaStyles(details, crop)}>
            {getRemotionEnvironment().isRendering ? (
              <OffthreadVideo
                startFrom={startFromFrame}
                endAt={endAtFrame}
                playbackRate={playbackRate}
                src={details.src}
                volume={(details.volume ?? 100) / 100}
                style={mediaFillStyles}
              />
            ) : (
              <RemotionVideo
                startFrom={startFromFrame}
                endAt={endAtFrame}
                playbackRate={playbackRate}
                src={details.src}
                volume={(details.volume ?? 100) / 100}
                style={mediaFillStyles}
              />
            )}
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
};

export default Video;
