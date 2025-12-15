import { Button, buttonVariants } from "@/components/ui/button";
import { ADD_AUDIO, ADD_IMAGE, ADD_TEXT } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import Draggable from "@/components/shared/draggable";
import { TEXT_ADD_PAYLOAD } from "../constants/payload";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

export const Texts = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();

  const handleAddText = () => {
    dispatch(ADD_TEXT, {
      payload: { ...TEXT_ADD_PAYLOAD, id: nanoid() },
      options: {}
    });
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="text-zinc-200 flex h-12 flex-none items-center px-4 text-sm font-medium">
        Text
      </div>
      <div className="flex flex-col gap-2 px-4">
        <Draggable
          data={TEXT_ADD_PAYLOAD}
          renderCustomPreview={
            <Button variant="secondary" className="w-60">
              Add text
            </Button>
          }
          shouldDisplayPreview={!isDraggingOverTimeline}
        >
          <div
            onClick={handleAddText}
            className="cursor-pointer w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#00d8d6] to-[#8b5cf6] hover:shadow-[0_0_20px_rgba(0,216,214,0.3)] transition-all duration-300 text-center"
          >
            Add text
          </div>
        </Draggable>
      </div>
    </div>
  );
};
