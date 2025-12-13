import { ScrollArea } from "@/components/ui/scroll-area";
import { IBoxShadow, ITrackItem } from "@designcombo/types";
import Outline from "./common/outline";
import Shadow from "./common/shadow";
import Opacity from "./common/opacity";
import { useEffect, useState } from "react";
import { dispatch } from "@designcombo/events";
import { EDIT_OBJECT, LAYER_DELETE } from "@designcombo/state";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Layers, Trash2 } from "lucide-react";

interface MultiSelectionProps {
  trackItems: ITrackItem[];
}

const BasicMulti = ({ trackItems }: MultiSelectionProps) => {
  const [opacity, setOpacity] = useState<number>(100);
  const [borderWidth, setBorderWidth] = useState<number>(0);
  const [borderColor, setBorderColor] = useState<string>("#000000");
  const [boxShadow, setBoxShadow] = useState<IBoxShadow>({
    color: "#000000",
    x: 0,
    y: 0,
    blur: 0
  });

  // Get counts by type
  const typeCounts = trackItems.reduce(
    (acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Check which property types all selected items have
  const hasVisualItems = trackItems.every(
    (item) =>
      item.type === "text" ||
      item.type === "image" ||
      item.type === "video" ||
      item.type === "caption"
  );

  const hasNonAudioItems = trackItems.every((item) => item.type !== "audio");

  // Initialize with average/first values when selection changes
  useEffect(() => {
    if (trackItems.length > 0 && hasVisualItems) {
      // Get average opacity from all selected items
      const avgOpacity =
        trackItems.reduce((sum, item) => {
          const itemOpacity = (item as any).details?.opacity ?? 100;
          return sum + itemOpacity;
        }, 0) / trackItems.length;
      setOpacity(Math.round(avgOpacity));
    }
  }, [trackItems.map((t) => t.id).join(",")]);

  const handleChangeOpacity = (v: number) => {
    const payload: Record<string, any> = {};
    trackItems.forEach((item) => {
      payload[item.id] = {
        details: {
          opacity: v
        }
      };
    });

    dispatch(EDIT_OBJECT, { payload });
    setOpacity(v);
  };

  const onChangeBorderWidth = (v: number) => {
    const payload: Record<string, any> = {};
    trackItems.forEach((item) => {
      payload[item.id] = {
        details: {
          borderWidth: v
        }
      };
    });

    dispatch(EDIT_OBJECT, { payload });
    setBorderWidth(v);
  };

  const onChangeBorderColor = (v: string) => {
    const payload: Record<string, any> = {};
    trackItems.forEach((item) => {
      payload[item.id] = {
        details: {
          borderColor: v
        }
      };
    });

    dispatch(EDIT_OBJECT, { payload });
    setBorderColor(v);
  };

  const onChangeBoxShadow = (v: IBoxShadow) => {
    const payload: Record<string, any> = {};
    trackItems.forEach((item) => {
      payload[item.id] = {
        details: {
          boxShadow: v
        }
      };
    });

    dispatch(EDIT_OBJECT, { payload });
    setBoxShadow(v);
  };

  const handleDelete = () => {
    dispatch(LAYER_DELETE);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium gap-2">
        <Layers size={16} />
        Multi Selection
      </div>
      <ScrollArea className="flex-1 min-h-0">
        <div className="flex flex-col gap-4 px-4 py-4 pb-32">
          {/* Selection summary */}
          <div className="flex flex-col gap-2 p-3 bg-background/50 rounded-lg border border-border/50">
            <Label className="font-sans text-xs font-semibold text-primary">
              Selected Items ({trackItems.length})
            </Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(typeCounts).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-1 text-xs bg-muted rounded-md capitalize"
                >
                  {count} {type}
                  {count > 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Common properties for visual items */}
          {hasVisualItems && (
            <div className="flex flex-col gap-2">
              <Label className="font-sans text-xs font-semibold text-primary">
                Common Properties
              </Label>
              <Opacity onChange={handleChangeOpacity} value={opacity} />
            </div>
          )}

          {/* Border for non-audio items */}
          {hasNonAudioItems && (
            <Outline
              label="Outline"
              onChageBorderWidth={onChangeBorderWidth}
              onChangeBorderColor={onChangeBorderColor}
              valueBorderWidth={borderWidth}
              valueBorderColor={borderColor}
            />
          )}

          {/* Shadow for non-audio items */}
          {hasNonAudioItems && (
            <Shadow
              label="Shadow"
              onChange={onChangeBoxShadow}
              value={boxShadow}
            />
          )}

          {/* Delete button */}
          <div className="pt-4 border-t border-border/50">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 size={16} className="mr-2" />
              Delete {trackItems.length} Items
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default BasicMulti;
