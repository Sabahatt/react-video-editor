export const getBlobFromUrl = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return blob;
};

export const getFileFromUrl = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const filename = url.split("/").pop() || "video.mp4";
  const file = new File([blob], filename);
  return file;
};

export const fileToBlob = async (file: File) => {
  const blob = await new Response(file.stream()).blob();
  return blob;
};

export const blobToStream = async (blob: Blob) => {
  const file = new File([blob], "video.mp4");
  const stream = file.stream();
  return stream;
};

export const getStreamFromUrl = async (url: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], "video.mp4");
  const stream = file.stream();
  return stream;
};

/**
 * Extracts a display name from a File object, original filename, or URL.
 * Returns filename without extension for cleaner display.
 * Falls back to type + counter format if no filename available.
 *
 * @param originalFileName - The original filename stored during upload (highest priority)
 * @param file - File object (for active uploads)
 * @param url - URL to extract filename from (lowest priority)
 * @param fallbackType - Type for fallback naming
 * @param index - Index for fallback naming
 */
export const getMediaDisplayName = (
  originalFileName?: string | null,
  file?: File | null,
  url?: string | null,
  fallbackType?: "Video" | "Image" | "Audio",
  index?: number
): string => {
  // Try stored original filename first (from upload data)
  if (originalFileName) {
    return removeExtension(originalFileName);
  }

  // Try to get name from File object (for active uploads)
  if (file?.name) {
    return removeExtension(file.name);
  }

  // Try to extract from URL
  if (url) {
    const filename = extractFilenameFromUrl(url);
    if (filename) {
      return removeExtension(filename);
    }
  }

  // Fallback to type + index
  if (fallbackType) {
    return index !== undefined ? `${fallbackType} ${index + 1}` : fallbackType;
  }

  return "Untitled";
};

/**
 * Removes file extension from a filename
 */
const removeExtension = (filename: string): string => {
  const lastDotIndex = filename.lastIndexOf(".");
  if (lastDotIndex > 0) {
    return filename.substring(0, lastDotIndex);
  }
  return filename;
};

/**
 * Extracts filename from a URL path
 */
const extractFilenameFromUrl = (url: string): string | null => {
  try {
    // Handle blob URLs - they don't have meaningful filenames
    if (url.startsWith("blob:")) {
      return null;
    }

    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];

    // Check if it looks like a filename (has extension)
    if (lastSegment && /\.\w+$/.test(lastSegment)) {
      // Decode URI components for proper display
      return decodeURIComponent(lastSegment);
    }

    return null;
  } catch {
    // If URL parsing fails, try simple string extraction
    const segments = url.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && /\.\w+$/.test(lastSegment)) {
      return lastSegment.split("?")[0]; // Remove query params
    }
    return null;
  }
};
