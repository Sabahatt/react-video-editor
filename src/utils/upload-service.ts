import axios from "axios";

export type UploadProgressCallback = (
  uploadId: string,
  progress: number
) => void;

export type UploadStatusCallback = (
  uploadId: string,
  status: "uploaded" | "failed",
  error?: string
) => void;

export interface UploadCallbacks {
  onProgress: UploadProgressCallback;
  onStatus: UploadStatusCallback;
}

export async function processFileUpload(
  uploadId: string,
  file: File,
  callbacks: UploadCallbacks,
  thumbnail?: string
): Promise<any> {
  try {
    // Use local upload endpoint
    const formData = new FormData();
    formData.append("file", file);

    const {
      data: { uploads }
    } = await axios.post("/api/uploads/local", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent) => {
        const percent = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        callbacks.onProgress(uploadId, percent);
      }
    });

    const uploadInfo = uploads[0];

    // Construct upload data from uploadInfo
    const uploadData = {
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: file.size,
      contentType: uploadInfo.contentType,
      metadata: {
        uploadedUrl: uploadInfo.url,
        ...(thumbnail && { thumbnail })
      },
      folder: uploadInfo.folder || null,
      type: uploadInfo.contentType.split("/")[0],
      method: "direct",
      origin: "user",
      status: "uploaded",
      isPreview: false
    };

    callbacks.onStatus(uploadId, "uploaded");
    return uploadData;
  } catch (error) {
    callbacks.onStatus(uploadId, "failed", (error as Error).message);
    throw error;
  }
}

export async function processUrlUpload(
  uploadId: string,
  url: string,
  callbacks: UploadCallbacks
): Promise<any[]> {
  try {
    // Start with 10% progress
    callbacks.onProgress(uploadId, 10);

    // Upload URL
    const { data: { uploads = [] } = {} } = await axios.post(
      "/api/uploads/url",
      {
        userId: "PJ1nkaufw0hZPyhN7bWCP",
        urls: [url]
      },
      {
        headers: { "Content-Type": "application/json" }
      }
    );

    // Update to 50% progress
    callbacks.onProgress(uploadId, 50);

    // Construct upload data from uploads array
    const uploadDataArray = uploads.map((uploadInfo: any) => ({
      fileName: uploadInfo.fileName,
      filePath: uploadInfo.filePath,
      fileSize: 0,
      contentType: uploadInfo.contentType,
      metadata: { originalUrl: uploadInfo.originalUrl },
      folder: uploadInfo.folder || null,
      type: uploadInfo.contentType.split("/")[0],
      method: "url",
      origin: "user",
      status: "uploaded",
      isPreview: false
    }));

    // Complete
    callbacks.onProgress(uploadId, 100);
    callbacks.onStatus(uploadId, "uploaded");
    return uploadDataArray;
  } catch (error) {
    callbacks.onStatus(uploadId, "failed", (error as Error).message);
    throw error;
  }
}

export async function processUpload(
  uploadId: string,
  upload: { file?: File; url?: string; thumbnail?: string },
  callbacks: UploadCallbacks
): Promise<any> {
  if (upload.file) {
    return await processFileUpload(uploadId, upload.file, callbacks, upload.thumbnail);
  }
  if (upload.url) {
    return await processUrlUpload(uploadId, upload.url, callbacks);
  }
  callbacks.onStatus(uploadId, "failed", "No file or URL provided");
  throw new Error("No file or URL provided");
}
