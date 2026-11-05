import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type { Script, VoiceManifest } from './types';

const RUNS_DIR = path.join(process.cwd(), 'runs');

/** Minimal RIFF/WAV header for 16-bit mono PCM. */
const wavHeader = (byteRate: number, dataSize: number): Buffer => {
  const sampleRate = 44100;
  const channels = 1;
  const bitsPerSample = 16;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return header;
};

/** Write a silent WAV placeholder so a valid audio file always exists. */
const placeholderAudio = (outPath: string, durationSeconds: number): void => {
  const sampleRate = 44100;
  const samples = sampleRate * durationSeconds;
  const dataSize = samples * 2;
  const header = wavHeader(sampleRate * 2, dataSize);
  const buf = Buffer.concat([header, Buffer.alloc(dataSize)]);
  fs.writeFileSync(outPath, buf);
};

export const synthesizeVoice = async (
  script: Script,
  opts: { provider?: 'openai' | 'elevenlabs' | 'edge-tts' | 'placeholder'; voice?: string; runId?: string },
): Promise<VoiceManifest> => {
  const provider = opts.provider ?? 'placeholder';
  const voice = opts.voice ?? 'alloy';
  const runId = opts.runId ?? `run-${Date.now()}`;
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const audioPath = path.join(runDir, 'voiceover.wav');
  let durationSeconds = script.durationSeconds;

  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is required for openai TTS');
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: script.scenes.map((s) => s.narration).join(' '), voice }),
    });
    if (!response.ok) throw new Error(`OpenAI TTS: ${response.status} ${await response.text()}`);
    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(audioPath, buf);
    // Duration estimate: ~150 words/minute English
    const words = script.scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    durationSeconds = (words / 150) * 60;
  } else if (provider === 'elevenlabs') {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY is required for elevenlabs TTS');
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: script.scenes.map((s) => s.narration).join(' '), model_id: 'eleven_multilingual_v2' }),
    });
    if (!response.ok) throw new Error(`ElevenLabs: ${response.status} ${await response.text()}`);
    const buf = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(audioPath, buf);
    const words = script.scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    durationSeconds = (words / 150) * 60;
  } else if (provider === 'edge-tts') {
    try {
      execSync(`edge-tts --voice "${voice}" --text "${script.scenes.map((s) => s.narration).join(' ')}" --write-media "${audioPath}"`, {
        stdio: 'ignore',
      });
    } catch {
      // edge-tts CLI not installed → fall back to silent placeholder
      placeholderAudio(audioPath, script.durationSeconds);
    }
  } else {
    placeholderAudio(audioPath, script.durationSeconds);
  }

  const manifest: VoiceManifest = {
    scriptId: script.title,
    audioPath,
    durationSeconds,
    provider,
    voice,
  };
  fs.writeFileSync(path.join(runDir, 'voice.json'), JSON.stringify(manifest, null, 2));
  console.log(`[voiceAgent] Audio written to ${audioPath} (${provider})`);
  return manifest;
};
