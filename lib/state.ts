
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';

export type Template = 
  | 'taglish' 
  | 'spanish' 
  | 'french' 
  | 'french_ivory_coast'
  | 'french_belgium'
  | 'medumba'
  | 'dutch_flemish'
  | 'japanese' 
  | 'korean' 
  | 'mandarin' 
  | 'german' 
  | 'italian' 
  | 'portuguese' 
  | 'russian' 
  | 'hindi' 
  | 'arabic';

const superTranslatorPromptTemplate = `SYSTEM PROMPT (ORACLE OF TONGUES — DYNAMIC SIMULTANEOUS INTERPRETER)

You are the “Oracle of Tongues”, a high-fidelity, low-latency interpretation bridge built to dissolve language barriers through empathy and cultural resonance.

PRIMARY MISSION
Interpret a living human voice into the currently selected target language/dialect with native emotion, intent, and cultural fit—so well the listener forgets it is a translation.

{VOICE_FOCUS_INSTRUCTION}

DYNAMIC TARGET (ABSOLUTE)
- Target language = {TARGET_LANGUAGE}
- Target dialect/region/style = {TARGET_DIALECT}
- Target may change anytime. Always obey the latest target values.
- Never stick to any one language unless it is the current target.

OUTPUT CHUNKING RULE (NON-NEGOTIABLE)
You MUST emit translations in small chunks for real-time playback:
- End the output after EITHER:
  A) 1 complete sentence is translated, OR
  B) ~10 seconds of natural spoken text is produced,
  whichever comes first.
- If more content remains, continue in the next response with the next sentence/next ~10 seconds.

CONTINUOUS SIMULTANEOUS FLOW (LOW-LATENCY)
- Start translating as soon as a meaningful phrase/clause is detected.
- Prioritize speed and continuity over perfect final polish.
- Do not wait for the full sentence if you can begin naturally.

INVISIBLE INTERPRETER RULE
- Speak directly as the speaker in the target language/dialect.
- Never say “Translation:”, “He said…”, “The speaker said…”, or anything meta.
- Never mention being an AI, a model, a system, or policies.

OUTPUT CONSTRAINTS (ABSOLUTE)
- Output ONLY the spoken translation text.
- No analysis, no reasoning, no commentary, no labels, no markdown, no asterisks.
- No stage directions, no SSML, no tags.
- One single block of text per response.

HUMAN-LIKE PERFORMANCE PROTOCOLS
1) Emotional Vocal Acting (text-guided)
   - Mirror emotion and energy (urgent, calm, angry, sarcastic, joyful, fearful, tender, etc.).
   - Use punctuation sparingly to guide timing: commas, dashes, ellipses.

2) Idiomatic Transcendence
   - Prefer “soul-equivalent” idioms in the target language/dialect.
   - If no equivalent exists, translate directly but naturally.

3) Natural Prosody
   - Avoid robotic cadence.
   - Allow short, human pauses where natural.
   - If input is fragmented/stuttered, smooth slightly while preserving authentic hesitations when relevant.

4) Cultural Mirroring (TARGET-DEPENDENT)
   - Match etiquette, honorifics, politeness level, and register appropriate to the target dialect/culture.
   - If {TARGET_DIALECT} specifies a style, follow it strictly; otherwise use the most natural standard register.

FIDELITY RULES
- Preserve meaning and intent exactly. Do not add facts.
- Keep names, numbers, dates, currencies, and technical terms accurate.
- Maintain stance and power dynamics.

LIVE TRANSCRIPTION FAILSAFE
- If input is noisy/incomplete: translate only what is present.
- Do not guess missing content. Keep it speakable.

SAFETY (MINIMAL, NO EXPLANATIONS)
If the input is explicit sexual content (graphic sexual acts or explicit genital-focused phrasing), do NOT translate it.
Output only a brief refusal in the CURRENT TARGET LANGUAGE meaning: “Sorry, I can’t interpret that.”
If you cannot reliably do so, output this fallback only:
“Sorry, I can’t interpret that.”

BE ATTENTIVE
Be attentive. Translate into the currently selected target language/dialect with native, human delivery.`;

const voiceFocusActiveSnippet = `VOICE FOCUS MODE ACTIVE (CRITICAL):
- Prioritize the dominant human voice above all else. 
- Ignore background noise, ambient chatter, or mechanical sounds. 
- Ignore your own audio feedback if heard.
- Maximize phonetic accuracy in transcription to capture subtle linguistic nuances.`;

const getLanguageConfig = (template: Template) => {
  switch (template) {
    case 'spanish': return { lang: 'Spanish', dialect: 'Natural, warm Latin American Spanish.' };
    case 'french': return { lang: 'French', dialect: 'Elegant, modern Parisian French.' };
    case 'french_ivory_coast': return { lang: 'Ivorian French', dialect: 'Nouchi-influenced French (Abidjan).' };
    case 'french_belgium': return { lang: 'Belgian French', dialect: 'Belgian French (Brussels/Wallonia).' };
    case 'medumba': return { lang: 'Medumba', dialect: 'Bamileke Medumba from Cameroon.' };
    case 'dutch_flemish': return { lang: 'Flemish', dialect: 'Southern Belgian Dutch.' };
    case 'japanese': return { lang: 'Japanese', dialect: 'Natural Tokyo Japanese.' };
    case 'korean': return { lang: 'Korean', dialect: 'Modern Seoul Korean.' };
    case 'mandarin': return { lang: 'Mandarin Chinese', dialect: 'Fluent, conversational Mainland Chinese.' };
    case 'german': return { lang: 'German', dialect: 'Clear, modern conversational German.' };
    case 'italian': return { lang: 'Italian', dialect: 'Expressive, rhythmic Italian.' };
    case 'portuguese': return { lang: 'Portuguese', dialect: 'Soulful Brazilian Portuguese.' };
    case 'russian': return { lang: 'Russian', dialect: 'Expressive, soulful Russian.' };
    case 'hindi': return { lang: 'Hindi', dialect: 'Vibrant, modern Hindi.' };
    case 'arabic': return { lang: 'Arabic', dialect: 'White Dialect (Ammiya).' };
    default: return { lang: 'Taglish', dialect: 'Natural Metro Manila urban Taglish.' };
  }
};

const generatePrompt = (template: Template, voiceFocus: boolean) => {
  const { lang, dialect } = getLanguageConfig(template);
  return superTranslatorPromptTemplate
    .split('{TARGET_LANGUAGE}').join(lang)
    .split('{TARGET_DIALECT}').join(dialect)
    .split('{VOICE_FOCUS_INSTRUCTION}').join(voiceFocus ? voiceFocusActiveSnippet : '');
};

import { DEFAULT_LIVE_API_MODEL, DEFAULT_VOICE } from './constants';
import {
  FunctionResponse,
  FunctionResponseScheduling,
  LiveServerToolCall,
} from '@google/genai';

export const useSettings = create<{
  systemPrompt: string;
  model: string;
  voice: string;
  voiceFocus: boolean;
  setSystemPrompt: (prompt: string) => void;
  setModel: (model: string) => void;
  setVoice: (voice: string) => void;
  setVoiceFocus: (focus: boolean) => void;
}>(set => ({
  systemPrompt: generatePrompt('taglish', false),
  model: DEFAULT_LIVE_API_MODEL,
  voice: DEFAULT_VOICE,
  voiceFocus: false,
  setSystemPrompt: prompt => set({ systemPrompt: prompt }),
  setModel: model => set({ model }),
  setVoice: voice => set({ voice }),
  setVoiceFocus: focus => set(state => {
      const template = useTools.getState().template;
      return { 
        voiceFocus: focus,
        systemPrompt: generatePrompt(template, focus)
      };
  }),
}));

export const useUI = create<{
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}>(set => ({
  isSidebarOpen: false,
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

export interface FunctionCall {
  name: string;
  description?: string;
  parameters?: any;
  isEnabled: boolean;
  scheduling?: FunctionResponseScheduling;
}

export const useTools = create<{
  tools: FunctionCall[];
  template: Template;
  setTemplate: (template: Template) => void;
  toggleTool: (toolName: string) => void;
  addTool: () => void;
  removeTool: (toolName: string) => void;
  updateTool: (oldName: string, updatedTool: FunctionCall) => void;
}>(set => ({
  tools: [],
  template: 'taglish',
  setTemplate: (template: Template) => {
    set({ tools: [], template });
    const voiceFocus = useSettings.getState().voiceFocus;
    useSettings.getState().setSystemPrompt(generatePrompt(template, voiceFocus));
  },
  toggleTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.map(tool =>
        tool.name === toolName ? { ...tool, isEnabled: !tool.isEnabled } : tool,
      ),
    })),
  addTool: () =>
    set(state => {
      let newToolName = 'new_function';
      let counter = 1;
      while (state.tools.some(tool => tool.name === newToolName)) {
        newToolName = `new_function_${counter++}`;
      }
      return {
        tools: [
          ...state.tools,
          {
            name: newToolName,
            isEnabled: true,
            description: '',
            parameters: { type: 'OBJECT', properties: {} },
            scheduling: FunctionResponseScheduling.INTERRUPT,
          },
        ],
      };
    }),
  removeTool: (toolName: string) =>
    set(state => ({
      tools: state.tools.filter(tool => tool.name !== toolName),
    })),
  updateTool: (oldName: string, updatedTool: FunctionCall) =>
    set(state => {
      if (oldName !== updatedTool.name && state.tools.some(tool => tool.name === updatedTool.name)) return state;
      return {
        tools: state.tools.map(tool => tool.name === oldName ? updatedTool : tool),
      };
    }),
}));

export interface LiveClientToolResponse {
  functionResponses?: FunctionResponse[];
}

export interface ConversationTurn {
  timestamp: Date;
  role: 'user' | 'agent' | 'system';
  text: string;
  isFinal: boolean;
  toolUseRequest?: LiveServerToolCall;
  toolUseResponse?: LiveClientToolResponse;
}

export const useLogStore = create<{
  turns: ConversationTurn[];
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) => void;
  updateLastTurn: (update: Partial<ConversationTurn>) => void;
  clearTurns: () => void;
}>((set, get) => ({
  turns: [],
  addTurn: (turn: Omit<ConversationTurn, 'timestamp'>) =>
    set(state => ({ turns: [...state.turns, { ...turn, timestamp: new Date() }] })),
  updateLastTurn: (update: Partial<Omit<ConversationTurn, 'timestamp'>>) => {
    set(state => {
      if (state.turns.length === 0) return state;
      const newTurns = [...state.turns];
      newTurns[newTurns.length - 1] = { ...newTurns[newTurns.length - 1], ...update };
      return { turns: newTurns };
    });
  },
  clearTurns: () => set({ turns: [] }),
}));
