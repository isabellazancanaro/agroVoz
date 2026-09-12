import "server-only";

import { spawn } from "node:child_process";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

type TranscriberOutput = { text?: string } | Array<{ text?: string }>;
type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<TranscriberOutput>;

let transcriberPromise: Promise<Transcriber> | null = null;

async function getTranscriber() {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { env, pipeline } = await import("@huggingface/transformers");
      env.cacheDir = process.env.VERCEL ? path.join("/tmp", "agrovoz-whisper") : path.join(process.cwd(), ".cache", "huggingface");
      const model = process.env.WHISPER_MODEL || "onnx-community/whisper-small";
      return await pipeline("automatic-speech-recognition", model, { dtype: "q8" }) as unknown as Transcriber;
    })();
  }
  return transcriberPromise;
}

function decodeWithFfmpeg(input: Buffer) {
  if (!ffmpegPath) throw new Error("FFmpeg no está disponible en este entorno.");
  const executable = ffmpegPath;
  return new Promise<Float32Array>((resolve, reject) => {
    const child = spawn(executable, ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", "16000", "pipe:1"], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code: number | null) => {
      if (code !== 0) return reject(new Error(Buffer.concat(errors).toString("utf8") || `FFmpeg terminó con código ${code}.`));
      const pcm = Buffer.concat(chunks);
      const samples = new Float32Array(Math.floor(pcm.length / 2));
      for (let index = 0; index < samples.length; index += 1) samples[index] = pcm.readInt16LE(index * 2) / 32768;
      resolve(samples);
    });
    child.stdin.end(input);
  });
}

export async function transcribeAudio(bytes: ArrayBuffer) {
  const audio = await decodeWithFfmpeg(Buffer.from(bytes));
  if (!audio.length) throw new Error("El audio no contiene muestras decodificables.");
  const transcriber = await getTranscriber();
  const output = await transcriber(audio, { language: "spanish", task: "transcribe", chunk_length_s: 30, stride_length_s: 5 });
  const text = (Array.isArray(output) ? output.map((item) => item.text || "").join(" ") : output.text || "").trim();
  if (!text) throw new Error("Whisper no pudo obtener texto del audio.");
  return text;
}
