/**
 * IndexedDB Persister for React Query
 * 브라우저를 닫아도 데이터가 유지되어 앱 재시작 시 즉시 로딩
 */

import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const CACHE_KEY = 'grapplay-query-cache';

// 캐시 유효기간: 24시간 (하루 지나면 새로 받아옴)
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24;

/**
 * IndexedDB 기반 Persister
 * - 앱 종료 후에도 데이터 유지
 * - 앱 시작 시 저장된 데이터로 즉시 렌더링
 * - 백그라운드에서 새 데이터 fetch
 */
export const indexedDBPersister: Persister = {
    persistClient: async (client: PersistedClient) => {
        try {
            await set(CACHE_KEY, client);
        } catch (error) {
            console.warn('[Persister] Failed to save cache:', error);
        }
    },

    restoreClient: async (): Promise<PersistedClient | undefined> => {
        try {
            const client = await get<PersistedClient>(CACHE_KEY);
            return client;
        } catch (error) {
            console.warn('[Persister] Failed to restore cache:', error);
            return undefined;
        }
    },

    removeClient: async () => {
        try {
            await del(CACHE_KEY);
        } catch (error) {
            console.warn('[Persister] Failed to remove cache:', error);
        }
    },
};
