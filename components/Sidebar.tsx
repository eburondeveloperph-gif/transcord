
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, Template } from '../lib/state';
import c from 'classnames';
import { DEFAULT_LIVE_API_MODEL, AVAILABLE_VOICES } from '../lib/constants';
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
  'spanish': 'Spanish',
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
  'arabic': 'Arabic',
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

/**
 * Mapping of Gemini Voice IDs to Greek King/Queen Aliases.
 */
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
  const { systemPrompt, voice, voiceFocus, setSystemPrompt, setVoice, setVoiceFocus } = useSettings();
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
                  {(Object.keys(LANGUAGE_LABELS) as Template[]).sort((a,b) => LANGUAGE_LABELS[a].localeCompare(LANGUAGE_LABELS[b])).map(key => (
                    <option key={key} value={key}>
                      {LANGUAGE_LABELS[key]}
                    </option>
                  ))}
                </select>
                {voiceFocus && <div className="focus-badge">High Precision Active</div>}
              </label>

              <div className="tool-item" style={{ marginBottom: '28px' }}>
                <div className="tool-item-info">
                  <input
                    type="checkbox"
                    id="voice-focus-toggle"
                    checked={voiceFocus}
                    onChange={(e) => setVoiceFocus(e.target.checked)}
                  />
                  <label htmlFor="voice-focus-toggle">Neural Sensitivity (Voice Focus)</label>
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
                  rows={8}
                  className="sidebar-textarea"
                  placeholder="Enter custom instructions for the translator..."
                />
              </label>
            </fieldset>
          </div>

          <div className="sidebar-section" style={{ marginTop: '32px' }}>
            <h4 className="sidebar-section-title">Cognitive Tools</h4>
            <div className="tools-list">
              {tools.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Standard translation engine active.</p>
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
        
        <div className="sidebar-footer">
          <div className="version-tag">v3.0.0-Polyglot</div>
          <div className={c('connection-indicator', { connected })}>
            {connected ? 'ENGINE ONLINE' : 'ENGINE STANDBY'}
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
