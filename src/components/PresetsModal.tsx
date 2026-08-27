import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutTemplate, BookmarkPlus, Trash2, X, Check, Save, Edit2 } from 'lucide-react';
import { useTimelineStore } from '../store/timelineStore';
import { BUILTIN_PRESETS, CreatorPreset, getUserPresetsFromDB, saveUserPresetToDB, deleteUserPresetFromDB } from '../utils/presetEngine';
import { saveCurrentProjectAsTemplate, getTemplatesFromDB, deleteTemplateFromDB, applyTemplateToTimeline, ProjectTemplate } from '../utils/templateEngine';
import { AspectRatio } from '../types/timeline';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'builtin' | 'user' | 'templates' | 'social'>('builtin');
  const [userPresets, setUserPresets] = useState<CreatorPreset[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editPresetName, setEditPresetName] = useState('');

  const { tracks, selectedClipId, updateClipText, updateClipAudio, setAspectRatio, beginTransaction, commitTransaction } = useTimelineStore();

  let selectedClip = null;
  for (const t of tracks) {
    const c = t.clips.find((clip) => clip.id === selectedClipId);
    if (c) {
      selectedClip = c;
      break;
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const up = await getUserPresetsFromDB();
    setUserPresets(up);
    const tmpl = await getTemplatesFromDB();
    setTemplates(tmpl);
  };

  if (!isOpen) return null;

  const handleApplyPreset = (preset: CreatorPreset) => {
    if (!selectedClip) return;
    beginTransaction();

    if (preset.type === 'text' && selectedClip.text) {
      updateClipText(selectedClip.id, preset.data);
    } else if (preset.type === 'audio') {
      updateClipAudio(selectedClip.id, preset.data);
    }

    commitTransaction();
    onClose();
  };

  const handleSaveUserPreset = async () => {
    if (!selectedClip || !newPresetName.trim()) return;

    let presetType: CreatorPreset['type'] = 'text';
    let dataPayload: any = {};

    if (selectedClip.text) {
      presetType = 'text';
      dataPayload = { ...selectedClip.text };
    } else {
      presetType = 'audio';
      dataPayload = { ...selectedClip.audio };
    }

    const newPreset: CreatorPreset = {
      id: `user-${Date.now()}`,
      name: newPresetName.trim(),
      type: presetType,
      data: dataPayload,
      createdAt: Date.now(),
    };

    await saveUserPresetToDB(newPreset);
    setNewPresetName('');
    await loadData();
  };

  const handleRenamePreset = async (preset: CreatorPreset) => {
    if (!editPresetName.trim()) return;
    const updated = { ...preset, name: editPresetName.trim() };
    await saveUserPresetToDB(updated);
    setEditingPresetId(null);
    setEditPresetName('');
    await loadData();
  };

  const handleDeleteUserPreset = async (id: string) => {
    await deleteUserPresetFromDB(id);
    await loadData();
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    await saveCurrentProjectAsTemplate(newTemplateName.trim());
    setNewTemplateName('');
    await loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    await deleteTemplateFromDB(id);
    await loadData();
  };

  const handleApplyTemplate = (tmpl: ProjectTemplate) => {
    applyTemplateToTimeline(tmpl);
    onClose();
  };

  const handleApplySocialPreset = (ratio: AspectRatio) => {
    setAspectRatio(ratio);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-100">Creator Presets & Templates</h3>
            <p className="text-xs text-gray-400">Save and apply reusable styles, templates, and social configurations</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-dark-700 pb-3 mb-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('builtin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'builtin'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            Built-in Presets
          </button>
          <button
            onClick={() => setActiveTab('user')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'user'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            My Saved Presets ({userPresets.length})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'templates'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            Project Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'social'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-dark-800 text-gray-400 border border-dark-700 hover:text-white'
            }`}
          >
            Social Ratios
          </button>
        </div>

        {/* Tab 1: Built-in Presets */}
        {activeTab === 'builtin' && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              {selectedClip ? `Apply to Selected Clip (${selectedClip.name})` : 'Select a clip to apply presets'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {BUILTIN_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  disabled={!selectedClip}
                  className="p-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-cyan-500/50 disabled:opacity-40 rounded-xl text-left transition group"
                >
                  <span className="text-xs font-bold text-gray-200 block group-hover:text-cyan-400">
                    {preset.name}
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono">{preset.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: User Presets */}
        {activeTab === 'user' && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {selectedClip && (
              <div className="flex items-center space-x-2 bg-dark-800 p-2 rounded-xl border border-dark-700">
                <input
                  type="text"
                  placeholder="New Preset Name..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveUserPreset}
                  disabled={!newPresetName.trim()}
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg disabled:opacity-40 transition"
                >
                  Save Preset
                </button>
              </div>
            )}

            {userPresets.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No custom user presets saved yet.</p>
            ) : (
              <div className="space-y-2">
                {userPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-2.5 bg-dark-800 border border-dark-700 rounded-xl"
                  >
                    {editingPresetId === preset.id ? (
                      <div className="flex items-center space-x-2 flex-1 mr-2">
                        <input
                          type="text"
                          value={editPresetName}
                          onChange={(e) => setEditPresetName(e.target.value)}
                          className="flex-1 bg-dark-900 border border-cyan-500 rounded px-2 py-0.5 text-xs text-white outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenamePreset(preset)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-gray-200 block">{preset.name}</span>
                        <span className="text-[10px] text-cyan-400 font-mono uppercase">{preset.type}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleApplyPreset(preset)}
                        disabled={!selectedClip}
                        className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 disabled:opacity-30 rounded-lg text-xs font-semibold"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setEditingPresetId(preset.id);
                          setEditPresetName(preset.name);
                        }}
                        className="p-1 text-gray-400 hover:text-white rounded transition"
                        title="Rename Preset"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUserPreset(preset.id)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded transition"
                        title="Delete Preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Project Templates */}
        {activeTab === 'templates' && (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            <div className="flex items-center space-x-2 bg-dark-800 p-2 rounded-xl border border-dark-700">
              <input
                type="text"
                placeholder="Template Name..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim()}
                className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-lg disabled:opacity-40 transition"
              >
                Save Template
              </button>
            </div>

            {templates.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">No reusable templates created yet.</p>
            ) : (
              <div className="space-y-2">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-center justify-between p-2.5 bg-dark-800 border border-dark-700 rounded-xl"
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-200 block">{tmpl.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-mono">
                        Ratio: {tmpl.aspectRatio} • Tracks: {tmpl.tracks.length}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold"
                      >
                        Apply Template
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1 text-gray-500 hover:text-red-400 rounded transition"
                        title="Delete Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Social Ratios */}
        {activeTab === 'social' && (
          <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {[
              { label: 'YouTube Widescreen', ratio: '16:9', desc: '1920 × 1080 (16:9)' },
              { label: 'YouTube Shorts', ratio: '9:16', desc: '1080 × 1920 (9:16)' },
              { label: 'Instagram Reel / TikTok', ratio: '9:16', desc: '1080 × 1920 (9:16)' },
              { label: 'Instagram Post', ratio: '4:5', desc: '1080 × 1350 (4:5)' },
              { label: 'Square Feed', ratio: '1:1', desc: '1080 × 1080 (1:1)' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleApplySocialPreset(item.ratio as AspectRatio)}
                className="p-3 bg-dark-800 hover:bg-dark-700 border border-dark-700 hover:border-cyan-500/50 rounded-xl text-left transition group"
              >
                <span className="text-xs font-bold text-gray-200 block group-hover:text-cyan-400">
                  {item.label}
                </span>
                <span className="text-[10px] text-gray-500 font-mono block mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
