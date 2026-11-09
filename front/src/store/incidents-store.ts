import { INCIDENTS } from '@/data/incidents';
import { canTransition, transitionStatus } from '@/domain/incident-status';
import type { Incident, IncidentStatus } from '@/domain/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { persistedStorage } from './storage';

/**
 * Gestión del ciclo de vida de los incidentes.
 *
 * La máquina de estados vive en `domain/incident-status.ts`: el store sólo
 * aplica transiciones válidas y deja constancia de cada acción del operador.
 */
interface IncidentsState {
  incidents: Incident[];
  simulatedCounter: number;
  /** Identificadores de incidentes que el operador ya revisó. */
  readIncidentIds: string[];
  addIncident: (incident: Incident) => void;
  setStatus: (incidentId: string, status: IncidentStatus) => boolean;
  assign: (incidentId: string, userId: string | null) => void;
  addNote: (incidentId: string, text: string, authorId: string, at: string) => void;
  markRead: (incidentId: string) => void;
  markAllRead: (incidentIds: readonly string[]) => void;
  resetAll: () => void;
}

export const useIncidentsStore = create<IncidentsState>()(
  persist(
    (set, get) => ({
      incidents: [...INCIDENTS],
      simulatedCounter: 0,
      readIncidentIds: [],
      addIncident: (incident) =>
        set((state) => {
          // El motor de simulación puede reemitir un incidente al rebobinar
          // la línea de tiempo: el identificador es único y no se duplica.
          if (state.incidents.some((item) => item.id === incident.id)) return state;
          return {
            incidents: [incident, ...state.incidents],
            simulatedCounter: incident.simulated
              ? state.simulatedCounter + 1
              : state.simulatedCounter,
          };
        }),
      setStatus: (incidentId, status) => {
        const incident = get().incidents.find((item) => item.id === incidentId);
        if (!incident) return false;
        if (!canTransition(incident.status, status)) return false;
        const next = transitionStatus(incident.status, status);
        if (next === null) return false;
        set((state) => ({
          incidents: state.incidents.map((item) =>
            item.id === incidentId ? { ...item, status: next } : item,
          ),
        }));
        return true;
      },
      assign: (incidentId, userId) =>
        set((state) => ({
          incidents: state.incidents.map((item) =>
            item.id === incidentId ? { ...item, assigneeId: userId } : item,
          ),
        })),
      addNote: (incidentId, text, authorId, at) =>
        set((state) => ({
          incidents: state.incidents.map((item) =>
            item.id === incidentId
              ? { ...item, notes: [...item.notes, { at, authorId, text }] }
              : item,
          ),
        })),
      markRead: (incidentId) =>
        set((state) =>
          state.readIncidentIds.includes(incidentId)
            ? state
            : { readIncidentIds: [...state.readIncidentIds, incidentId] },
        ),
      markAllRead: (incidentIds) =>
        set((state) => ({
          readIncidentIds: [...new Set([...state.readIncidentIds, ...incidentIds])],
        })),
      resetAll: () => set({ incidents: [...INCIDENTS], simulatedCounter: 0, readIncidentIds: [] }),
    }),
    {
      name: 'agunsa-sentinel:incidents',
      version: 1,
      storage: persistedStorage,
      skipHydration: true,
      partialize: (state) => ({
        incidents: state.incidents,
        simulatedCounter: state.simulatedCounter,
        readIncidentIds: state.readIncidentIds,
      }),
    },
  ),
);

export function selectIncidents(state: IncidentsState): Incident[] {
  return state.incidents;
}
