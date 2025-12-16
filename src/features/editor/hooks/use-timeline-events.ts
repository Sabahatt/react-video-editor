import useStore from "../store/use-store";
import { useEffect } from "react";
import { filter, subject } from "@designcombo/events";
import {
  PLAYER_PAUSE,
  PLAYER_PLAY,
  PLAYER_PREFIX,
  PLAYER_SEEK,
  PLAYER_SEEK_BY,
  PLAYER_TOGGLE_PLAY
} from "../constants/events";
import { TIMELINE_SEEK, TIMELINE_PREFIX } from "@designcombo/timeline";
import { getSafeCurrentFrame } from "../utils/time";

// Use individual selectors to prevent unnecessary re-renders
const selectPlayerRef = (state: ReturnType<typeof useStore.getState>) => state.playerRef;
const selectFps = (state: ReturnType<typeof useStore.getState>) => state.fps;

const useTimelineEvents = () => {
  const playerRef = useStore(selectPlayerRef);
  const fps = useStore(selectFps);

  // Handle player and timeline events
  useEffect(() => {
    const playerEvents = subject.pipe(
      filter(({ key }) => key.startsWith(PLAYER_PREFIX))
    );
    const timelineEvents = subject.pipe(
      filter(({ key }) => key.startsWith(TIMELINE_PREFIX))
    );

    const timelineEventsSubscription = timelineEvents.subscribe((obj) => {
      if (obj.key === TIMELINE_SEEK) {
        const time = obj.value?.payload?.time;
        if (playerRef?.current && typeof time === "number") {
          playerRef.current.seekTo((time / 1000) * fps);
        }
      }
    });

    const playerEventsSubscription = playerEvents.subscribe((obj) => {
      if (obj.key === PLAYER_SEEK) {
        const time = obj.value?.payload?.time;
        if (playerRef?.current && typeof time === "number") {
          playerRef.current.seekTo((time / 1000) * fps);
        }
      } else if (obj.key === PLAYER_PLAY) {
        playerRef?.current?.play();
      } else if (obj.key === PLAYER_PAUSE) {
        playerRef?.current?.pause();
      } else if (obj.key === PLAYER_TOGGLE_PLAY) {
        if (playerRef?.current?.isPlaying()) {
          playerRef.current.pause();
        } else {
          playerRef?.current?.play();
        }
      } else if (obj.key === PLAYER_SEEK_BY) {
        const frames = obj.value?.payload?.frames;
        if (playerRef?.current && typeof frames === "number") {
          const safeCurrentFrame = getSafeCurrentFrame(playerRef);
          playerRef.current.seekTo(Math.round(safeCurrentFrame) + frames);
        }
      }
    });

    return () => {
      playerEventsSubscription.unsubscribe();
      timelineEventsSubscription.unsubscribe();
    };
  }, [playerRef, fps]);
};

export default useTimelineEvents;
