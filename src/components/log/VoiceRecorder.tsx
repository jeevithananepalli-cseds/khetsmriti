"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { TranscribeLanguage } from "@/types/domain";
import { apiPostForm } from "@/lib/clientApi";
import { MicIcon, StopIcon } from "../Icons";
import { ErrorState } from "../ui";

const MAX_SECONDS = 120;
const LANGUAGES: { value: TranscribeLanguage; label: string }[] = [
  { value: "auto", label: "Auto (Telugu / English)" },
  { value: "te", label: "Telugu" },
  { value: "en", label: "English" },
];

function pickMimeType(): string {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return options.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

type Phase = "idle" | "recording" | "uploading";

/** Records up to 2 minutes, sends it to /api/transcribe and hands back the text. */
export function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [language, setLanguage] = useState<TranscribeLanguage>("auto");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const upload = async (blob: Blob, mimeType: string) => {
    setPhase("uploading");
    const ext = mimeType.includes("mp4") ? "m4a" : "webm";
    const form = new FormData();
    form.append("audio", new File([blob], `visit-note.${ext}`, { type: mimeType.split(";")[0] || "audio/webm" }));
    form.append("language", language);
    const res = await apiPostForm<{ text: string }>("/api/transcribe", form);
    setPhase("idle");
    if (res.ok) onTranscript(res.data.text);
    else setError(res.error.message);
  };

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stop();
  };

  const start = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio. Type the note instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone permission was denied. Allow microphone access or type the note instead.");
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size === 0) {
        setPhase("idle");
        setError("Nothing was recorded. Please try again.");
        return;
      }
      void upload(blob, type);
    };
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setPhase("recording");
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  };

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Language</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as TranscribeLanguage)}
          disabled={phase !== "idle"}
          className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-5">
        <button
          type="button"
          onClick={phase === "recording" ? stop : start}
          disabled={phase === "uploading"}
          aria-label={phase === "recording" ? "Stop recording" : "Start recording"}
          className={clsx(
            "grid h-20 w-20 place-items-center rounded-full text-white shadow-md transition-colors disabled:opacity-50",
            phase === "recording" ? "bg-danger" : "bg-leaf hover:bg-leaf-strong",
          )}
        >
          {phase === "recording" ? <StopIcon className="h-8 w-8" /> : <MicIcon className="h-8 w-8" />}
        </button>
        <p className="font-mono text-sm" aria-live="polite">
          {phase === "recording" && `Recording ${mmss} / 2:00`}
          {phase === "uploading" && "Transcribing with Whisper…"}
          {phase === "idle" && "Tap to record (max 2 minutes)"}
        </p>
      </div>
      {error ? <ErrorState title="Recording problem" message={error} /> : null}
    </div>
  );
}
