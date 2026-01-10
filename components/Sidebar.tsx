
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

// Categorized Language Groups
const LANGUAGE_GROUPS: Record<string, { id: Template, label: string }[]> = {
  'Asian & Pacific': [
    { id: 'taglish', label: 'Filipino Taglish' },
    { id: 'japanese', label: 'Japanese' },
    { id: 'korean', label: 'Korean' },
    { id: 'mandarin', label: 'Mandarin Chinese' },
    { id: 'cantonese', label: 'Cantonese' },
    { id: 'vietnamese', label: 'Vietnamese' },
    { id: 'thai', label: 'Thai' },
    { id: 'hindi', label: 'Hindi' },
    { id: 'bengali', label: 'Bengali' },
  ],
  'European': [
    { id: 'english_uk', label: 'English (UK)' },
    { id: 'english_au', label: 'English (Australia)' },
    { id: 'french', label: 'French (France)' },
    { id: 'french_belgium', label: 'French (Belgium)' },
    { id: 'german', label: 'German' },
    { id: 'spanish', label: 'Spanish (Latin America)' },
    { id: 'spanish_eu', label: 'Spanish (Spain)' },
    { id: 'italian', label: 'Italian' },
    { id: 'portuguese', label: 'Portuguese (Brazil)' },
    { id: 'portuguese_eu', label: 'Portuguese (Portugal)' },
    { id: 'dutch', label: 'Dutch (Netherlands)' },
    { id: 'dutch_flemish', label: 'Dutch (Flemish)' },
    { id: 'russian', label: 'Russian' },
    { id: 'polish', label: 'Polish' },
    { id: 'swedish', label: 'Swedish' },
    { id: 'norwegian', label: 'Norwegian' },
    { id: 'danish', label: 'Danish' },
  ],
  'African & Middle Eastern': [
    { id: 'french_ivory_coast', label: 'French (Ivory Coast)' },
    { id: 'medumba', label: 'Cameroon Medumba' },
    { id: 'arabic', label: 'Arabic' },
    { id: 'turkish', label: 'Turkish' },
  ]
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
  const { systemPrompt, voice, voiceFocus, setSystemPrompt, setVoice } = useSettings();
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
                <div className="select-wrapper">
                  <select 
                    value={template} 
                    onChange={e => setTemplate(e.target.value as Template)} 
                    className="sidebar-select"
                  >
                    {Object.entries(LANGUAGE_GROUPS).map(([group, languages]) => (
                      <optgroup label={group} key={group}>
                        {languages.map(lang => (
                          <option key={lang.id} value={lang.id}>
                            {lang.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                {voiceFocus && <div className="focus-badge">High Precision Active</div>}
              </label>

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
          <div className="version-tag">v2.9.1-Native</div>
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
