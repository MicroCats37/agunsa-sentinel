import { RULES } from '@/data/rules';
import type { SecurityRule } from '@/domain/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './storage';

/** Motor de reglas configurable desde el módulo de administración. */
interface RulesState {
  rules: SecurityRule[];
  updateRule: (rule: SecurityRule) => void;
  toggleRule: (ruleId: string, enabled: boolean) => void;
  addRule: (rule: SecurityRule) => void;
  removeRule: (ruleId: string) => void;
  resetAll: () => void;
}

export const useRulesStore = create<RulesState>()(
  persist(
    (set) => ({
      rules: [...RULES],
      updateRule: (rule) =>
        set((state) => ({
          rules: state.rules.map((item) => (item.id === rule.id ? rule : item)),
        })),
      toggleRule: (ruleId, enabled) =>
        set((state) => ({
          rules: state.rules.map((item) => (item.id === ruleId ? { ...item, enabled } : item)),
        })),
      addRule: (rule) => set((state) => ({ rules: [...state.rules, rule] })),
      removeRule: (ruleId) =>
        set((state) => ({ rules: state.rules.filter((item) => item.id !== ruleId) })),
      resetAll: () => set({ rules: [...RULES] }),
    }),
    {
      name: 'agunsa-sentinel:rules',
      version: 1,
      storage: persistedStorage,
      skipHydration: true,
      partialize: (state) => ({ rules: state.rules }),
    },
  ),
);

export function selectRules(state: RulesState): SecurityRule[] {
  return state.rules;
}
