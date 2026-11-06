import * as fs from 'fs';
import * as path from 'path';
import type { PipelineType, Script, ScriptScene, SceneVisuals } from './types';
import type { PipelineConfig } from './pipelineConfig';
import { PIPELINES } from './pipelineConfig';

const RUNS_DIR = path.join(process.cwd(), 'runs');

const REGIONS: string[] = ['west', 'mountain', 'midwest', 'south', 'northeast', 'texas', 'florida'];
let regionCursor = 0;

/** Split article text into paragraph-sized candidate scenes. */
const paragraphs = (text: string): string[] =>
  text
    .split(/\n{2,}|\.\s+(?=[A-Z])/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

/**
 * Heuristic: pick the most important number(s) in a paragraph for a chart.
 */
const numbersIn = (text: string): Array<{ label: string; value: number }> => {
  const out: Array<{ label: string; value: number }> = [];
  const m = text.matchAll(/([A-Za-z][A-Za-z\s]{2,40}?)\s*(?:is|was|at|to|of|dropped|rose|fell|climbed|reached|held|swung|by)\s*(?:(?:from\s*)?)(\d{1,3}(?:\.\d+)?)\s*%?/g);
  for (const match of m) {
    out.push({ label: match[1].trim(), value: Number(match[2]) });
    if (out.length >= 4) break;
  }
  return out;
};

/** Heuristic visual direction per paragraph. */
const visualsForParagraph = (text: string, index: number, total: number): SceneVisuals => {
  const t = text.toLowerCase();
  const v: SceneVisuals = {};

  if (index === total - 1) v.character = { emotion: 'happy' };
  else if (/shock|stunning|historic|routed|wipeout|crush/.test(t)) v.character = { emotion: 'shocked' };
  else if (/problem|loss|struggle|erosion|decline/.test(t)) v.character = { emotion: 'worried' };
  else v.character = { emotion: 'neutral' };

  // Map for geography
  if (/\b(state|states|map|nation|country|swing|texas|florida|kansas|ohio|georgia|pennsylvania|michigan|wisconsin|arizona|nevada|north carolina)\b/.test(t)) {
    v.mapRegion = REGIONS[regionCursor++ % REGIONS.length];
  }

  // Chart for numbers / comparisons
  const nums = numbersIn(text);
  if (nums.length >= 1 && (/\b(percent|%|seat|vote|voters|point|swing|million|billion|seat)\b/.test(t) || /senate|house|democrat|republican|gop/.test(t))) {
    v.chart = {
      maxValue: Math.max(Math.ceil(Math.max(...nums.map((n) => n.value)) * 1.4), 100),
      data: nums.map((n) => ({ label: n.label, value: n.value, color: '#0F62FE' })),
    };
  }

  // Speech bubble for surprise / rhetorical questions
  if (/\b(how|why|what|really|wait)\b/.test(t) && index % 3 === 0) {
    v.speech = 'Wait — really?';
  }

  // Lower third on definitional / results paragraphs
  if (/result|takeaway|shift|power|victory|win|lose|seat/.test(t)) {
    v.lowerThird = { name: `Takeaway ${index + 1}`, role: text.slice(0, 70) };
  }

  return v;
};

/**
 * Convert an article into a Script manifest.
 * Splits into scenes, assigns timing, narration, and visual direction.
 * If an OpenAI key is supplied, the LLM does the heavy lifting; otherwise a
 * high-quality deterministic heuristic is used.
 */
export const articleToScript = async (
  article: { title: string; url?: string; text: string },
  pipelineType: PipelineType,
  opts: { openAiKey?: string; runId?: string } = {},
): Promise<Script> => {
  const cfg = PIPELINES[pipelineType];
  const runId = opts.runId ?? `run-${Date.now()}`;
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  let scenes: ScriptScene[];

  if (opts.openAiKey) {
    try {
      scenes = await articleToScriptWithLLM(article, cfg, opts.openAiKey);
    } catch (err) {
      console.warn('[articleAgent] LLM failed, using heuristic:', (err as Error).message);
      scenes = heuristicScenes(article, cfg);
    }
  } else {
    scenes = heuristicScenes(article, cfg);
  }

  // Normalize timing to fill the pipeline duration exactly
  const total = cfg.durationSeconds;
  if (scenes.length > 1) {
    const last = scenes[scenes.length - 1];
    last.end = total;
    for (let i = 1; i < scenes.length; i++) {
      scenes[i].start = scenes[i - 1].end;
    }
  }

  const script: Script = {
    title: article.title,
    topic: article.title,
    pipeline: pipelineType,
    durationSeconds: total,
    resolution: cfg.resolution,
    scenes,
  };

  const manifest = {
    ...script,
    sourceUrl: article.url,
    generatedAt: new Date().toISOString(),
    method: opts.openAiKey ? 'llm' : 'heuristic',
  };
  fs.writeFileSync(path.join(runDir, 'script.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(runDir, 'article.json'), JSON.stringify(article, null, 2));
  console.log(`[articleAgent] ${scenes.length} scenes extracted from "${article.title}"`);
  return script;
};

const heuristicScenes = (article: { title: string; text: string }, cfg: PipelineConfig): ScriptScene[] => {
  const pars = paragraphs(article.text);
  // Cap scenes to pipeline target
  const take = Math.min(Math.max(pars.length, cfg.targetScenes - 2), cfg.targetScenes + 2);
  const selected = pars.slice(0, take);

  const durationPerScene = cfg.durationSeconds / Math.max(selected.length, 1);
  const scenes = selected.map((par, i) => {
    const start = i * durationPerScene;
    const end = i === selected.length - 1 ? cfg.durationSeconds : start + durationPerScene;
    return {
      id: `scene-${i + 1}`,
      start,
      end,
      label: par.slice(0, 60),
      background: i % 2 === 0 ? '#FFF8E1' : '#E3F2FD',
      narration: par,
      visuals: visualsForParagraph(par, i, selected.length),
    };
  });
  return scenes;
};

/** LLM-driven article → script (OpenAI-compatible). */
async function articleToScriptWithLLM(
  article: { title: string; text: string },
  cfg: PipelineConfig,
  apiKey: string,
): Promise<ScriptScene[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You convert a news article into a video script for a Kurzgesagt-style political animation (comic/hand-drawn art). Produce a JSON object with a "scenes" array. Each scene: {id, start, end, label, background (hex), narration}. Total duration must equal ${cfg.durationSeconds} seconds. ${cfg.targetScenes} scenes, each ${cfg.minSceneSeconds}-${cfg.maxSceneSeconds}s. Narration is short, spoken-word, neutral in tone. Article title and text provided by the user.`,
        },
        { role: 'user', content: `Title: ${article.title}\n\n${article.text.slice(0, 6000)}` },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.scenes as ScriptScene[];
};
