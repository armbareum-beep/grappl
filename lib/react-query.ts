import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes (increased from 1 min to reduce refetches)
            gcTime: 1000 * 60 * 10, // 10 minutes (increased from 5 min)
            retry: 1,
            refetchOnWindowFocus: false, // Prevent potentially annoying refetches during development/demos
        },
    },
});
