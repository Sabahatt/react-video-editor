import React, { useState, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X, Upload, ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { dispatch } from "@designcombo/events";
import { ADD_VIDEO } from "@designcombo/state";
import { generateId } from "@designcombo/timeline";
import useStore from "../store/use-store";
import { ITrackItem } from "@designcombo/types";

const MAX_PROMPT_LENGTH = 2000;

export const AiVideo = () => {
  const { trackItemsMap } = useStore();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    name: string;
    file?: File;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get images from timeline for quick selection
  const timelineImages = useMemo(() => {
    return Object.values(trackItemsMap).filter(
      (item: ITrackItem) => item.type === "image"
    ) as ITrackItem[];
  }, [trackItemsMap]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      const url = URL.createObjectURL(file);
      setSelectedImage({ url, name: file.name, file });
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      const url = URL.createObjectURL(file);
      setSelectedImage({ url, name: file.name, file });
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleRemoveImage = useCallback(() => {
    if (selectedImage?.url && selectedImage.file) {
      URL.revokeObjectURL(selectedImage.url);
    }
    setSelectedImage(null);
  }, [selectedImage]);

  const selectTimelineImage = useCallback((item: ITrackItem) => {
    setSelectedImage({
      url: item.details.src,
      name: item.name || "Timeline Image"
    });
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage || !prompt.trim()) {
      toast.error("Please select an image and enter a prompt");
      return;
    }

    setIsGenerating(true);

    try {
      // Prepare the image URL or upload the file
      let imageUrl = selectedImage.url;

      if (selectedImage.file) {
        // Upload the file first
        const formData = new FormData();
        formData.append("file", selectedImage.file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload image");
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const response = await fetch("/api/generate-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imageUrl,
          prompt: prompt.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.videoUrl || data.url) {
        const videoUrl = data.videoUrl || data.url;

        // Add generated video to timeline
        const videoPayload = {
          id: generateId(),
          name: `AI Video - ${prompt.slice(0, 30)}...`,
          type: 'video' as const,
          details: {
            src: videoUrl
          },
          metadata: {
            sourceImage: imageUrl,
            prompt: prompt.trim(),
            generatedAt: new Date().toISOString()
          }
        };

        dispatch(ADD_VIDEO, {
          payload: videoPayload,
          options: {}
        });

        toast.success("Video generated and added to timeline!");
        setPrompt("");
        handleRemoveImage();
      } else {
        toast.error("Video generation completed but no video URL received");
      }
    } catch (error) {
      console.error("Error generating video:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate video. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col max-w-full">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
        AI Video Generation
      </div>

      <div className="space-y-4 p-4">
        {/* Input Section */}
        <div className="space-y-2">
          <Label className="font-sans text-xs font-semibold">Input</Label>

          {selectedImage ? (
            <div className="relative group">
              <div className="relative rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                <img
                  src={selectedImage.url}
                  alt={selectedImage.name}
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 text-xs text-white/80 truncate max-w-[80%]">
                  {selectedImage.name}
                </div>
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-colors"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex flex-col items-center justify-center gap-2 h-36 rounded-lg border border-dashed border-white/[0.15] bg-white/[0.02] hover:border-[#fb923c]/40 hover:bg-[#fb923c]/5 transition-colors cursor-pointer"
            >
              <div className="p-3 rounded-full bg-white/[0.05]">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground text-center px-4">
                Click or drag image here
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Timeline Images Quick Select */}
        {timelineImages.length > 0 && !selectedImage && (
          <div className="space-y-2">
            <Label className="font-sans text-xs font-semibold text-muted-foreground">
              Or select from timeline
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {timelineImages.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectTimelineImage(item)}
                  className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border border-white/[0.08] hover:border-[#fb923c]/40 transition-colors"
                >
                  <img
                    src={item.details.src}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt Section */}
        <div className="space-y-2">
          <Label className="font-sans text-xs font-semibold">Prompt</Label>
          <div className="relative">
            <Textarea
              placeholder="Describe the motion you want to see..."
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                if (e.target.value.length <= MAX_PROMPT_LENGTH) {
                  setPrompt(e.target.value);
                }
              }}
              className="min-h-[100px] resize-none pr-16 pb-8"
              disabled={isGenerating}
            />
            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!selectedImage || !prompt.trim() || isGenerating}
          className="flex items-center gap-2 w-full bg-gradient-to-r from-[#fb923c] to-[#f472b6] text-white hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all duration-300 disabled:opacity-50"
          size="sm"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Video"
          )}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          Transform your image into a dynamic video with AI
        </p>
      </div>
    </div>
  );
};
