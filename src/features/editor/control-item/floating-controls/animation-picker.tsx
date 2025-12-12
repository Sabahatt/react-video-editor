import { X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADD_ANIMATION } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import useStore from "../../store/use-store";
import { Animation, presets } from "../../player/animated";
import React, { useRef } from "react";
import useLayoutStore from "../../store/use-layout-store";
import useClickOutside from "../../hooks/useClickOutside";
import { Easing } from "remotion";
import { PresetName } from "../../player/animated/presets";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimationDuration } from "../common/animation-duration";

const removeAnimation = (
  type: "in" | "out" | "loop",
  activeIds: string[],
  trackItemsMap: any
) => {
  if (!activeIds.length) return;

  const currentItem = trackItemsMap[activeIds[0]];
  const currentAnimations = currentItem?.animations || {};

  // Check if this animation type exists
  if (!currentAnimations[type]) return;

  // Create new animations object without the removed type
  const newAnimations = { ...currentAnimations };
  delete newAnimations[type];

  // ADD_ANIMATION's state handler will completely replace the animations
  // object when the passed animations don't match existing in/out/loop keys.
  // By passing the new object without the removed type, it gets replaced.
  dispatch(ADD_ANIMATION, {
    payload: {
      id: activeIds[0],
      animations: Object.keys(newAnimations).length > 0 ? newAnimations : {}
    }
  });
};

export const createNoneButton = (
  type: "in" | "out" | "loop",
  activeIds: string[],
  trackItemsMap: any
) => {
  let borderColor = "";
  if (trackItemsMap && activeIds.length) {
    const currentItem = trackItemsMap[activeIds[0]];
    const animations = currentItem?.animations;
    const hasAnimation = animations?.[type]?.name;
    if (!hasAnimation) {
      borderColor = "border-[#006239]";
    }
  }

  return (
    <div
      key={`none-${type}`}
      className={`flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-center border ${borderColor}`}
      onClick={() => removeAnimation(type, activeIds, trackItemsMap)}
    >
      <div
        className="flex items-center justify-center bg-muted/50"
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "8px"
        }}
      >
        <X className="w-6 h-6 text-muted-foreground" />
      </div>
      <div>None</div>
    </div>
  );
};

export const createPresetButtons = (
  filter: (key: string) => boolean,
  type: "in" | "out" | "loop",
  activeIds: string[],
  animationType: "text" | "media",
  trackItemsMap: any
) =>
  Object.keys(presets)
    .filter(filter)
    .map((presetKey) => {
      const preset = presets[presetKey as "scaleIn"];

      const style = React.useMemo(
        () => ({
          backgroundImage: `url(${preset.previewUrl})`,
          backgroundSize: "cover",
          width: "60px",
          height: "60px",
          borderRadius: "8px"
        }),
        [preset.previewUrl]
      );
      if (
        animationType === "media" &&
        preset.property?.toLowerCase().includes("text")
      )
        return;
      let borderColor = "";
      if (trackItemsMap) {
        const currentItem = trackItemsMap[activeIds[0]];
        const animations = currentItem?.animations;

        const isSelected = ["in", "out", "loop"].some(
          (type) => animations?.[type]?.name === presetKey
        );

        if (isSelected) {
          borderColor = "border-[#006239]";
        }
      }

      return (
        <div
          key={presetKey}
          className={`flex cursor-pointer flex-col gap-2 text-center text-xs text-muted-foreground items-center justify-center border ${borderColor}`}
          onClick={() =>
            applyAnimation(
              presetKey as PresetName,
              type,
              activeIds,
              trackItemsMap
            )
          }
        >
          <div style={style} draggable={false} />
          <div>{preset.name}</div>
        </div>
      );
    });

const applyAnimation = (
  presetName: PresetName,
  type: "in" | "out" | "loop",
  activeIds: string[],
  trackItemsMap: any
) => {
  if (!activeIds.length) {
    console.warn("No active ID to apply the animation to.");
    return;
  }
  const presetAnimation: any = presets[presetName];
  const composition: Animation[] = [presetAnimation];
  if (presetName.includes("rotate") && presetName.includes("In"))
    composition.push(presets.scaleIn);
  else if (presetName.includes("shake") && presetName.includes("In")) {
    const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
    const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
    composition[0].from = presetName.includes("Horizontal")
      ? shakeMovX
      : shakeMovY;
    composition[0].to = presetName.includes("Horizontal")
      ? -shakeMovX
      : -shakeMovY;
    composition.push({
      property: "scale",
      from: 2,
      to: 1,
      durationInFrames: 30,
      ease: Easing.ease,
      previewUrl: "https://cdn.designcombo.dev/animations/ScaleIn.webp",
      name: "Scale"
    });
  } else if (presetName.includes("shake") && presetName.includes("Out")) {
    const shakeMovX = trackItemsMap[activeIds[0]].details.width / 6;
    const shakeMovY = trackItemsMap[activeIds[0]].details.height / 6;
    composition[0].from = presetName.includes("Horizontal")
      ? -shakeMovX
      : -shakeMovY;
    composition[0].to = presetName.includes("Horizontal")
      ? shakeMovX
      : shakeMovY;
    composition.push({
      property: "scale",
      from: 1,
      to: 2,
      durationInFrames: 30,
      ease: Easing.ease,
      previewUrl: "https://cdn.designcombo.dev/animations/ScaleOut.webp",
      name: "Scale"
    });
  }
  dispatch(ADD_ANIMATION, {
    payload: {
      id: activeIds[0],
      animations: {
        [type]: {
          name: presetName,
          composition
        }
      }
    }
  });
};
export default function AnimationPicker({
  animationType = "media"
}: {
  animationType?: "text" | "media";
}) {
  const { activeIds, trackItemsMap } = useStore();

  const noneInButton = createNoneButton("in", activeIds, trackItemsMap);
  const noneOutButton = createNoneButton("out", activeIds, trackItemsMap);
  const noneLoopButton = createNoneButton("loop", activeIds, trackItemsMap);

  const presetInButtons = createPresetButtons(
    (key) => key.includes("In"),
    "in",
    activeIds,
    animationType,
    trackItemsMap
  );
  const presetOutButtons = createPresetButtons(
    (key) => key.includes("Out"),
    "out",
    activeIds,
    animationType,
    trackItemsMap
  );
  const presetLoopButtons = createPresetButtons(
    (key) => key.includes("Loop"),
    "loop",
    activeIds,
    animationType,
    trackItemsMap
  );
  const { setFloatingControl } = useLayoutStore();
  const floatingRef = useRef<HTMLDivElement>(null);

  useClickOutside(floatingRef as React.RefObject<HTMLElement>, () =>
    setFloatingControl("")
  );
  return (
    <div
      ref={floatingRef}
      className="bg-sidebar absolute right-2 top-2 z-[200] w-60 border p-0"
    >
      <div className="handle flex cursor-grab items-center justify-between px-4 py-3">
        <p className="text-sm font-bold">Animations</p>
        <div className="h-4 w-4" onClick={() => setFloatingControl("")}>
          <X className="h-3 w-3 cursor-pointer font-extrabold text-muted-foreground" />
        </div>
      </div>

      <Tabs defaultValue="in" className="w-full px-2">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="in">In</TabsTrigger>
          <TabsTrigger value="loop">Loop</TabsTrigger>
          <TabsTrigger value="out">Out</TabsTrigger>
        </TabsList>

        <TabsContent value="in">
          <ScrollArea className="h-[400px] w-full">
            <div className="grid grid-cols-3 gap-2 pt-4 pb-25">
              {noneInButton}
              {presetInButtons}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="loop">
          <ScrollArea className="h-[400px] w-full">
            <div className="grid grid-cols-3 gap-2 pt-4 pb-25">
              {noneLoopButton}
              {presetLoopButtons}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="out">
          <ScrollArea className="h-[400px] w-full">
            <div className="grid grid-cols-3 gap-2 pt-4 pb-25">
              {noneOutButton}
              {presetOutButtons}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      <AnimationDuration />
    </div>
  );
}
