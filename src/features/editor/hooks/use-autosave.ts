import { useEffect, useRef, useCallback, useState } from 'react';
import StateManager from '@designcombo/state';
import { IDesign } from '@designcombo/types';
import { generateId } from '@designcombo/timeline';

interface UseAutoSaveOptions {
  stateManager: StateManager;
  restaurant?: string;
  projectName?: string;
  intervalMs?: number; // Default: 30 seconds
  enabled?: boolean;
}

interface AutoSaveStatus {
  lastSaved: Date | null;
  saving: boolean;
  error: string | null;
}

export function useAutoSave({
  stateManager,
  restaurant = 'default',
  projectName = 'Untitled video',
  intervalMs = 30000, // 30 seconds default
  enabled = true,
}: UseAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>({
    lastSaved: null,
    saving: false,
    error: null,
  });

  const lastSavedJsonRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const designIdRef = useRef<string>(generateId()); // Stable ID - generated once

  const saveNow = useCallback(async (force = false) => {
    if (!stateManager) return;

    try {
      const design: IDesign = {
        id: designIdRef.current, // Use stable ID instead of generating new one
        ...stateManager.toJSON(),
      };

      // Prevent saving empty states - check if there's actual content
      const hasContent = design.trackItemIds && design.trackItemIds.length > 0;
      if (!hasContent) {
        return;
      }

      const currentJson = JSON.stringify(design);

      // Skip if nothing changed (unless forced)
      if (!force && currentJson === lastSavedJsonRef.current) {
        return;
      }

      setStatus(prev => ({ ...prev, saving: true, error: null }));

      const response = await fetch('/api/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant,
          projectName,
          design,
        }),
      });

      const result = await response.json();

      if (result.success) {
        lastSavedJsonRef.current = currentJson;
        setStatus({
          lastSaved: new Date(result.savedAt),
          saving: false,
          error: null,
        });
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatus(prev => ({
        ...prev,
        saving: false,
        error: errorMessage,
      }));
      console.error('[Auto-Save] Error:', error);
    }
  }, [stateManager, restaurant, projectName]);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial save after a short delay (to capture initial state)
    const initialTimeout = setTimeout(() => {
      saveNow(true);
    }, 5000);

    // Set up periodic saves
    intervalRef.current = setInterval(() => {
      saveNow();
    }, intervalMs);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, saveNow]);

  // Save on beforeunload (browser close/refresh)
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      // Use sendBeacon for reliable save on page unload
      if (stateManager) {
        const design: IDesign = {
          id: designIdRef.current, // Use stable ID
          ...stateManager.toJSON(),
        };

        // Don't save empty states on unload
        const hasContent = design.trackItemIds && design.trackItemIds.length > 0;
        if (!hasContent) {
          return;
        }

        navigator.sendBeacon(
          '/api/autosave',
          JSON.stringify({
            restaurant,
            projectName,
            design,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, stateManager, restaurant, projectName]);

  return {
    status,
    saveNow: () => saveNow(true),
  };
}

export default useAutoSave;
