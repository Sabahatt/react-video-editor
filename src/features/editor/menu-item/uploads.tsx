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
import { Button } from "@/components/ui/button";
import useUploadStore from "../store/use-upload-store";
import ModalUpload from "@/components/modal-upload";

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

  const handleAddVideo = (video: any) => {
    const srcVideo = video.metadata?.uploadedUrl || video.url;

    dispatch(ADD_VIDEO, {
      payload: {
        id: generateId(),
        details: {
          src: srcVideo
        },
        metadata: {
          previewUrl:
            "https://cdn.designcombo.dev/caption_previews/static_preset1.webp"
        }
      },
      options: {
        resourceId: "main",
        scaleMode: "fit"
      }
    });
  };

  const handleAddImage = (image: any) => {
    const srcImage = image.metadata?.uploadedUrl || image.url;

    dispatch(ADD_IMAGE, {
      payload: {
        id: generateId(),
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

  const handleAddAudio = (audio: any) => {
    const srcAudio = audio.metadata?.uploadedUrl || audio.url;
    dispatch(ADD_AUDIO, {
      payload: {
        id: generateId(),
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
      <Button
        className="w-full cursor-pointer"
        onClick={() => setShowUploadModal(true)}
      >
        <UploadIcon className="w-4 h-4" />
        <span className="ml-2">Upload</span>
      </Button>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="text-text-primary flex h-12 flex-none items-center px-4 text-sm font-medium">
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
                const previewUrl = video.metadata?.previewUrl || video.metadata?.thumbnail || video.preview;
                const videoUrl = video.metadata?.uploadedUrl || video.url || video.filePath;
                return (
                  <div
                    className="flex items-center gap-2 flex-col w-full group"
                    key={video.id || `video-${idx}`}
                  >
                    <Card
                      className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted"
                      onClick={() => handleAddVideo(video)}
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Video thumbnail"
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
                      {video.file?.name || (videoUrl ? "Video" : "Video")}
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
                      className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted"
                      onClick={() => handleAddImage(image)}
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
                      {image.file?.name || image.metadata?.alt || "Image"}
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
              {audios.map((audio, idx) => (
                <div
                  className="flex items-center gap-2 flex-col w-full group"
                  key={audio.id || `audio-${idx}`}
                >
                  <Card
                    className="w-16 h-16 flex items-center justify-center overflow-hidden relative cursor-pointer bg-muted"
                    onClick={() => handleAddAudio(audio)}
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
                    {audio.file?.name || audio.fileName || "Audio"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </ScrollArea>
    </div>
  );
};
