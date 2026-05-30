import type { DreamstarApi } from '../../preload/types';

declare global {
  interface Window {
    dreamstar: DreamstarApi;
  }
}

export type { DreamstarApi };
