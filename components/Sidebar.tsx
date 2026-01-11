
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, Template } from '../lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES } from '../lib/constants';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useState, useMemo } from 'react';
import ToolEditorModal from './ToolEditorModal';

const LANGUAGE_LABELS: Record<Template, string> = {
  // Dutch & Benelux
  'dutch': 'Dutch (Netherlands)',
  'dutch_flemish': 'Dutch (Flemish)',
  'dutch_brabantian': 'Dutch (Brabantian)',
  'dutch_limburgish': 'Dutch (Limburgish)',
  'west_flemish': 'Dutch (West Flemish)',
  'dutch_surinamese': 'Dutch (Surinamese)',
  'afrikaans': 'Afrikaans',
  'frisian': 'West Frisian',

  // Cameroon
  'medumba': 'Medumba (Cameroon)',
  'bamum': 'Bamum',
  'ewondo': 'Ewondo',
  'duala': 'Duala',
  'basaa': 'Basaa',
  'bulu': 'Bulu',
  'fulfulde_cameroon': 'Fulfulde (Cameroon)',
  'cameroonian_pidgin': 'Cameroonian Pidgin',

  // Ivory Coast
  'french_ivory_coast': 'French (Ivory Coast)',
  'baoule': 'Baoulé',
  'dioula': 'Dioula',
  'bete': 'Bété',

  // Philippines
  'taglish': 'Taglish (Tagalog-English)',
  'tagalog': 'Tagalog (Formal)',
  'cebuano': 'Cebuano (Bisaya)',
  'ilocano': 'Ilocano',
  'hiligaynon': 'Hiligaynon (Ilonggo)',
  'waray': 'Waray',
  'kapampangan': 'Kapampangan',
  'bikol': 'Bikol',
  'pangasinan': 'Pangasinan',
  'chavacano': 'Chavacano',

  // Europe
  'english': 'English (International)',
  'french': 'French (France)',
  'french_belgium': 'French (Belgium)',
  'german': 'German',
  'spanish': 'Spanish (Neutral)',
  'spanish_mexican': 'Spanish (Mexico)',
  'spanish_argentinian': 'Spanish (Argentina)',
  'italian': 'Italian',
  'portuguese': 'Portuguese (Brazil)',
  'russian': 'Russian',
  'polish': 'Polish',
  'ukrainian': 'Ukrainian',
  'swedish': 'Swedish',
  'norwegian': 'Norwegian',
  'danish': 'Danish',
  'finnish': 'Finnish',
  'greek': 'Greek',
  'czech': 'Czech',
  'hungarian': 'Hungarian',
  'romanian': 'Romanian',
  'turkish': 'Turkish',

  // Asia & Middle East
  'japanese': 'Japanese',
  'korean': 'Korean',
  'mandarin': 'Chinese (Mandarin)',
  'cantonese': 'Chinese (Cantonese)',
  'hokkien': 'Chinese (Hokkien)',
  'hindi': 'Hindi',
  'bengali': 'Bengali',
  'punjabi': 'Punjabi',
  'marathi': 'Marathi',
  'tamil': 'Tamil',
  'telugu': 'Telugu',
  'urdu': 'Urdu',
  'arabic': 'Arabic (Standard)',
  'arabic_egyptian': 'Arabic (Egyptian)',
  'arabic_levantine': 'Arabic (Levantine)',
  'arabic_gulf': 'Arabic (Gulf)',
  'persian': 'Persian (Farsi)',
  'hebrew': 'Hebrew',
  'vietnamese': 'Vietnamese',
  'thai': 'Thai',
  'indonesian': 'Indonesian',
  'malay': 'Malay',

  // Africa (General)
  'swahili': 'Swahili',
  'amharic': 'Amharic',
  'yoruba': 'Yoruba',
  'igbo': 'Igbo',
  'hausa': 'Hausa',
  'twi': 'Twi',
  'wolof': 'Wolof',
  'zulu': 'Zulu',
  'xhosa': 'Xhosa',
};

const VOICE_ALIASES: Record<string, string> = {
  'Zephyr': 'King Aeolus',
  'Puck': 'King Pan',
  'Charon': 'King Hades',
  'Kore': 'Queen Persephone',
  'Luna': 'Queen Selene',
  'Nova': 'Queen Asteria',
  'Fenrir': 'King Lycaon',
  'Leda': 'Queen Leda',
  'Orus': 'King Horus',
  'Aoede': 'Queen Aoede',
  'Callirrhoe': 'Queen Callirrhoe',
  'Autonoe': 'Queen Autonoe',
  'Enceladus': 'King Enceladus',
  'Iapetus': 'King Iapetus',
  'Umbriel': 'King Erebus',
  'Algieba': 'King Leonidas',
  'Despina': 'Queen Despina',
  'Erinome': 'Queen Erinome',
  'Algenib': 'King Bellerophon',
  'Rasalgethi': 'King Heracles',
  'Laomedeia': 'Queen Laomedeia',
  'Achernar': 'King Eridanos',
  'Alnilam': 'King Orion',
  'Schedar': 'Queen Cassiopeia',
  'Gacrux': 'King Acrux',
  'Pulcherrima': 'Queen Izar',
  'Achird': 'King Cepheus',
  'Zubenelgenubi': 'King Kiffa',
  'Vindemiatrix': 'Queen Virgo',
  'Sadachbia': 'King Aquarius',
  'Sadaltager': 'King Sadaltager',
  'Sulafat': 'Queen Lyra'
};

const getVoiceAlias = (voiceId: string) => VOICE_ALIASES[voiceId] || `Persona ${voiceId}`;

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { systemPrompt, voice, voiceFocus, supabaseEnabled, setSystemPrompt, setVoice, setVoiceFocus, setSupabaseEnabled } = useSettings();
  const { tools, template, setTemplate, toggleTool, updateTool } = useTools();
  const { connected } = useLiveAPIContext();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const sortedVoices = useMemo(() => {
    return AVAILABLE_VOICES.map(v => ({
      id: v,
      alias: getVoiceAlias(v)
    })).sort((a, b) => a.alias.localeCompare(b.alias));
  }, []);

  const sortedLanguages = useMemo(() => {
    return (Object.keys(LANGUAGE_LABELS) as Template[])
      .sort((a, b) => LANGUAGE_LABELS[a].localeCompare(LANGUAGE_LABELS[b]));
  }, []);

  return (
    <>
      <aside className={c('sidebar', { open: isSidebarOpen })}>
        <div className="sidebar-header">
          <div className="sidebar-title-group">
            <span className="material-symbols-outlined" style={{ color: 'var(--accent)' }}>settings</span>
            <h3>Preferences</h3>
          </div>
          <button onClick={toggleSidebar} className="close-button" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sidebar-content">
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Linguistic Profile</h4>
            <fieldset disabled={connected} style={{ border: 'none', padding: 0, margin: 0 }}>
              
              <label className="sidebar-label">
                Target Language
                <select 
                  value={template} 
                  onChange={e => setTemplate(e.target.value as Template)} 
                  className="sidebar-select"
                >
                  {sortedLanguages.map(key => (
                    <option key={key} value={key}>
                      {LANGUAGE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="tool-item" style={{ marginBottom: '12px' }}>
                <div className="tool-item-info">
                  <input
                    type="checkbox"
                    id="voice-focus-toggle"
                    checked={voiceFocus}
                    onChange={(e) => setVoiceFocus(e.target.checked)}
                  />
                  <label htmlFor="voice-focus-toggle">Neural Sensitivity (Focus)</label>
                </div>
              </div>

              <div className="tool-item" style={{ marginBottom: '24px' }}>
                <div className="tool-item-info">
                  <input
                    type="checkbox"
                    id="supabase-sync-toggle"
                    checked={supabaseEnabled}
                    onChange={(e) => setSupabaseEnabled(e.target.checked)}
                  />
                  <label htmlFor="supabase-sync-toggle">Cloud Sync (Supabase)</label>
                </div>
              </div>

              <label className="sidebar-label">
                Neural Persona (Voice)
                <select 
                  value={voice} 
                  onChange={e => setVoice(e.target.value)} 
                  className="sidebar-select"
                >
                  {sortedVoices.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.alias}
                    </option>
                  ))}
                </select>
              </label>

              <label className="sidebar-label">
                System Directives
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={6}
                  className="sidebar-textarea"
                  placeholder="Enter custom instructions..."
                />
                <p style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '8px', lineHeight: 1.4 }}>
                  Include emotional cues (e.g., "be cheerful") or cultural nuances to refine the AI's resonance engine.
                </p>
              </label>
            </fieldset>
          </div>

          <div className="sidebar-section" style={{ marginTop: '24px' }}>
            <h4 className="sidebar-section-title">Cognitive Tools</h4>
            <div className="tools-list">
              {tools.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Standard mode active.</p>
              )}
              {tools.map(tool => (
                <div key={tool.name} className="tool-item">
                  <div className="tool-item-info">
                    <input
                      type="checkbox"
                      id={`tool-${tool.name}`}
                      checked={tool.isEnabled}
                      onChange={() => toggleTool(tool.name)}
                      disabled={connected}
                    />
                    <label htmlFor={`tool-${tool.name}`}>{tool.name}</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="sidebar-footer" style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <div className="version-tag" style={{ fontSize: '0.65rem', opacity: 0.4 }}>v3.1.0-Supabase-Sync</div>
          <div className={c('connection-indicator', { connected })} style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {connected ? '● ONLINE' : '○ STANDBY'}
          </div>
        </div>
      </aside>
      
      {editingTool && (
        <ToolEditorModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={handleSaveTool}
        />
      )}
    </>
  );
}
