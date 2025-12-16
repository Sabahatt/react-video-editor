import useStore from "../store/use-store";
import { useEffect, useRef, useState } from "react";
import { Droppable } from "@/components/ui/droppable";
import { PlusIcon, Loader2 } from "lucide-react";
import { DroppableArea } from "./droppable";

const SceneEmpty = () => {
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [desiredSize, setDesiredSize] = useState({ width: 0, height: 0 });
  const { size } = useStore();

  useEffect(() => {
    const container = containerRef.current!;
    const PADDING = 96;
    const containerHeight = container.clientHeight - PADDING;
    const containerWidth = container.clientWidth - PADDING;
    const { width, height } = size;

    const desiredZoom = Math.min(
      containerWidth / width,
      containerHeight / height
    );
    setDesiredSize({
      width: width * desiredZoom,
      height: height * desiredZoom
    });
    setIsLoading(false);
  }, [size]);

  const onSelectFiles = (files: File[]) => {
  };

  return (
    <div ref={containerRef} className="absolute z-50 flex h-full w-full flex-1">
      {!isLoading ? (
        <Droppable
          maxFileCount={4}
          maxSize={4 * 1024 * 1024}
          disabled={false}
          onValueChange={onSelectFiles}
          className="h-full w-full flex-1 bg-background"
        >
          <DroppableArea
            onDragStateChange={setIsDraggingOver}
            className={`absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 transform items-center justify-center rounded-xl text-center transition-all duration-300 ease-in-out ${
              isDraggingOver
                ? "border-2 border-[#fb923c] bg-[#fb923c]/10 shadow-[0_0_30px_rgba(251,146,60,0.2)]"
                : "border border-dashed border-white/20 hover:border-[#fb923c]/40 hover:shadow-[0_0_20px_rgba(251,146,60,0.1)]"
            }`}
            style={{
              width: desiredSize.width,
              height: desiredSize.height
            }}
          >
            <div className="flex flex-col items-center justify-center gap-4 pb-12">
              <div className="cursor-pointer rounded-xl p-3 bg-gradient-to-r from-[#fb923c] to-[#f472b6] text-white shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] transition-all duration-300">
                <PlusIcon className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-zinc-300 font-medium">Click to upload</p>
                <p className="text-xs text-muted-foreground">
                  Or drag and drop files here
                </p>
              </div>
            </div>
          </DroppableArea>
        </Droppable>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      )}
    </div>
  );
};

export default SceneEmpty;
