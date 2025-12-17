import { useEffect, useCallback, useRef } from "react";
import StateManager from "@designcombo/state";
import useStore from "../store/use-store";
import { IAudio, ITrack, ITrackItem, IVideo } from "@designcombo/types";
import { audioDataManager } from "../player/lib/audio-data";

// Track type priority - lower number = higher position (top of timeline)
const TRACK_TYPE_PRIORITY: Record<string, number> = {
  text: 1,
  caption: 2,
  image: 3,
  video: 4,
  main: 5,
  template: 6,
  composition: 7,
  helper: 8,
  illustration: 9,
  shape: 10,
  rect: 11,
  progressBar: 12,
  progressSquare: 13,
  progressFrame: 14,
  audio: 100, // Audio at the bottom
  radialAudioBars: 101,
  linealAudioBars: 102,
};

// Sort tracks so video/image appear above audio
const sortTracksByType = (tracks: ITrack[]): ITrack[] => {
  return [...tracks].sort((a, b) => {
    const priorityA = TRACK_TYPE_PRIORITY[a.type] ?? 50;
    const priorityB = TRACK_TYPE_PRIORITY[b.type] ?? 50;
    return priorityA - priorityB;
  });
};

// Global registry to prevent duplicate subscriptions
const subscriptionRegistry = new WeakMap<StateManager, Set<string>>();

export const useStateManagerEvents = (stateManager: StateManager) => {
  const { setState } = useStore();
  const isSubscribedRef = useRef(false);

  // Helper to get timeline, sort tracks, and trigger re-render
  const sortTimelineTracks = useCallback(() => {
    const timeline = useStore.getState().timeline;
    if (timeline) {
      setTimeout(() => {
        // Sort tracks if method exists
        if ('sortTracksByType' in timeline) {
          (timeline as any).sortTracksByType();
        }
        // Force re-render of canvas timeline
        if ('requestRenderAll' in timeline) {
          (timeline as any).requestRenderAll();
        }
      }, 0);
    }
  }, []);

  // Handle track item updates
  const handleTrackItemUpdate = useCallback(() => {
    const currentState = stateManager.getState();
    const mergedTrackItemsDeatilsMap = currentState.trackItemsMap;
    const filterTrakcItems = Object.values(mergedTrackItemsDeatilsMap).filter(
      (item) => {
        return item.type === "video" || item.type === "audio";
      }
    );
    audioDataManager.setItems(
      filterTrakcItems as (ITrackItem & (IVideo | IAudio))[]
    );
    audioDataManager.validateUpdateItems(
      filterTrakcItems as (ITrackItem & (IVideo | IAudio))[]
    );
    setState({
      duration: currentState.duration,
      trackItemsMap: currentState.trackItemsMap
    });
  }, [stateManager, setState]);

  const handleAddRemoveItems = useCallback(() => {
    const currentState = stateManager.getState();
    const mergedTrackItemsDeatilsMap = currentState.trackItemsMap;

    const filterTrakcItems = Object.values(mergedTrackItemsDeatilsMap).filter(
      (item) => {
        return item.type === "video" || item.type === "audio";
      }
    );
    audioDataManager.validateUpdateItems(
      filterTrakcItems as (ITrackItem & (IVideo | IAudio))[]
    );

    // Sort tracks so video appears above audio
    const sortedTracks = sortTracksByType(currentState.tracks);

    setState({
      trackItemsMap: currentState.trackItemsMap,
      trackItemIds: currentState.trackItemIds,
      tracks: sortedTracks
    });

    // Sort tracks in the timeline canvas as well
    sortTimelineTracks();
  }, [stateManager, setState, sortTimelineTracks]);

  const handleUpdateItemDetails = useCallback(() => {
    const currentState = stateManager.getState();
    setState({
      trackItemsMap: currentState.trackItemsMap
    });
  }, [stateManager, setState]);

  useEffect(() => {
    // Check if we already have subscriptions for this stateManager
    if (!subscriptionRegistry.has(stateManager)) {
      subscriptionRegistry.set(stateManager, new Set());
    }

    const registry = subscriptionRegistry.get(stateManager);
    if (!registry) return;
    const hookId = "useStateManagerEvents";

    // Prevent duplicate subscriptions
    if (registry.has(hookId)) {
      return;
    }

    registry.add(hookId);
    isSubscribedRef.current = true;

    // Subscribe to state update details
    const resizeDesignSubscription = stateManager.subscribeToUpdateStateDetails(
      (newState) => {
        setState(newState);
      }
    );

    // Subscribe to scale changes
    const scaleSubscription = stateManager.subscribeToScale((newState) => {
      setState(newState);
    });

    // Subscribe to general state changes
    const tracksSubscription = stateManager.subscribeToState((newState) => {
      setState(newState);
      // Sort tracks when state changes (e.g., on initial load)
      sortTimelineTracks();
    });

    // Subscribe to duration changes
    const durationSubscription = stateManager.subscribeToDuration(
      (newState) => {
        setState(newState);
      }
    );

    // Subscribe to track item updates
    const updateTrackItemsMap = stateManager.subscribeToUpdateTrackItem(
      handleTrackItemUpdate
    );

    // Subscribe to add/remove items
    const itemsDetailsSubscription =
      stateManager.subscribeToAddOrRemoveItems(handleAddRemoveItems);

    // Subscribe to item details updates
    const updateItemDetailsSubscription =
      stateManager.subscribeToUpdateItemDetails(handleUpdateItemDetails);

    // Sync current state immediately after subscriptions are set up
    // This handles the case where DESIGN_LOAD was dispatched before subscriptions were ready
    const currentState = stateManager.getState();
    if (currentState.trackItemIds && currentState.trackItemIds.length > 0) {
      const sortedTracks = sortTracksByType(currentState.tracks || []);
      setState({
        ...currentState,
        tracks: sortedTracks
      });
      // Trigger re-render after a short delay to ensure timeline is ready
      setTimeout(() => {
        sortTimelineTracks();
      }, 150);
    }

    // Cleanup function to unsubscribe from all events
    return () => {
      if (isSubscribedRef.current) {
        scaleSubscription.unsubscribe();
        tracksSubscription.unsubscribe();
        durationSubscription.unsubscribe();
        itemsDetailsSubscription.unsubscribe();
        updateTrackItemsMap.unsubscribe();
        updateItemDetailsSubscription.unsubscribe();
        resizeDesignSubscription.unsubscribe();

        // Remove from registry
        registry.delete(hookId);
        isSubscribedRef.current = false;
      }
    };
  }, [
    stateManager,
    setState,
    handleTrackItemUpdate,
    handleAddRemoveItems,
    handleUpdateItemDetails
  ]);
};
