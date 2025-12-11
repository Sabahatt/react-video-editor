import { IAudio } from "@designcombo/types";
import { SequenceItemOptions, BaseSequence } from "../base-sequence";
import { Audio as RemotionAudio } from "remotion";

export default function Audio({
  item,
  options
}: {
  item: IAudio;
  options: SequenceItemOptions;
}) {
  const { fps } = options;
  const { details } = item;
  const playbackRate = item.playbackRate || 1;

  // Calculate trim values - if not set, use full duration based on display
  // When trim is not set, scale display duration by playbackRate to get source duration
  // (slower playback = longer display duration for same source content)
  const trimFrom = item.trim?.from ?? 0;
  const trimTo = item.trim?.to ?? ((item.display.to - item.display.from) * playbackRate);

  const children = (
    <RemotionAudio
      startFrom={Math.round((trimFrom / 1000) * fps)}
      endAt={Math.round((trimTo / 1000) * fps) || undefined}
      playbackRate={playbackRate}
      src={details.src}
      volume={(details.volume ?? 100) / 100}
    />
  );

  return BaseSequence({ item, options, children });
}
