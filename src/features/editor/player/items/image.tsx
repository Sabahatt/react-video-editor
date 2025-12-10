import { IImage } from "@designcombo/types";
import { BaseSequence, SequenceItemOptions } from "../base-sequence";
import { BoxAnim, ContentAnim, MaskAnim } from "@designcombo/animations";
import { calculateContainerStyles, calculateMediaStyles, mediaFillStyles, mediaContainStyles } from "../styles";
import { getAnimations } from "../../utils/get-animations";
import { calculateFrames } from "../../utils/frames";
import { Img, interpolate } from "remotion";

// Ken Burns animation types
type KenBurnsDirection = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';

/**
 * Calculate Ken Burns transform based on current frame progress
 */
function getKenBurnsTransform(
  direction: KenBurnsDirection,
  progress: number // 0 to 1
): React.CSSProperties {
  switch (direction) {
    case 'zoom-in':
      // Scale from 1.0 to 1.15
      const scaleIn = interpolate(progress, [0, 1], [1.0, 1.15]);
      return { transform: `scale(${scaleIn})` };

    case 'zoom-out':
      // Scale from 1.15 to 1.0
      const scaleOut = interpolate(progress, [0, 1], [1.15, 1.0]);
      return { transform: `scale(${scaleOut})` };

    case 'pan-left':
      // Pan from right to left - no zoom, just translate
      const translateLeft = interpolate(progress, [0, 1], [5, -5]);
      return { transform: `translateX(${translateLeft}%)` };

    case 'pan-right':
      // Pan from left to right - no zoom, just translate
      const translateRight = interpolate(progress, [0, 1], [-5, 5]);
      return { transform: `translateX(${translateRight}%)` };

    default:
      return {};
  }
}

export default function Image({
  item,
  options
}: {
  item: IImage;
  options: SequenceItemOptions;
}) {
  const { fps, frame } = options;
  const { details, animations, metadata } = item;
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

  // Check fitMode from metadata (contain for product images, cover for backgrounds)
  // Also support legacy isLogo flag for backwards compatibility
  const fitMode = (metadata as Record<string, unknown>)?.fitMode as 'cover' | 'contain' | undefined;
  const isLogo = (metadata as Record<string, unknown>)?.isLogo === true;
  const useContain = fitMode === 'contain' || isLogo;
  const imageStyles = useContain ? mediaContainStyles : mediaFillStyles;

  // Ken Burns animation from metadata
  const kenBurnsDirection = (metadata as Record<string, unknown>)?.kenBurnsDirection as KenBurnsDirection | undefined;

  // Calculate Ken Burns transform if applicable
  let kenBurnsStyles: React.CSSProperties = {};
  if (kenBurnsDirection && durationInFrames > 0) {
    const progress = Math.min(Math.max(currentFrame / durationInFrames, 0), 1);
    kenBurnsStyles = getKenBurnsTransform(kenBurnsDirection, progress);
  }

  const children = (
    <BoxAnim
      style={calculateContainerStyles(details, crop, {
        transform: "scale(1)",
        overflow: kenBurnsDirection ? "hidden" : undefined
      })}
      animationIn={animationIn!}
      animationOut={animationOut!}
      frame={currentFrame}
      durationInFrames={durationInFrames}
    >
      <ContentAnim
        animationTimed={animationTimed!}
        durationInFrames={durationInFrames}
        frame={currentFrame}
      >
        <MaskAnim
          item={item}
          keyframeAnimations={animationTimed!}
          frame={frame || 0}
        >
          <div
            id={`${item.id}-reveal-mask`}
            style={{
              ...calculateMediaStyles(details, crop),
              ...(kenBurnsDirection ? { overflow: 'hidden' } : {})
            }}
          >
            {/* image layer with Ken Burns effect */}
            <Img
              data-id={item.id}
              src={details.src}
              style={{
                ...imageStyles,
                ...kenBurnsStyles,
                willChange: kenBurnsDirection ? 'transform' : undefined
              }}
            />
          </div>
        </MaskAnim>
      </ContentAnim>
    </BoxAnim>
  );

  return BaseSequence({ item, options, children });
}
