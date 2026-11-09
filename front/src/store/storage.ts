import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const serverStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

// Stores are imported while Next prerenders pages, where browser storage is unavailable.
export const persistedStorage = createJSONStorage(() =>
  typeof window === 'undefined' ? serverStorage : window.localStorage,
);
