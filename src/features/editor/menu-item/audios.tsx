import Draggable from "@/components/shared/draggable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO } from "@designcombo/state";
import { IAudio } from "@designcombo/types";
import { Music, Search, Loader2, Play, Pause, Plus } from "lucide-react";
import { useIsDraggingOverTimeline } from "../hooks/is-dragging-over-timeline";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { generateId } from "@designcombo/timeline";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useStockAudio } from "@/hooks/use-stock-audio";
import { ImageLoading } from "@/components/ui/image-loading";

const DEFAULT_SEARCH_TERM = "background music";

export const Audios = () => {
  const isDraggingOverTimeline = useIsDraggingOverTimeline();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const {
    audios: stockAudio,
    loading,
    error,
    currentPage,
    hasNextPage,
    searchAudio,
    searchAudioAppend,
    clearAudio
  } = useStockAudio();

  const stopPreview = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setCurrentlyPlayingId(null);
  }, []);

  const handlePlayPause = useCallback((audioId: string, audioSrc: string) => {
    if (currentlyPlayingId === audioId) {
      stopPreview();
      return;
    }

    stopPreview();

    const newAudio = new Audio(audioSrc);
    newAudio.addEventListener("ended", () => {
      setCurrentlyPlayingId(null);
      audioElementRef.current = null;
    });

    newAudio.play();
    setCurrentlyPlayingId(audioId);
    audioElementRef.current = newAudio;
  }, [currentlyPlayingId, stopPreview]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);

  // Load default audio on component mount
  useEffect(() => {
    searchAudio(DEFAULT_SEARCH_TERM);
  }, [searchAudio]);

  const handleAddAudio = (payload: Partial<IAudio>) => {
    stopPreview();
    payload.id = generateId();
    dispatch(ADD_AUDIO, {
      payload,
      options: {}
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      await searchAudio(DEFAULT_SEARCH_TERM);
      return;
    }
    await searchAudio(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage) {
      if (searchQuery.trim()) {
        searchAudioAppend(searchQuery, currentPage + 1);
      } else {
        searchAudioAppend(DEFAULT_SEARCH_TERM, currentPage + 1);
      }
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    clearAudio();
    searchAudio(DEFAULT_SEARCH_TERM);
  };

  return (
    <div className="flex flex-1 flex-col max-w-full">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        Audios
      </div>
      <div className="flex items-center gap-2 px-4 pb-4">
        <div className="relative flex-1">
          <Input
            placeholder="Search audio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="pr-10"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Search className="h-3 w-3" />
            )}
          </Button>
        </div>
        {searchQuery && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearSearch}
            disabled={loading}
          >
            Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 pb-2">
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/20 p-2 rounded">
            {error}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 h-[calc(100%-98px)] max-w-full">
        <div className="flex flex-col px-2">
          {stockAudio.map((audio, index) => {
            return (
              <AudioItem
                shouldDisplayPreview={!isDraggingOverTimeline}
                handleAddAudio={handleAddAudio}
                handlePlayPause={handlePlayPause}
                isPlaying={currentlyPlayingId === audio.id}
                audio={audio}
                key={audio.id || index}
              />
            );
          })}
        </div>
        {loading && <ImageLoading message="Searching for audio..." />}
        {/* Pagination */}
        {hasNextPage && (
          <div className="flex items-center justify-center p-4">
            <Button
              size="sm"
              variant="outline"
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

const AudioItem = ({
  handleAddAudio,
  handlePlayPause,
  isPlaying,
  audio,
  shouldDisplayPreview
}: {
  handleAddAudio: (payload: Partial<IAudio>) => void;
  handlePlayPause: (audioId: string, audioSrc: string) => void;
  isPlaying: boolean;
  audio: Partial<IAudio> & { metadata?: { author?: string; mood?: string; duration?: number } };
  shouldDisplayPreview: boolean;
}) => {
  const style = React.useMemo(
    () => ({
      backgroundImage:
        "url(https://cdn.designcombo.dev/thumbnails/music-preview.png)",
      backgroundSize: "cover",
      width: "70px",
      height: "70px"
    }),
    []
  );

  // Format duration from seconds to mm:ss
  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const onPlayPauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audio.id && audio.details?.src) {
      handlePlayPause(audio.id, audio.details.src);
    }
  };

  const onAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleAddAudio(audio);
  };

  return (
    <Draggable
      data={audio}
      renderCustomPreview={<div style={style} />}
      shouldDisplayPreview={shouldDisplayPreview}
    >
      <div
        draggable={false}
        style={{
          display: "grid",
          gridTemplateColumns: "48px 1fr auto"
        }}
        className="flex gap-4 py-1 text-sm rounded-lg hover:bg-[#fb923c]/10 transition-colors group"
      >
        <button
          onClick={onPlayPauseClick}
          className="flex h-12 items-center justify-center bg-muted/50 rounded-lg border border-white/[0.06] hover:border-[#fb923c]/50 hover:bg-[#fb923c]/20 transition-all cursor-pointer"
        >
          {isPlaying ? (
            <Pause width={16} className="text-[#fb923c]" />
          ) : (
            <Play width={16} className="text-muted-foreground group-hover:text-[#fb923c] transition-colors" />
          )}
        </button>
        <div className="flex flex-col justify-center overflow-hidden">
          <div className={`transition-colors truncate ${isPlaying ? "text-[#fb923c]" : "text-zinc-200 group-hover:text-[#fb923c]"}`}>
            {audio.name}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-400 truncate">{audio.metadata?.author}</span>
            {audio.metadata?.duration && (
              <span className="text-zinc-500">
                {formatDuration(audio.metadata.duration)}
              </span>
            )}
          </div>
          {audio.metadata?.mood && (
            <div className="text-xs text-zinc-500 truncate">{audio.metadata.mood}</div>
          )}
        </div>
        <button
          onClick={onAddClick}
          className="flex h-12 w-8 items-center justify-center opacity-0 group-hover:opacity-100 hover:text-[#fb923c] transition-all cursor-pointer"
          title="Add to timeline"
        >
          <Plus width={16} className="text-zinc-400 hover:text-[#fb923c]" />
        </button>
      </div>
    </Draggable>
  );
};
