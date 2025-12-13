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
    <div className="w-[272px] flex-none border-l border-border/80 bg-muted hidden lg:flex lg:flex-col h-[calc(100vh-58px)] overflow-hidden">
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
      <div className="pb-32 flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground h-[calc(100vh-58px)]">
        <LassoSelect />
        <span className="text-zinc-500">No item selected</span>
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
