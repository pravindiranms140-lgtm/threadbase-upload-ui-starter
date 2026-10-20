import { useEffect, useState, useRef } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(candidate) {
    setError("");
    setUploadedUrl("");
    setProgress(0);
    if (!candidate) return;

    if (!ALLOWED.includes(candidate.type)) {
      setFile(null);
      setError("Please choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (candidate.size > MAX_SIZE) {
      setFile(null);
      setError("Image must be 5MB or smaller.");
      return;
    }
    setFile(candidate);
  }

  function onDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    chooseFile(event.dataTransfer.files?.[0]);
  }

  async function upload() {
    if (!file || isUploading) return;
    setError("");
    setProgress(0);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });
      setProgress(100);
      setUploadedUrl(response.data?.url || response.data?.avatarUrl || "");
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.message ||
          uploadError.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onChange={(event) => {
            chooseFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>

      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="Selected avatar preview" />
          <p>{file.name}</p>
        </div>
      )}

      {error && <p className="error" role="alert">{error}</p>}

      {isUploading || progress > 0 ? (
        <div
          className="bar"
          role="progressbar"
          aria-label="Upload progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>
      ) : null}

      {uploadedUrl && (
        <p role="status">
          Upload complete.{" "}
          <a href={uploadedUrl} target="_blank" rel="noreferrer">
            View uploaded image
          </a>
        </p>
      )}

      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
