
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

const AVAILABLE_MODELS = [
  DEFAULT_LIVE_API_MODEL
];

const LANGUAGE_LABELS: Record<Template, string> = {
  'taglish': 'Filipino Taglish',
  'spanish': 'Spanish',
  'french': 'French',
  'french_ivory_coast': 'Ivorian French',
  'french_belgium': 'French Belgium',
  'medumba': 'Cameroon Medumba',
  'dutch_flemish': 'Dutch Flemish',
  'japanese': 'Japanese',
  'korean': 'Korean',
  'mandarin': 'Mandarin',
  'german': 'German',
  'italian': 'Italian',
  'portuguese': 'Portuguese',
  'russian': 'Russian',
  'hindi': 'Hindi',
  'arabic': 'Arabic',
  'turkish': 'Turkish',
  'vietnamese': 'Vietnamese',
  'polish': 'Polish',
  'thai': 'Thai',
  'bengali': 'Bengali',
  'dutch': 'Dutch (Netherlands)',
  'swedish': 'Swedish',
  'norwegian': 'Norwegian',
  'danish': 'Danish'
};

/**
 * Maps the Gemini voices to titles.
 */
const getVoiceAlias = (voice: string) => {
  const queens = [
    'Kore', 'Luna', 'Nova', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe', 
    'Despina', 'Erinome', 'Laomedeia', 'Vindemiatrix', 'Pulcherrima',
    'Algieba', 'Sadachbia', 'Sulafat'
  ];
  const kings = [
    'Zephyr', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Enceladus', 
    'Iapetus', 'Umbriel', 'Algenib', 'Rasalgethi', 'Achernar', 
    'Alnilam', 'Schedar', 'Gacrux', 'Achird', 'Zubenelgenubi', 'Sadaltager'
  ];
  
  if (queens.includes(voice)) return `Lady ${voice}`;
  if (kings.includes(voice)) return `Lord ${voice}`;
  return `Voice ${voice}`;
};

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { systemPrompt, model, voice, voiceFocus, setSystemPrompt, setModel, setVoice } =
    useSettings();
  const { tools, template, setTemplate, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { connected } = useLiveAPIContext();

  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const groupedVoices = useMemo(() => {
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
            <fieldset disabled={connected} style={{ border: 'none' }}>
              
              <label className="sidebar-label">
                Target Language
                <select 
                  value={template} 
                  onChange={e => setTemplate(e.target.value as Template)} 
                  className="sidebar-select"
                >
                  {(Object.keys(LANGUAGE_LABELS) as Template[]).map(key => (
                    <option key={key} value={key}>
                      {LANGUAGE_LABELS[key]}
                    </option>
                  ))}
                </select>
                {voiceFocus && <div className="focus-badge">High Precision Active</div>}
              </label>

              <label className="sidebar-label">
                Neural Persona Voice
                <select 
                  value={voice} 
                  onChange={e => setVoice(e.target.value)} 
                  className="sidebar-select"
                >
                  {groupedVoices.map(v => (
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
                />
              </label>
            </fieldset>
          </div>

          <div className="sidebar-section" style={{ marginTop: '20px' }}>
            <h4 className="sidebar-section-title">Cognitive Tools</h4>
            <div className="tools-list">
              {tools.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Standard translation active.</p>
              )}
              {tools.map(tool => (
                <div key={tool.name} className="tool-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={tool.isEnabled}
                      onChange={() => toggleTool(tool.name)}
                      disabled={connected}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{tool.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="sidebar-footer">
          <div style={{ opacity: 0.5 }}>v2.9.0-Native</div>
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
