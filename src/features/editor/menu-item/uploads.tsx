import { ADD_AUDIO, ADD_IMAGE, ADD_VIDEO } from "@designcombo/state";
import { dispatch } from "@designcombo/events";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import {
  Music,
  Image as ImageIcon,
  Video as VideoIcon,
  Loader2,
  UploadIcon,
  X
} from "lucide-react";
import { generateId } from "@designcombo/timeline";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";
import { useState, useEffect } from "react";
import { getMediaDisplayName } from "../utils/file";

// Simple thumbnail component - tries static image first, falls back to video extraction
function VideoThumbnailWithFallback({
  thumbnailUrl,
  videoUrl,
  className
}: {
  thumbnailUrl?: string | null;
  videoUrl: string;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  // If we have a thumbnail URL and it hasn't failed, try to load it
  if (thumbnailUrl && !imgFailed) {
    return (
      <img
        src={thumbnailUrl}
        alt="Video thumbnail"
        className={className}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Fallback to extracting frame from video
  return <VideoThumbnail src={videoUrl} className={className} />;
}

// Component to extract and display a video frame as thumbnail
function VideoThumbnail({ src, className }: { src: string; className?: string }) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!src) {
      setStatus("error");
      return;
    }

    let isMounted = true;
    setStatus("loading");
    setThumbnailUrl(null);

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // Only set crossOrigin for external URLs
    if (src.startsWith("http") && !src.startsWith(window.location.origin)) {
      video.crossOrigin = "anonymous";
    }

    const captureFrame = () => {
      if (!isMounted || video.videoWidth === 0 || video.videoHeight === 0) return false;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

        if (dataUrl.length > 1000 && isMounted) {
          setThumbnailUrl(dataUrl);
          setStatus("success");
          return true;
        }
      } catch {
        // Canvas tainted
      }
      return false;
    };

    video.oncanplay = () => {
      video.currentTime = Math.min(1, video.duration * 0.25);
    };

    video.onseeked = () => {
      if (!captureFrame() && isMounted) {
        setStatus("error");
      }
    };

    video.onerror = () => {
      if (isMounted) setStatus("error");
    };

    video.src = src;

    const timeout = setTimeout(() => {
      if (isMounted) {
        setStatus((current) => current === "loading" ? "error" : current);
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      video.pause();
      video.src = "";
    };
  }, [src]);

  if (status === "loading") {
    return <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />;
  }

  if (status === "error" || !thumbnailUrl) {
    return <VideoIcon className="w-8 h-8 text-muted-foreground" />;
  }

  return <img src={thumbnailUrl} alt="Video thumbnail" className={className} />;
}

export const Uploads = () => {
  const { setShowUploadModal, uploads, pendingUploads, activeUploads, deleteUpload } =
    useUploadStore();

  // Helper to determine the media type of an upload
  const getMediaType = (upload: any): "video" | "image" | "audio" | "unknown" => {
    const type = upload.type?.toLowerCase() || "";
    const contentType = upload.contentType?.toLowerCase() || "";

    // Check audio first (highest priority to fix audio appearing in images)
    if (type === "audio" || type.startsWith("audio/") || contentType.startsWith("audio/")) {
      return "audio";
    }
    // Check video
    if (type === "video" || type.startsWith("video/") || contentType.startsWith("video/")) {
      return "video";
    }
    // Check image
    if (type === "image" || type.startsWith("image/") || contentType.startsWith("image/")) {
      return "image";
    }
    return "unknown";
  };

  // Group completed uploads by type (mutually exclusive)
  const videos = uploads.filter((upload) => getMediaType(upload) === "video");
  const images = uploads.filter((upload) => getMediaType(upload) === "image");
  const audios = uploads.filter((upload) => getMediaType(upload) === "audio");

  const handleAddVideo = (video: any, index: number) => {
    const srcVideo = video.metadata?.uploadedUrl || video.url;
    // Derive thumbnail URL from video filename (FFmpeg format: thumb-{timestamp}-{name}.jpg)
    const derivedThumbnail = srcVideo?.startsWith("/uploads/")
      ? `/uploads/thumb-${srcVideo.replace("/uploads/", "").replace(/\.[^.]+$/, ".jpg")}`
      : null;
    const previewUrl = video.metadata?.thumbnail || video.metadata?.previewUrl || derivedThumbnail || srcVideo;
    const displayName = getMediaDisplayName(video.file, srcVideo, "Video", index);

    dispatch(ADD_VIDEO, {
      payload: {
        id: generateId(),
        name: displayName,
        details: {
          src: srcVideo
        },
        metadata: {
          previewUrl
        }
      },
      options: {
        resourceId: "main",
        scaleMode: "fit"
      }
    });
  };

  const handleAddImage = (image: any, index: number) => {
    const srcImage = image.metadata?.uploadedUrl || image.url;
    const displayName = getMediaDisplayName(image.file, srcImage, "Image", index);

    dispatch(ADD_IMAGE, {
      payload: {
        id: generateId(),
        name: displayName,
        type: "image",
        display: {
          from: 0,
          to: 5000
        },
        details: {
          src: srcImage
        },
        metadata: {}
      },
      options: {}
    });
  };

  const handleAddAudio = (audio: any, index: number) => {
    const srcAudio = audio.metadata?.uploadedUrl || audio.url;
    const displayName = getMediaDisplayName(audio.file, srcAudio, "Audio", index);

    dispatch(ADD_AUDIO, {
      payload: {
        id: generateId(),
        name: displayName,
        type: "audio",
        details: {
          src: srcAudio
        },
        metadata: {}
      },
      options: {}
    });
  };

  const UploadPrompt = () => (
    <div className="flex items-center justify-center px-4">
      <button
        className="w-full cursor-pointer py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[#fb923c] to-[#f472b6] hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all duration-300 flex items-center justify-center gap-2"
        onClick={() => setShowUploadModal(true)}
      >
        <UploadIcon className="w-4 h-4" />
        <span>Upload</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="text-zinc-200 flex h-12 flex-none items-center px-4 text-sm font-medium">
        Your uploads
      </div>
      <ModalUpload />
      <UploadPrompt />

      <ScrollArea className="flex-1 min-h-0">
      {/* Uploads in Progress Section */}
      {(pendingUploads.length > 0 || activeUploads.length > 0) && (
        <div className="p-4">
          <div className="font-medium text-sm mb-2 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            Uploads in Progress
          </div>
          <div className="flex flex-col gap-2">
            {pendingUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-2">
                <span className="truncate text-xs flex-1">
                  {upload.file?.name || upload.url || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground">Pending</span>
              </div>
            ))}
            {activeUploads.map((upload) => (
              <div key={upload.id} className="flex items-center gap-2">
                <span className="truncate text-xs flex-1">
                  {upload.file?.name || upload.url || "Unknown"}
                </span>
                <div className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  <span className="text-xs">{upload.progress ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {upload.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 p-4">
        {/* Videos Section */}
        {videos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <VideoIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Videos</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {videos.map((video, idx) => {
                // Get video URL from any available source
                const videoUrl = video.metadata?.uploadedUrl || video.url || video.filePath || video.metadata?.url;
                // Derive thumbnail URL from video filename (FFmpeg format: thumb-{timestamp}-{name}.jpg)
                const derivedThumbnail = videoUrl?.startsWith("/uploads/")
                  ? `/uploads/thumb-${videoUrl.replace("/uploads/", "").replace(/\.[^.]+$/, ".jpg")}`
                  : null;
                // Priority: explicit thumbnail > derived thumbnail > fallback to video extraction
                const previewUrl = video.metadata?.thumbnail || derivedThumbnail;

                return (
                  <div
                    className="flex items-center gap-2 flex-col w-full group"
                    key={video.id || `video-${idx}`}
                  >
                    <Card
                      className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted/50 border-white/[0.06] hover:border-[#fb923c]/30 hover:shadow-[0_0_10px_rgba(251,146,60,0.1)] transition-all"
                      onClick={() => handleAddVideo(video, idx)}
                    >
                      {videoUrl ? (
                        <VideoThumbnailWithFallback
                          key={`thumb-${videoUrl}`}
                          thumbnailUrl={previewUrl}
                          videoUrl={videoUrl}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <VideoIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                      <button
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUpload(video.id || video.fileName);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Card>
                    <div className="text-xs text-muted-foreground truncate w-full text-center">
                      {getMediaDisplayName(video.file, videoUrl, "Video", idx)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Images Section */}
        {images.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Images</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map((image, idx) => {
                const imageUrl = image.metadata?.uploadedUrl || image.url || image.filePath;
                return (
                  <div
                    className="flex items-center gap-2 flex-col w-full group"
                    key={image.id || `image-${idx}`}
                  >
                    <Card
                      className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted/50 border-white/[0.06] hover:border-[#fb923c]/30 hover:shadow-[0_0_10px_rgba(251,146,60,0.1)] transition-all"
                      onClick={() => handleAddImage(image, idx)}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={image.metadata?.alt || "Image thumbnail"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                      <button
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUpload(image.id || image.fileName);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Card>
                    <div className="text-xs text-muted-foreground truncate w-full text-center">
                      {getMediaDisplayName(image.file, imageUrl, "Image", idx)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Audios Section */}
        {audios.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Audios</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {audios.map((audio, idx) => {
                const audioUrl = audio.metadata?.uploadedUrl || audio.url || audio.filePath;
                return (
                  <div
                    className="flex items-center gap-2 flex-col w-full group"
                    key={audio.id || `audio-${idx}`}
                  >
                    <Card
                      className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted/50 border-white/[0.06] hover:border-[#fb923c]/30 hover:shadow-[0_0_10px_rgba(251,146,60,0.1)] transition-all"
                      onClick={() => handleAddAudio(audio, idx)}
                    >
                      <Music className="w-8 h-8 text-muted-foreground" />
                      <button
                        className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteUpload(audio.id || audio.fileName);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Card>
                    <div className="text-xs text-muted-foreground truncate w-full text-center">
                      {getMediaDisplayName(audio.file, audioUrl, "Audio", idx)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </ScrollArea>
    </div>
  );
};
