import { create } from 'zustand';
import type { AppSettings } from '../../shared/types';

interface SettingsStore {
  settings?: AppSettings;
  load(): Promise<void>;
  update(settings: Partial<AppSettings>): Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  async load() {
    const config = await window.dreamstar.config.getConfig();
    set({ settings: config.settings });
  },

  async update(settings) {
    const updated = await window.dreamstar.config.updateSettings(settings);
    set({ settings: updated });
  }
}));
