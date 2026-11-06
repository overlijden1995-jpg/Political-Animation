import * as fs from 'fs';
import * as path from 'path';
import { PIPELINES, PipelineConfig } from './pipelineConfig';
import type { PipelineType, Script, ScriptScene } from './types';

const RUNS_DIR = path.join(process.cwd(), 'runs');

/**
 * Deterministic fallback script templates. Used when no LLM provider is
 * configured, so the engine is fully functional offline. Each template maps
 * keywords → a ready-to-produce script.
 */
const TEMPLATES: Record<string, (pipeline: PipelineConfig) => ScriptScene[]> = {
  'electoral college': (cfg) => [
    {
      id: 'hook',
      start: 0,
      end: cfg.type === 'shorts' ? 10 : 55,
      label: 'Hook',
      background: '#FFF8E1',
      narration: `In five American elections, the winner of the popular vote lost the presidency. How is that possible? Today we explain the electoral college.`,
    },
    {
      id: 'basics',
      start: cfg.type === 'shorts' ? 10 : 55,
      end: cfg.type === 'shorts' ? 22 : 145,
      label: 'Basics',
      background: '#E3F2FD',
      narration: 'Each state gets electoral votes equal to its senators plus its representatives. Washington D.C. gets three.',
    },
    {
      id: 'total',
      start: cfg.type === 'shorts' ? 22 : 145,
      end: cfg.type === 'shorts' ? 32 : 220,
      label: 'The magic number',
      background: '#FFF8E1',
      narration: 'Five hundred thirty eight electoral votes exist in total. You need two hundred seventy to win the White House.',
    },
    {
      id: 'winnerTakeAll',
      start: cfg.type === 'shorts' ? 32 : 220,
      end: cfg.type === 'shorts' ? 44 : 310,
      label: 'Winner take all',
      background: '#E3F2FD',
      narration: 'In forty-eight states and D.C., whoever wins the state popular vote takes all of that state\u2019s electors. Only Maine and Nebraska split theirs.',
    },
    {
      id: 'swing',
      start: cfg.type === 'shorts' ? 44 : 310,
      end: cfg.type === 'shorts' ? 54 : 400,
      label: 'Swing states',
      background: '#FFF8E1',
      narration: 'So presidential campaigns ignore safe states and fight for a handful of swing states: Pennsylvania, Michigan, Wisconsin, Arizona, Georgia, Nevada.',
    },
    {
      id: 'cases',
      start: cfg.type === 'shorts' ? 54 : 400,
      end: cfg.type === 'shorts' ? 58 : 490,
      label: 'History',
      background: '#E3F2FD',
      narration: 'It happened in 1824, 1876, 1888, 2000, and 2016: the popular vote loser moved into the White House.',
    },
    {
      id: 'reform',
      start: cfg.type === 'shorts' ? 58 : 490,
      end: cfg.type === 'shorts' ? 60 : 545,
      label: 'Reform',
      background: '#F3E5F5',
      narration: 'Reform ideas include the National Popular Vote Interstate Compact, or abolishing the electoral college by constitutional amendment.',
    },
    {
      id: 'outro',
      start: cfg.type === 'shorts' ? 60 : 545,
      end: cfg.durationSeconds,
      label: 'Outro',
      background: '#F3E5F5',
      narration: 'That is the electoral college. Subscribe for more explainers on US politics.',
    },
  ],
  'congress': (cfg) => [
    {
      id: 'hook',
      start: 0,
      end: cfg.type === 'shorts' ? 10 : 55,
      label: 'How Congress works',
      background: '#FFF8E1',
      narration: 'The United States Congress makes federal laws. It has two chambers: the House and the Senate.',
    },
    {
      id: 'house',
      start: cfg.type === 'shorts' ? 10 : 55,
      end: cfg.type === 'shorts' ? 24 : 175,
      label: 'The House',
      background: '#E3F2FD',
      narration: 'The House has 435 members, divided by population. Every state gets at least one, and elections happen every two years.',
    },
    {
      id: 'senate',
      start: cfg.type === 'shorts' ? 24 : 175,
      end: cfg.type === 'shorts' ? 36 : 275,
      label: 'The Senate',
      background: '#FFF8E1',
      narration: 'The Senate has 100 members — two per state, no matter how small. Senators serve six-year terms.',
    },
    {
      id: 'process',
      start: cfg.type === 'shorts' ? 36 : 275,
      end: cfg.type === 'shorts' ? 50 : 385,
      label: 'How a bill becomes law',
      background: '#E3F2FD',
      narration: 'A bill passes the House, passes the Senate, then goes to the President, who can sign it or veto it.',
    },
    {
      id: 'filibuster',
      start: cfg.type === 'shorts' ? 50 : 385,
      end: cfg.type === 'shorts' ? 58 : 490,
      label: 'The filibuster',
      background: '#FFF8E1',
      narration: 'In the Senate, 60 votes are usually needed to end debate — the filibuster. It can kill bills without a single vote against them.',
    },
    {
      id: 'outro',
      start: cfg.type === 'shorts' ? 58 : 490,
      end: cfg.durationSeconds,
      label: 'Outro',
      background: '#F3E5F5',
      narration: 'That is Congress, in brief. Subscribe for more US politics explainers.',
    },
  ],
  'supreme court': (cfg) => [
    {
      id: 'hook',
      start: 0,
      end: cfg.type === 'shorts' ? 10 : 55,
      label: 'The Supreme Court',
      background: '#FFF8E1',
      narration: 'Nine justices. Lifetime appointments. The final word on American law.',
    },
    {
      id: 'role',
      start: cfg.type === 'shorts' ? 10 : 55,
      end: cfg.type === 'shorts' ? 22 : 145,
      label: 'What it does',
      background: '#E3F2FD',
      narration: 'The Supreme Court interprets the Constitution and decides whether laws and executive actions are constitutional.',
    },
    {
      id: 'appointments',
      start: cfg.type === 'shorts' ? 22 : 145,
      end: cfg.type === 'shorts' ? 34 : 235,
      label: 'Appointments',
      background: '#FFF8E1',
      narration: 'Justices are nominated by the President and confirmed by the Senate. They serve for life, or until they retire.',
    },
    {
      id: 'landmark',
      start: cfg.type === 'shorts' ? 34 : 235,
      end: cfg.type === 'shorts' ? 46 : 335,
      label: 'Landmark cases',
      background: '#E3F2FD',
      narration: 'From Brown v. Board to Roe and Dobbs, its rulings reshape American life for generations.',
    },
    {
      id: 'debate',
      start: cfg.type === 'shorts' ? 46 : 335,
      end: cfg.type === 'shorts' ? 56 : 435,
      label: 'The debate',
      background: '#FFF8E1',
      narration: 'Court-packing, term limits, ethics codes: reforming the Court is one of the most fought-over ideas in US politics.',
    },
    {
      id: 'outro',
      start: cfg.type === 'shorts' ? 56 : 435,
      end: cfg.durationSeconds,
      label: 'Outro',
      background: '#F3E5F5',
      narration: 'That is the Supreme Court. Subscribe for more.',
    },
  ],
} as const;

/** Pick the best template by keyword, or a generic politics explainer. */
const pickTemplate = (topic: string) => {
  const t = topic.toLowerCase();
  for (const key of Object.keys(TEMPLATES)) {
    if (t.includes(key)) return TEMPLATES[key];
  }
  return TEMPLATES['electoral college'];
};

/**
 * Generate a script from a topic. If an OpenAI key is supplied, the LLM writes
 * the script; otherwise a high-quality deterministic template is used.
 */
export const generateScript = async (
  topic: string,
  pipelineType: PipelineType,
  opts: { openAiKey?: string; runId?: string } = {},
): Promise<Script> => {
  const cfg = PIPELINES[pipelineType];
  const runId = opts.runId ?? `run-${Date.now()}`;
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  let scenes: ScriptScene[];
  let llmUsed = false;

  if (opts.openAiKey) {
    try {
      scenes = await generateScriptWithLLM(topic, cfg, opts.openAiKey);
      llmUsed = true;
    } catch (err) {
      console.warn('[scriptAgent] LLM failed, falling back to template:', (err as Error).message);
      scenes = pickTemplate(topic)(cfg);
    }
  } else {
    scenes = pickTemplate(topic)(cfg);
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
    title: scenes[0]?.label ?? topic,
    topic,
    pipeline: pipelineType,
    durationSeconds: total,
    resolution: cfg.resolution,
    scenes,
  };

  const manifest = { ...script, generatedAt: new Date().toISOString(), llmUsed, template: llmUsed ? 'llm' : 'fallback' };
  fs.writeFileSync(path.join(runDir, 'script.json'), JSON.stringify(manifest, null, 2));
  return script;
};

/** Placeholder for LLM-driven script generation (OpenAI-compatible API). */
async function generateScriptWithLLM(
  topic: string,
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
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You write video scripts for a Kurzgesagt-style political animation channel (comic/hand-drawn art). Produce a JSON object with a "scenes" array. Each scene: {id, start, end, label, background (hex), narration}. Total duration must equal ${cfg.durationSeconds} seconds. ${cfg.targetScenes} scenes, each ${cfg.minSceneSeconds}-${cfg.maxSceneSeconds}s. Narration is spoken word, keep sentences short and visual. Topic will be provided by the user.`,
        },
        { role: 'user', content: topic },
      ],
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API: ${response.status} ${await response.text()}`);
  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.scenes as ScriptScene[];
};
