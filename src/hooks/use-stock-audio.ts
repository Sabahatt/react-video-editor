import { useState, useCallback } from "react";
import { IAudio } from "@designcombo/types";

interface StockAudio extends Partial<IAudio> {
  preview?: string;
  metadata?: {
    jamendo_id?: string;
    author: string;
    mood: string;
    duration: number;
    album?: string;
    genres?: string[];
    license?: string;
  };
}

interface StockAudioResponse {
  audios: StockAudio[];
  total_results: number;
  page: number;
  per_page: number;
  next_page: number | null;
  prev_page: number | null;
}

interface UseStockAudioReturn {
  audios: StockAudio[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchAudio: (query: string, page?: number) => Promise<void>;
  loadPopularAudio: (page?: number) => Promise<void>;
  searchAudioAppend: (query: string, page?: number) => Promise<void>;
  loadPopularAudioAppend: (page?: number) => Promise<void>;
  clearAudio: () => void;
  refreshPopularAudio: (page?: number) => Promise<void>;
}

// Cache for popular audio to avoid unnecessary API calls
interface PopularAudioCache {
  data: StockAudioResponse | null;
  timestamp: number;
  page: number;
}

const popularAudioCache: PopularAudioCache = {
  data: null,
  timestamp: 0,
  page: 1
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Function to clear the cache
const clearPopularAudioCache = () => {
  popularAudioCache.data = null;
  popularAudioCache.timestamp = 0;
  popularAudioCache.page = 1;
};

/**
 * Hook for fetching and managing stock audio from Jamendo with caching support.
 *
 * Features:
 * - Caches popular audio for 5 minutes to avoid unnecessary API calls
 * - Supports search functionality with real-time results
 * - Provides pagination for browsing large result sets
 * - Includes error handling and loading states
 */
export function useStockAudio(): UseStockAudioReturn {
  const [audios, setAudios] = useState<StockAudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const fetchAudio = useCallback(async (url: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockAudioResponse = await response.json();

      setAudios(data.audios);
      setTotalResults(data.total_results);
      setCurrentPage(data.page);
      setHasNextPage(!!data.next_page);
      setHasPrevPage(!!data.prev_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audio");
      setAudios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAudio = useCallback(
    async (query: string, page = 1) => {
      const url = `/api/jamendo-audio?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
      await fetchAudio(url);
    },
    [fetchAudio]
  );

  const searchAudioAppend = useCallback(async (query: string, page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/jamendo-audio?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockAudioResponse = await response.json();

      setAudios((prevAudios) => [...prevAudios, ...data.audios]);
      setTotalResults(data.total_results);
      setCurrentPage(data.page);
      setHasNextPage(!!data.next_page);
      setHasPrevPage(!!data.prev_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audio");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPopularAudio = useCallback(async (page = 1) => {
    // Check if we have cached data for this page and it's still valid
    const now = Date.now();
    const isCacheValid =
      popularAudioCache.data &&
      popularAudioCache.page === page &&
      now - popularAudioCache.timestamp < CACHE_DURATION;

    if (isCacheValid && popularAudioCache.data) {
      // Use cached data
      const data = popularAudioCache.data;
      setAudios(data.audios);
      setTotalResults(data.total_results);
      setCurrentPage(data.page);
      setHasNextPage(!!data.next_page);
      setHasPrevPage(!!data.prev_page);
      setError(null);
      return;
    }

    // Fetch fresh data
    const url = `/api/jamendo-audio?page=${page}&per_page=20`;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockAudioResponse = await response.json();

      // Cache the data
      popularAudioCache.data = data;
      popularAudioCache.timestamp = now;
      popularAudioCache.page = page;

      setAudios(data.audios);
      setTotalResults(data.total_results);
      setCurrentPage(data.page);
      setHasNextPage(!!data.next_page);
      setHasPrevPage(!!data.prev_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audio");
      setAudios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPopularAudioAppend = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const url = `/api/jamendo-audio?page=${page}&per_page=20`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockAudioResponse = await response.json();

      setAudios((prevAudios) => [...prevAudios, ...data.audios]);
      setTotalResults(data.total_results);
      setCurrentPage(data.page);
      setHasNextPage(!!data.next_page);
      setHasPrevPage(!!data.prev_page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audio");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAudio = useCallback(() => {
    setAudios([]);
    setError(null);
    setTotalResults(0);
    setCurrentPage(1);
    setHasNextPage(false);
    setHasPrevPage(false);
    // Also clear the cache when clearing audio
    clearPopularAudioCache();
  }, []);

  const refreshPopularAudio = useCallback(
    async (page = 1) => {
      // Clear cache and fetch fresh data
      clearPopularAudioCache();
      await loadPopularAudio(page);
    },
    [loadPopularAudio]
  );

  return {
    audios,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchAudio,
    loadPopularAudio,
    searchAudioAppend,
    loadPopularAudioAppend,
    clearAudio,
    refreshPopularAudio
  };
}
