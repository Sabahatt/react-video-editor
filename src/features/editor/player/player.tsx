import { useEffect, useRef } from "react";
import Composition from "./composition";
import { Player as RemotionPlayer, PlayerRef } from "@remotion/player";
import useStore from "../store/use-store";

// Use individual selectors to prevent unnecessary re-renders
const selectSetPlayerRef = (state: ReturnType<typeof useStore.getState>) => state.setPlayerRef;
const selectDuration = (state: ReturnType<typeof useStore.getState>) => state.duration;
const selectFps = (state: ReturnType<typeof useStore.getState>) => state.fps;
const selectSize = (state: ReturnType<typeof useStore.getState>) => state.size;
const selectBackground = (state: ReturnType<typeof useStore.getState>) => state.background;

const Player = () => {
  const playerRef = useRef<PlayerRef>(null);
  const setPlayerRef = useStore(selectSetPlayerRef);
  const duration = useStore(selectDuration);
  const fps = useStore(selectFps);
  const size = useStore(selectSize);
  const background = useStore(selectBackground);

  useEffect(() => {
    setPlayerRef(playerRef as React.RefObject<PlayerRef>);
  }, []);

  return (
    <RemotionPlayer
      ref={playerRef}
      component={Composition}
      durationInFrames={Math.round((duration / 1000) * fps) || 1}
      compositionWidth={size.width}
      compositionHeight={size.height}
      className={`h-full w-full bg-[${background.value}]`}
      fps={30}
      overflowVisible
      numberOfSharedAudioTags={0}
      errorFallback={({ error }) => {
        console.error("Player render error:", error);
        let errorMsg: string;
        if (error instanceof Error) {
          errorMsg = error.message;
        } else if (typeof error === 'object' && error !== null && 'target' in error) {
          const target = (error as { target?: HTMLMediaElement }).target;
          errorMsg = `Media failed to load: ${target?.src || 'unknown'}`;
        } else {
          errorMsg = String(error);
        }
        return <div className="flex items-center justify-center h-full text-red-500 text-sm p-4">Error: {errorMsg}</div>;
      }}
    />
  );
};
export default Player;
