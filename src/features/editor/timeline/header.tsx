import { Button } from "@/components/ui/button";
import { dispatch } from "@designcombo/events";
import {
  ACTIVE_SPLIT,
  LAYER_CLONE,
  LAYER_DELETE,
  TIMELINE_SCALE_CHANGED
} from "@designcombo/state";
import { PLAYER_PAUSE, PLAYER_PLAY } from "../constants/events";
import { frameToTimeString, getCurrentTime, timeToString } from "../utils/time";
import useStore from "../store/use-store";
import { SquareSplitHorizontal, Trash, ZoomIn, ZoomOut } from "lucide-react";
import {
  getFitZoomLevel,
  getNextZoomLevel,
  getPreviousZoomLevel,
  getZoomByIndex
} from "../utils/timeline";
import { useCurrentPlayerFrame } from "../hooks/use-current-frame";
import { Slider } from "@/components/ui/slider";
import { useEffect, useState } from "react";
import useUpdateAnsestors from "../hooks/use-update-ansestors";
import { ITimelineScaleState } from "@designcombo/types";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { useTimelineOffsetX } from "../hooks/use-timeline-offset";

const IconPlayerPlayFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" />
  </svg>
);

const IconPlayerPauseFilled = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M9 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
    <path d="M17 4h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h2a2 2 0 0 0 2 -2v-12a2 2 0 0 0 -2 -2z" />
  </svg>
);
const IconPlayerSkipBack = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M20 5v14l-12 -7z" />
    <path d="M4 5l0 14" />
  </svg>
);

const IconPlayerSkipForward = ({ size }: { size: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 5v14l12 -7z" />
    <path d="M20 5l0 14" />
  </svg>
);
const Header = () => {
  const [playing, setPlaying] = useState(false);
  const { duration, fps, scale, playerRef, activeIds } = useStore();
  const isLargeScreen = useIsLargeScreen();
  useUpdateAnsestors({ playing, playerRef });

  const currentFrame = useCurrentPlayerFrame(playerRef);

  const doActiveDelete = () => {
    dispatch(LAYER_DELETE);
  };

  const doActiveSplit = () => {
    dispatch(ACTIVE_SPLIT, {
      payload: {},
      options: {
        time: getCurrentTime()
      }
    });
  };

  const changeScale = (scale: ITimelineScaleState) => {
    dispatch(TIMELINE_SCALE_CHANGED, {
      payload: {
        scale
      }
    });
  };

  const handlePlay = (e: React.MouseEvent) => {
    // Pass the event for browser autoplay policy compliance
    playerRef?.current?.play(e);
  };

  const handlePause = () => {
    playerRef?.current?.pause();
  };

  useEffect(() => {
    playerRef?.current?.addEventListener("play", () => {
      setPlaying(true);
    });
    playerRef?.current?.addEventListener("pause", () => {
      setPlaying(false);
    });
    return () => {
      playerRef?.current?.removeEventListener("play", () => {
        setPlaying(true);
      });
      playerRef?.current?.removeEventListener("pause", () => {
        setPlaying(false);
      });
    };
  }, [playerRef]);

  return (
    <div
      style={{
        position: "relative",
        height: "50px",
        flex: "none"
      }}
      className="border-b border-white/[0.06] bg-gradient-to-r from-[#f472b6]/[0.02] via-transparent to-[#fb923c]/[0.02]"
    >
      <div
        style={{
          position: "absolute",
          height: 50,
          width: "100%",
          display: "flex",
          alignItems: "center"
        }}
      >
        <div
          style={{
            height: 36,
            width: "100%",
            display: "grid",
            gridTemplateColumns: isLargeScreen
              ? "1fr 260px 1fr"
              : "1fr 1fr 1fr",
            alignItems: "center"
          }}
        >
          <div className="flex px-2">
            <Button
              disabled={!activeIds.length}
              onClick={doActiveDelete}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors"
            >
              <Trash size={14} />{" "}
              <span className="hidden lg:block">Delete</span>
            </Button>

            <Button
              disabled={!activeIds.length}
              onClick={doActiveSplit}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors"
            >
              <SquareSplitHorizontal size={15} />{" "}
              <span className="hidden lg:block">Split</span>
            </Button>
            <Button
              disabled={!activeIds.length}
              onClick={() => {
                dispatch(LAYER_CLONE);
              }}
              variant={"ghost"}
              size={isLargeScreen ? "sm" : "icon"}
              className="flex items-center gap-1 px-2 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors"
            >
              <SquareSplitHorizontal size={15} />{" "}
              <span className="hidden lg:block">Clone</span>
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Button
              className="hidden lg:inline-flex h-7 w-7 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors"
              onClick={doActiveDelete}
              variant={"ghost"}
              size={"icon"}
            >
              <IconPlayerSkipBack size={14} />
            </Button>
            <Button
              onClickCapture={(e) => {
                if (playing) {
                  return handlePause();
                }
                handlePlay(e);
              }}
              variant={"ghost"}
              size={"icon"}
              className={`h-7 w-7 transition-all duration-200 ${
                playing
                  ? "text-[#fb923c] bg-[#fb923c]/15"
                  : "text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10"
              }`}
            >
              {playing ? (
                <IconPlayerPauseFilled size={14} />
              ) : (
                <IconPlayerPlayFilled size={14} />
              )}
            </Button>
            <Button
              className="hidden lg:inline-flex h-7 w-7 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors"
              onClick={doActiveSplit}
              variant={"ghost"}
              size={"icon"}
            >
              <IconPlayerSkipForward size={14} />
            </Button>
            <div className="text-xs flex items-center gap-1 ml-1">
              <span
                className="font-medium text-[#fb923c]"
                data-current-time={currentFrame / fps}
                id="video-current-time"
              >
                {frameToTimeString({ frame: currentFrame }, { fps })}
              </span>
              <span className="text-white/30">/</span>
              <span className="text-muted-foreground hidden lg:inline">
                {timeToString({ time: duration })}
              </span>
            </div>
          </div>

          <ZoomControl
            scale={scale}
            onChangeTimelineScale={changeScale}
            duration={duration}
          />
        </div>
      </div>
    </div>
  );
};

const ZoomControl = ({
  scale,
  onChangeTimelineScale,
  duration
}: {
  scale: ITimelineScaleState;
  onChangeTimelineScale: (scale: ITimelineScaleState) => void;
  duration: number;
}) => {
  const [localValue, setLocalValue] = useState(scale.index);
  const timelineOffsetX = useTimelineOffsetX();

  useEffect(() => {
    setLocalValue(scale.index);
  }, [scale.index]);

  const onZoomOutClick = () => {
    const previousZoom = getPreviousZoomLevel(scale);
    onChangeTimelineScale(previousZoom);
  };

  const onZoomInClick = () => {
    const nextZoom = getNextZoomLevel(scale);
    onChangeTimelineScale(nextZoom);
  };

  const onZoomFitClick = () => {
    const fitZoom = getFitZoomLevel(duration, scale.zoom, timelineOffsetX);
    onChangeTimelineScale(fitZoom);
  };

  return (
    <div className="flex items-center justify-end gap-1 pr-2">
      <Button size={"icon"} variant={"ghost"} onClick={onZoomOutClick} className="h-7 w-7 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors">
        <ZoomOut size={14} />
      </Button>
      <Slider
        className="w-20 hidden lg:flex"
        value={[localValue]}
        min={0}
        max={12}
        step={1}
        onValueChange={(e) => {
          setLocalValue(e[0]);
        }}
        onValueCommit={() => {
          const zoom = getZoomByIndex(localValue);
          onChangeTimelineScale(zoom);
        }}
      />
      <Button size={"icon"} variant={"ghost"} onClick={onZoomInClick} className="h-7 w-7 text-muted-foreground hover:text-[#fb923c] hover:bg-[#fb923c]/10 transition-colors">
        <ZoomIn size={14} />
      </Button>
      <Button onClick={onZoomFitClick} variant={"ghost"} size={"icon"} className="h-7 w-7 text-muted-foreground hover:text-[#f472b6] hover:bg-[#f472b6]/10 transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="M20 8V6h-2q-.425 0-.712-.288T17 5t.288-.712T18 4h2q.825 0 1.413.588T22 6v2q0 .425-.288.713T21 9t-.712-.288T20 8M2 8V6q0-.825.588-1.412T4 4h2q.425 0 .713.288T7 5t-.288.713T6 6H4v2q0 .425-.288.713T3 9t-.712-.288T2 8m18 12h-2q-.425 0-.712-.288T17 19t.288-.712T18 18h2v-2q0-.425.288-.712T21 15t.713.288T22 16v2q0 .825-.587 1.413T20 20M4 20q-.825 0-1.412-.587T2 18v-2q0-.425.288-.712T3 15t.713.288T4 16v2h2q.425 0 .713.288T7 19t-.288.713T6 20zm2-6v-4q0-.825.588-1.412T8 8h8q.825 0 1.413.588T18 10v4q0 .825-.587 1.413T16 16H8q-.825 0-1.412-.587T6 14"
          />
        </svg>
      </Button>
    </div>
  );
};

export default Header;
