import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ChevronDown, Pause, Play } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Voice, VoiceFilters } from "../interfaces/editor";
import { dispatch } from "@designcombo/events";
import { ADD_AUDIO, EDIT_OBJECT } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import useStore from "../store/use-store";

export const AiVoice = () => {
  const { trackItemsMap } = useStore();
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<VoiceFilters>({
    language: "all",
    gender: "all"
  });
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
    null
  );
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Find existing AI voice track (first one)
  const existingAiVoice = useMemo(() => {
    const aiVoices = Object.values(trackItemsMap).filter(
      (item: any) => item.type === "audio" && item.metadata?.voiceId
    );
    return aiVoices.length > 0 ? (aiVoices[0] as any) : null;
  }, [trackItemsMap]);

  // Populate text field with existing narration when component loads or track changes
  useEffect(() => {
    if (existingAiVoice?.metadata?.generatedText && !text) {
      setText(existingAiVoice.metadata.generatedText);
    }
  }, [existingAiVoice?.id]);

  // Also set the voice if we have an existing track
  useEffect(() => {
    if (existingAiVoice?.metadata?.voiceId && voices.length > 0 && !selectedVoice) {
      const matchingVoice = voices.find(v => v.id === existingAiVoice.metadata.voiceId);
      if (matchingVoice) {
        setSelectedVoice(matchingVoice);
      }
    }
  }, [existingAiVoice?.metadata?.voiceId, voices]);

  // Available filter options
  const filterOptions = {
    language: [
      "en", "hi", "es", "pl", "fr", "de", "tr", "hu", "it", "ru", "hr", "zh",
      "fil", "el", "fi", "ko", "no", "ta", "id", "ar", "ja", "ro", "pt", "cs",
      "vi", "sv", "nl", "da"
    ],
    gender: ["female", "male", "neutral"]
  };

  // Language display names
  const languageNames: Record<string, string> = {
    en: "English", hi: "Hindi", es: "Spanish", pl: "Polish", fr: "French",
    de: "German", tr: "Turkish", hu: "Hungarian", it: "Italian", ru: "Russian",
    hr: "Croatian", zh: "Chinese", fil: "Filipino", el: "Greek", fi: "Finnish",
    ko: "Korean", no: "Norwegian", ta: "Tamil", id: "Indonesian", ar: "Arabic",
    ja: "Japanese", ro: "Romanian", pt: "Portuguese", cs: "Czech", vi: "Vietnamese",
    sv: "Swedish", nl: "Dutch", da: "Danish"
  };

  // Handle play/pause for a specific voice
  const handlePlayPause = (voiceId: string, previewUrl: string) => {
    if (currentlyPlayingId === voiceId) {
      if (audioElement) {
        audioElement.pause();
        setCurrentlyPlayingId(null);
        setAudioElement(null);
      }
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const newAudio = new Audio(previewUrl);
    newAudio.addEventListener("ended", () => {
      setCurrentlyPlayingId(null);
      setAudioElement(null);
    });

    newAudio.play();
    setCurrentlyPlayingId(voiceId);
    setAudioElement(newAudio);
  };

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  // Fetch voices from API
  const fetchVoices = async (queryParams?: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/voices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          limit: 20,
          page: 1,
          query: queryParams || {}
        })
      });

      if (response.ok) {
        const data = await response.json();
        setVoices(data.voices || []);
      } else {
        console.error("Failed to fetch voices");
      }
    } catch (error) {
      console.error("Error fetching voices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load voices on component mount
  useEffect(() => {
    fetchVoices();
  }, []);

  // Apply filters automatically when filters change
  const applyFilters = (newFilters: VoiceFilters) => {
    const queryParams: any = {};
    if (newFilters.language && newFilters.language !== "all")
      queryParams.languages = [newFilters.language];
    if (newFilters.gender && newFilters.gender !== "all")
      queryParams.genders = [newFilters.gender];
    fetchVoices(queryParams);
  };

  const handleGenerate = async () => {
    if (!text.trim() || !selectedVoice) return;

    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: selectedVoice.id,
          folder: "ai-voice-generations"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.agent?.url || data.url) {
        const audioUrl = data.agent?.url || data.url;
        console.log("Generated audio URL:", audioUrl);

        // If there's an existing AI voice track, update it instead of creating new
        if (existingAiVoice) {
          dispatch(EDIT_OBJECT, {
            payload: {
              [existingAiVoice.id]: {
                details: {
                  ...existingAiVoice.details,
                  src: audioUrl
                },
                metadata: {
                  ...existingAiVoice.metadata,
                  voiceId: selectedVoice.id,
                  voiceName: selectedVoice.name,
                  generatedText: text.trim()
                }
              }
            }
          });
          toast.success("Voice regenerated successfully!");
        } else {
          // Add new audio to the timeline
          const audioPayload = {
            id: generateId(),
            name: `AI Voice - ${selectedVoice.name.split(' - ')[0]}`,
            type: 'audio' as const,
            details: {
              src: audioUrl,
              volume: 100,
            },
            metadata: {
              voiceId: selectedVoice.id,
              voiceName: selectedVoice.name,
              generatedText: text.trim(),
            },
          };

          dispatch(ADD_AUDIO, {
            payload: audioPayload,
            options: {},
          });
          toast.success("Voice generated and added to timeline!");
        }
      } else {
        toast.error("Voice generation completed but no audio URL received");
      }
    } catch (error) {
      console.error("Error generating voice:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate voice. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col max-w-full">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        AI Voice Generation
      </div>

      <div className="space-y-4 p-4">
        {/* Script Input */}
        <div className="space-y-2">
          <Label className="font-sans text-xs font-semibold">
            Enter your script
          </Label>
          {existingAiVoice?.metadata?.voiceName && (
            <p className="text-xs text-muted-foreground">
              Current voice: {existingAiVoice.metadata.voiceName}
            </p>
          )}

          <Textarea
            id="text-input"
            placeholder="Type or paste your text here to generate AI voice..."
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setText(e.target.value)
            }
            className="min-h-[120px] resize-none"
            disabled={isGenerating}
          />
        </div>

        {/* Voice Selection */}
        <div className="space-y-3">
          <div className="flex gap-2 min-w-0 flex-col">
            <Label className="font-sans text-xs font-semibold">
              Select voice
            </Label>
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                {selectedVoice ? (
                  (() => {
                    const displayName = selectedVoice.name.split("-")[0].trim();
                    return (
                      <button
                        aria-label="Change selected voice"
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest(
                              ".voice-preview-btn"
                            )
                          )
                            return;
                        }}
                        className="w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08] hover:border-[#00d8d6]/30 hover:bg-[#00d8d6]/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="h-5 w-5 flex-shrink-0 flex items-center justify-center hover:text-[#00d8d6] voice-preview-btn cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayPause(
                                selectedVoice.id,
                                selectedVoice.previewUrl
                              );
                            }}
                          >
                            {currentlyPlayingId === selectedVoice.id ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </span>
                          <span className="truncate">{displayName}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      </button>
                    );
                  })()
                ) : (
                  <button className="w-full flex items-center justify-between h-9 px-3 rounded-lg text-sm bg-white/[0.03] border border-white/[0.08] hover:border-[#00d8d6]/30 hover:bg-[#00d8d6]/5 transition-colors">
                    <span className="truncate text-muted-foreground">Select voice</span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </button>
                )}
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                className="w-[420px] max-h-[500px] overflow-hidden p-0 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#00d8d6]/20 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(0,216,214,0.1)]"
                align="start"
              >
                <div className="space-y-4">
                  {/* Filters Row */}
                  <div className="flex gap-2 mb-2 p-2">
                    <Select
                      value={filters.language}
                      onValueChange={(value) => {
                        const newFilters = { ...filters, language: value };
                        setFilters(newFilters);
                        applyFilters(newFilters);
                      }}
                    >
                      <SelectTrigger id="language-select" className="w-1/2">
                        <span className="flex items-center gap-2">
                          <span className="fi fi-{filters.language}" />
                          <SelectValue placeholder="Language" />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Languages</SelectItem>
                        {filterOptions.language.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {languageNames[lang] || lang}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filters.gender}
                      onValueChange={(value) => {
                        const newFilters = { ...filters, gender: value };
                        setFilters(newFilters);
                        applyFilters(newFilters);
                      }}
                    >
                      <SelectTrigger id="gender-select" className="w-1/2">
                        <SelectValue placeholder="Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Gender</SelectItem>
                        {filterOptions.gender.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender.charAt(0).toUpperCase() + gender.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Voice List */}
                  <ScrollArea className="h-[400px] pr-2 text-sm">
                    <div className="flex flex-col gap-1">
                      {voices.map((voice) => {
                        const isRowSelected = selectedVoice?.id === voice.id;
                        return (
                          <div
                            key={voice.id}
                            className={`flex items-center px-2 rounded-lg py-2 cursor-pointer transition-colors ${isRowSelected ? "bg-[#00d8d6]/20 text-[#00d8d6] border border-[#00d8d6]/30" : "hover:bg-[#00d8d6]/10 text-white/90 border border-transparent"}`}
                            onClick={() => {
                              setSelectedVoice(voice);
                              setIsPopoverOpen(false);
                            }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={`flex-shrink-0 ${isRowSelected ? "bg-[#00d8d6]/20 text-[#00d8d6]" : "text-white/60 hover:text-[#00d8d6] hover:bg-[#00d8d6]/10"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPause(voice.id, voice.previewUrl);
                                  }}
                                >
                                  {currentlyPlayingId === voice.id ? (
                                    <Pause className="h-5 w-5" />
                                  ) : (
                                    <Play className="h-5 w-5" />
                                  )}
                                </Button>
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const parts = voice.name.split(" - ");
                                    const name = parts[0];
                                    const description = parts[1];
                                    return (
                                      <div className="truncate">
                                        <span>{name}</span>
                                        {description && (
                                          <span className="text-muted-foreground">
                                            {" "}- {description}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-md"
                                >
                                  {voice.gender.charAt(0).toUpperCase() + voice.gender.slice(1)}
                                </Badge>
                                {voice.age && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-md"
                                  >
                                    {voice.age.charAt(0).toUpperCase() + voice.age.slice(1)}
                                  </Badge>
                                )}
                                {voice.useCase && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-md"
                                  >
                                    {voice.useCase}
                                  </Badge>
                                )}
                                {voice.category && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-white/[0.06] border border-white/[0.08] text-white/70 rounded-md"
                                  >
                                    {voice.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {voices.length === 0 && !loading && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No voices found. Try adjusting your filters.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={handleGenerate}
            disabled={!text.trim() || !selectedVoice || isGenerating}
            className="flex items-center gap-2 w-full bg-gradient-to-r from-[#00d8d6] to-[#8b5cf6] text-white hover:shadow-[0_0_20px_rgba(0,216,214,0.3)] transition-all duration-300"
            size={"sm"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : existingAiVoice ? (
              "Regenerate Voice"
            ) : (
              "Generate Voice"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
