import { useEffect, useRef, useCallback, useState } from 'react';
import StateManager from '@designcombo/state';
import { IDesign } from '@designcombo/types';
import { generateId } from '@designcombo/timeline';

interface UseAutoSaveOptions {
  stateManager: StateManager;
  restaurant?: string;
  projectName?: string;
  brand?: any; // Brand data for context-aware stock search
  script?: string | null; // AI script for voice generation
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
  brand = null,
  script = null,
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

  // Use refs to always get latest values in callbacks
  const restaurantRef = useRef(restaurant);
  const projectNameRef = useRef(projectName);
  const brandRef = useRef(brand);
  const scriptRef = useRef(script);

  // Keep refs in sync with props
  useEffect(() => {
    restaurantRef.current = restaurant;
    projectNameRef.current = projectName;
    brandRef.current = brand;
    scriptRef.current = script;

    // Store last used restaurant in localStorage for loading on refresh
    if (restaurant && restaurant !== 'default') {
      localStorage.setItem('lastAutosaveRestaurant', restaurant);
    }
  }, [restaurant, projectName, brand, script]);

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

      // Use refs to get latest values
      const response = await fetch('/api/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant: restaurantRef.current,
          projectName: projectNameRef.current,
          design,
          brand: brandRef.current,
          script: scriptRef.current,
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
  }, [stateManager]);

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
            restaurant: restaurantRef.current,
            projectName: projectNameRef.current,
            design,
            brand: brandRef.current,
            script: scriptRef.current,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, stateManager]);

  return {
    status,
    saveNow: () => saveNow(true),
  };
}

export default useAutoSave;
