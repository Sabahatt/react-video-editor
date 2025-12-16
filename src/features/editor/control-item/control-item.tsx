import React from "react";
import {
  IAudio,
  ICaption,
  IImage,
  IText,
  ITrackItem,
  ITrackItemAndDetails,
  IVideo
} from "@designcombo/types";
import { useEffect, useState } from "react";
import BasicText from "./basic-text";
import BasicImage from "./basic-image";
import BasicVideo from "./basic-video";
import BasicAudio from "./basic-audio";
import BasicMulti from "./basic-multi";
import useStore from "../store/use-store";
import useLayoutStore from "../store/use-layout-store";
import BasicCaption from "./basic-caption";
import { LassoSelect } from "lucide-react";

const Container = ({ children }: { children: React.ReactNode }) => {
  const { activeIds, trackItemsMap, transitionsMap } = useStore();
  const [trackItem, setTrackItem] = useState<ITrackItem | null>(null);
  const [trackItems, setTrackItems] = useState<ITrackItem[]>([]);
  const { setTrackItem: setLayoutTrackItem } = useLayoutStore();

  useEffect(() => {
    if (activeIds.length === 1) {
      const [id] = activeIds;
      const trackItem = trackItemsMap[id];
      if (trackItem) {
        setTrackItem(trackItem);
        setLayoutTrackItem(trackItem);
        setTrackItems([]);
      } else console.log(transitionsMap[id]);
    } else if (activeIds.length > 1) {
      // Multiple items selected
      const items = activeIds
        .map((id) => trackItemsMap[id])
        .filter(Boolean) as ITrackItem[];
      setTrackItems(items);
      setTrackItem(null);
      setLayoutTrackItem(null);
    } else {
      setTrackItem(null);
      setTrackItems([]);
      setLayoutTrackItem(null);
    }
  }, [activeIds, trackItemsMap]);

  return (
    <div
      className="w-[272px] flex-none hidden lg:flex lg:flex-col h-[calc(100vh-58px)] overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, rgba(10,10,10,0.95) 0%, rgba(5,5,5,0.98) 100%)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderLeft: "1px solid rgba(255,255,255,0.04)",
        boxShadow: "inset 1px 0 0 rgba(255,255,255,0.03), -8px 0 32px rgba(0,0,0,0.2)",
      }}
    >
      {/* Subtle gradient accent on left border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(244,114,182,0.4) 0%, rgba(251,146,60,0.2) 50%, rgba(244,114,182,0.4) 100%)"
        }}
      />
      {/* Top corner glow */}
      <div
        className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-30"
        style={{
          background: "radial-gradient(circle at top left, rgba(244,114,182,0.15) 0%, transparent 70%)"
        }}
      />
      {React.cloneElement(children as React.ReactElement<any>, {
        trackItem,
        trackItems
      })}
    </div>
  );
};

const ActiveControlItem = ({
  trackItem,
  trackItems
}: {
  trackItem?: ITrackItemAndDetails;
  trackItems?: ITrackItem[];
}) => {
  // Multi-selection mode
  if (trackItems && trackItems.length > 1) {
    return <BasicMulti trackItems={trackItems} />;
  }

  // No selection
  if (!trackItem) {
    return (
      <div className="pb-32 flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground h-[calc(100vh-58px)] px-6">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#fb923c]/10 to-[#f472b6]/10 border border-white/[0.06]">
          <LassoSelect className="w-6 h-6 text-[#fb923c]/60" />
        </div>
        <div className="text-center">
          <span className="text-zinc-400 text-sm">No item selected</span>
          <p className="text-zinc-600 text-xs mt-1">Select an item on the timeline to edit</p>
        </div>
      </div>
    );
  }

  // Single selection
  return (
    <>
      {
        {
          text: <BasicText trackItem={trackItem as ITrackItem & IText} />,
          caption: (
            <BasicCaption trackItem={trackItem as ITrackItem & ICaption} />
          ),
          image: <BasicImage trackItem={trackItem as ITrackItem & IImage} />,
          video: <BasicVideo trackItem={trackItem as ITrackItem & IVideo} />,
          audio: <BasicAudio trackItem={trackItem as ITrackItem & IAudio} />
        }[trackItem.type as "text"]
      }
    </>
  );
};

export const ControlItem = () => {
  return (
    <Container>
      <ActiveControlItem />
    </Container>
  );
};
