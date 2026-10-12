import { useState, useRef, useEffect } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const inputRef = useRef(null);

  // Validate file before any network request
  function validate(selectedFile) {
    if (!ALLOWED.includes(selectedFile.type)) {
      return "Only image files are allowed";
    }

    if (selectedFile.size > MAX_SIZE) {
      return "File is too large (max 5MB)";
    }

    return null;
  }

  // Handle selected file from input or drop
  function handleFile(selectedFile) {
    if (!selectedFile) return;

    const validationError = validate(selectedFile);

    if (validationError) {
      setError(validationError);
      setFile(null);
      setProgress(0);
      setUploadedUrl(null);
      return;
    }

    setError("");
    setFile(selectedFile);
    setProgress(0);
    setUploadedUrl(null);
  }

  // Drag over handler
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  // Drag leave handler
  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  // Drop handler
  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFile(droppedFile);
    }
  }

  // Local preview URL creation and cleanup
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Upload file with FormData and Axios progress
  async function upload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setIsUploading(true);
      setError("");

      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
          }
        },
      });

      setUploadedUrl(response.data.url);
    } catch (err) {
      setError(err.response?.data?.error || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={isDragging ? "drop-zone dragging" : "drop-zone"}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <p>Drag an image here, or click to choose</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {preview && (
        <div style={{ marginTop: "1rem" }}>
          <img src={preview} alt="Avatar preview" className="preview" />
        </div>
      )}

      {progress > 0 && (
        <div>
          <div className="bar">
            <div className="fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{progress}%</p>
        </div>
      )}

      {uploadedUrl && (
        <p style={{ color: "#16a34a", fontSize: "0.875rem", margin: "0.75rem 0" }}>
          Uploaded: <a href={`http://localhost:3001${uploadedUrl}`} target="_blank" rel="noreferrer">{uploadedUrl}</a>
        </p>
      )}

      <button
        style={{ marginTop: "1rem" }}
        onClick={upload}
        disabled={!file || isUploading}
      >
        {isUploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
}
