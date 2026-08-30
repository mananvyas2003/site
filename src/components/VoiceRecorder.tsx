"use client";

import { useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;

/** 60-second recordings, MediaRecorder, uploaded as .webm (PRD P1). */
export default function VoiceRecorder({
  onRecorded,
  recorded,
}: {
  onRecorded: (v: { blob: Blob; seconds: number } | null) => void;
  recorded: { blob: Blob; seconds: number } | null;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    if (seconds >= MAX_SECONDS && recording) stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setPreviewUrl(URL.createObjectURL(blob));
        onRecorded({ blob, seconds: Math.max(1, seconds) });
      };
      rec.start();
      recorderRef.current = rec;
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("no microphone, or permission refused");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  if (recorded && previewUrl) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <audio controls src={previewUrl} className="h-9" />
        <button
          onClick={() => {
            onRecorded(null);
            setPreviewUrl(null);
            setSeconds(0);
          }}
          className="eyebrow underline underline-offset-4"
        >
          discard
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={recording ? stop : start}
        className={`btn ${recording ? "btn-primary" : "btn-ghost"}`}
      >
        {recording ? `stop · ${seconds}s` : "record 60 seconds"}
      </button>
      {recording && (
        <span className="mono text-[0.6875rem] text-sindoor">
          {MAX_SECONDS - seconds}s left
        </span>
      )}
      {error && <span className="text-sm text-sindoor">{error}</span>}
    </div>
  );
}

function pickMime() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
