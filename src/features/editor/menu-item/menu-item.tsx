import useLayoutStore from "../store/use-layout-store";
import { Transitions } from "./transitions";
import { Texts } from "./texts";
import { Audios } from "./audios";
import { Elements } from "./elements";
import { Images } from "./images";
import { Videos } from "./videos";
import { AiVideo } from "./ai-video";
import { VoiceOver } from "./voice-over";
import { useIsLargeScreen } from "@/hooks/use-media-query";
import { Uploads } from "./uploads";
import { AiVoice } from "./ai-voice";

const ActiveMenuItem = () => {
  const { activeMenuItem } = useLayoutStore();

  if (activeMenuItem === "transitions") {
    return <Transitions />;
  }
  if (activeMenuItem === "texts") {
    return <Texts />;
  }
  if (activeMenuItem === "shapes") {
    return <Elements />;
  }
  if (activeMenuItem === "videos") {
    return <Videos />;
  }
  if (activeMenuItem === "ai-video") {
    return <AiVideo />;
  }

  if (activeMenuItem === "audios") {
    return <Audios />;
  }

  if (activeMenuItem === "images") {
    return <Images />;
  }

  if (activeMenuItem === "voiceOver") {
    return <VoiceOver />;
  }
  if (activeMenuItem === "elements") {
    return <Elements />;
  }
  if (activeMenuItem === "uploads") {
    return <Uploads />;
  }

  if (activeMenuItem === "ai-voice") {
    return <AiVoice />;
  }

  return null;
};

export const MenuItem = () => {
  const isLargeScreen = useIsLargeScreen();

  return (
    <div
      className={`${isLargeScreen ? "w-[300px]" : "w-full"} flex-1 flex border-r border-white/[0.04] bg-gradient-to-b from-[#f472b6]/[0.02] via-transparent to-[#fb923c]/[0.02] relative`}
    >
      {/* Subtle gradient accent on right border */}
      <div
        className="absolute right-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(251,146,60,0.3) 0%, rgba(244,114,182,0.15) 50%, rgba(251,146,60,0.3) 100%)"
        }}
      />
      {/* Bottom corner glow */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-25"
        style={{
          background: "radial-gradient(circle at bottom right, rgba(251,146,60,0.12) 0%, transparent 70%)"
        }}
      />
      <ActiveMenuItem />
    </div>
  );
};
