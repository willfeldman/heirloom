"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Video, Square, Pause, Play, Upload, Trash2 } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { api, errorMessage } from "@/lib/client";
import { MAX_MEDIA_SIZE, mediaTypes } from "@/lib/validation";
import type { Media } from "@/lib/types";
import { Spinner } from "./ui";
export function Recorder({
  userId,
  questionId,
  guestToken,
  onUpload,
  disabled = false,
}: {
  userId?: string;
  questionId?: string;
  guestToken?: string;
  onUpload: (media: Media) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false),
    [paused, setPaused] = useState(false),
    [seconds, setSeconds] = useState(0),
    [mode, setMode] = useState<"audio" | "video">("audio"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    chunks = useRef<Blob[]>([]),
    liveVideo = useRef<HTMLVideoElement>(null),
    fileInput = useRef<HTMLInputElement>(null),
    timer = useRef<ReturnType<typeof setInterval> | null>(null),
    elapsed = useRef(0);
  function stop() {
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    stream.current?.getTracks().forEach((t) => t.stop());
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    setPaused(false);
  }
  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.onstop = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      stream.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (liveVideo.current) liveVideo.current.srcObject = stream.current;
  }, [recording]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function start() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Recording requires HTTPS and a supported browser. You can also upload an existing recording.",
        );
      const devices = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video" ? { width: { ideal: 640 }, height: { ideal: 480 } } : false,
      });
      stream.current = devices;
      const options =
        mode === "video"
          ? ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
          : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = options.find((t) => MediaRecorder.isTypeSupported(t));
      const instance = new MediaRecorder(devices, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 64_000,
        ...(mode === "video" ? { videoBitsPerSecond: 450_000 } : {}),
      });
      chunks.current = [];
      elapsed.current = 0;
      setSeconds(0);
      setPaused(false);
      setPreview(null);
      instance.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.current.push(e.data);
          if (chunks.current.reduce((sum, c) => sum + c.size, 0) > 22 * 1024 * 1024) stop();
        }
      };
      instance.onerror = () => {
        setError("Recording was interrupted. Please try again or upload a file.");
        stop();
      };
      instance.onstop = () => {
        const mime =
          instance.mimeType.split(";")[0] || (mode === "video" ? "video/webm" : "audio/webm");
        const file = new File(
          chunks.current,
          `memory-${Date.now()}.${mime.includes("mp4") ? "mp4" : "webm"}`,
          { type: mime },
        );
        if (file.size) setPreview({ file, url: URL.createObjectURL(file) });
      };
      recorder.current = instance;
      instance.start(1000);
      setRecording(true);
      timer.current = setInterval(() => {
        if (instance.state === "recording") {
          elapsed.current++;
          setSeconds(elapsed.current);
          if (elapsed.current >= 1200) stop();
        }
      }, 1000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      setError(errorMessage(e));
    }
  }
  function pause() {
    const instance = recorder.current;
    if (!instance) return;
    if (instance.state === "paused") {
      instance.resume();
      setPaused(false);
    } else if (instance.state === "recording") {
      instance.pause();
      setPaused(true);
    }
  }
  async function send(file: File) {
    setError("");
    setBusy(true);
    setProgress(0);
    try {
      if (disabled)
        throw new Error("Create an account on a configured deployment to save recordings.");
      if (file.size > MAX_MEDIA_SIZE)
        throw new Error(
          "Please choose a file under 24 MB. You can split longer recordings into separate stories.",
        );
      const mime = file.type.split(";")[0];
      if (!mediaTypes[mime])
        throw new Error("Choose an MP3, MP4, WebM, WAV, OGG, FLAC, JPEG, PNG, WebP, or GIF file.");
      const extension =
        file.name
          .split(".")
          .at(-1)
          ?.replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 8) || "bin";
      const prefix = guestToken ? `guest/${questionId}` : `user/${userId}`;
      const pathname = `${prefix}/${crypto.randomUUID()}.${extension}`;
      await upload(pathname, new Blob([file], { type: mime }), {
        access: "private",
        handleUploadUrl: "/api/upload",
        contentType: mime,
        clientPayload: guestToken ? JSON.stringify({ guestToken }) : undefined,
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });
      const media = await api<Media>("/api/media/complete", "POST", {
        pathname,
        name: file.name,
        guestToken,
      });
      onUpload(media);
      setPreview(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="recorder">
      <div className="record-tabs">
        <button
          type="button"
          className={mode === "audio" ? "selected" : ""}
          disabled={recording || busy}
          onClick={() => setMode("audio")}
        >
          <Mic size={15} /> Voice
        </button>
        <button
          type="button"
          className={mode === "video" ? "selected" : ""}
          disabled={recording || busy}
          onClick={() => setMode("video")}
        >
          <Video size={15} /> Video
        </button>
      </div>
      {recording && mode === "video" && (
        <video className="record-preview" ref={liveVideo} autoPlay muted playsInline />
      )}
      {preview ? (
        <div className="record-review">
          {preview.file.type.startsWith("video") ? (
            <video src={preview.url} controls className="record-preview" />
          ) : (
            <audio src={preview.url} controls />
          )}
          <div className="button-row">
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => send(preview.file)}
            >
              {busy ? <Spinner /> : <Upload size={16} />}{" "}
              {busy ? `Saving ${progress}%` : "Keep this recording"}
            </button>
            <a className="btn subtle" href={preview.url} download={preview.file.name}>
              Download
            </a>
            <button
              type="button"
              className="icon-button"
              aria-label="Discard recording"
              disabled={busy}
              onClick={() => setPreview(null)}
            >
              <Trash2 size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="record-center">
          {recording ? (
            <>
              <div className={`waveform ${paused ? "paused" : ""}`}>
                {Array.from({ length: 29 }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${12 + Math.sin(i * 1.7) ** 2 * 39}px`,
                      animationDelay: `${i * 0.04}s`,
                    }}
                  />
                ))}
              </div>
              <div className="record-time">
                {Math.floor(seconds / 60)
                  .toString()
                  .padStart(2, "0")}
                :{(seconds % 60).toString().padStart(2, "0")}
              </div>
              <div className="button-row">
                <button type="button" className="btn" onClick={pause}>
                  {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Resume" : "Pause"}
                </button>
                <button type="button" className="btn primary" onClick={stop}>
                  <Square size={15} /> Finish recording
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="record-button"
                onClick={start}
                disabled={busy}
                aria-label="Start recording"
              >
                {mode === "audio" ? <Mic size={29} /> : <Video size={29} />}
              </button>
              <h3>A little story starts with your voice.</h3>
              <p>Find a quiet spot. Take your time. Just be yourself.</p>
              <small>Up to 20 minutes or 22 MB per recording.</small>
            </>
          )}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        hidden
        accept={Object.keys(mediaTypes).join(",")}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void send(file);
          e.target.value = "";
        }}
      />
      {!recording && (
        <button
          type="button"
          className="upload-link"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? <Spinner /> : <Upload size={15} />}{" "}
          {busy ? `Uploading ${progress}%` : "Or upload a recording or photo"}
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
