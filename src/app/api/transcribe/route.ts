import { fail, ok, serverError, statusFor } from "@/lib/api";
import { transcribeAudio, type TranscribeLanguage } from "@/lib/llm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 2 minutes of compressed audio is well under this
const ALLOWED_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/mpeg",
  "audio/ogg",
];
const LANGUAGES: readonly TranscribeLanguage[] = ["te", "en", "auto"];

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("bad_request", "Send the recording as multipart/form-data with an audio field.", 400);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) return fail("bad_request", "Missing audio file.", 400);
  if (audio.size === 0) return fail("empty_audio", "The recording is empty. Please record again.", 400);
  if (audio.size > MAX_BYTES) return fail("too_large", "Recording is too long. Keep voice notes under 2 minutes.", 413);
  const baseType = audio.type.split(";")[0];
  if (baseType && !ALLOWED_TYPES.includes(baseType)) {
    return fail("unsupported_type", `Unsupported audio type ${baseType}. Use webm, m4a or wav.`, 415);
  }

  const langField = form.get("language");
  const language = LANGUAGES.find((l) => l === langField) ?? "auto";

  try {
    const result = await transcribeAudio(audio, language);
    if (!result.ok) return fail(result.error.code, result.error.message, statusFor(result.error.code));
    if (!result.text) {
      return fail("empty_audio", "No speech was detected. Please record again closer to the phone.", 422);
    }
    return ok({ text: result.text, language });
  } catch (err: unknown) {
    return serverError("POST /api/transcribe", err);
  }
}
