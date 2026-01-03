import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

// --- Types ---

export type SortOption<T> = {
    label: string;
    value: string;
    comparator: (a: T, b: T) => number;
};

export interface DataControlsProps<T> {
    data: T[];
    searchKeys: (keyof T)[];
    sortOptions: SortOption<T>[];
    itemsPerPage?: number;
    initialSortValue?: string;
}

export interface UseDataControlsResult<T> {
    filteredData: T[];
    paginatedData: T[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    currentSortValue: string;
    setCurrentSortValue: (value: string) => void;
    currentPage: number;
    setCurrentPage: (page: number) => void;
    totalPages: number;
    totalItems: number;
}

// --- Hook ---

export function useDataControls<T>(props: DataControlsProps<T>): UseDataControlsResult<T> {
    const { data, searchKeys, sortOptions, itemsPerPage = 10, initialSortValue } = props;

    const [searchQuery, setSearchQuery] = useState('');
    const [currentSortValue, setCurrentSortValue] = useState(initialSortValue || sortOptions[0]?.value || '');
    const [currentPage, setCurrentPage] = useState(1);

    // Filter
    const filteredData = useMemo(() => {
        let result = data;

        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(item =>
                searchKeys.some(key => {
                    const val = item[key];
                    if (val === null || val === undefined) return false;
                    return String(val).toLowerCase().includes(lowerQuery);
                })
            );
        }

        // Sort
        const sortOption = sortOptions.find(opt => opt.value === currentSortValue);
        if (sortOption) {
            result = [...result].sort(sortOption.comparator);
        }

        return result;
    }, [data, searchQuery, currentSortValue, searchKeys, sortOptions]);

    // Pagination
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Reset page if out of bounds
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
    }

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredData.slice(start, start + itemsPerPage);
    }, [filteredData, currentPage, itemsPerPage]);

    return {
        filteredData,
        paginatedData,
        searchQuery,
        setSearchQuery,
        currentSortValue,
        setCurrentSortValue,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems
    };
}

// --- Components ---

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = '검색...' }) => (
    <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-500" />
        </div>
        <input
            type="text"
            className="bg-zinc-950/50 border border-zinc-800 text-zinc-200 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block w-full pl-10 p-2.5 placeholder-zinc-500 transition-colors"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    </div>
);

interface SortSelectProps<T> {
    options: SortOption<T>[];
    value: string;
    onChange: (value: string) => void;
}

export function SortSelect<T>({ options, value, onChange }: SortSelectProps<T>) {
    return (
        <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="bg-zinc-950/50 border border-zinc-800 text-zinc-300 text-sm rounded-lg focus:ring-violet-500 focus:border-violet-500 block p-2.5 transition-colors"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center items-center space-x-2 mt-6">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-colors"
            >
                <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-zinc-400 font-medium px-4">
                <span className="text-white">{currentPage}</span> / {totalPages}
            </span>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-400 hover:text-white transition-colors"
            >
                <ChevronRight className="w-4 h-4" />
            </button>
        </div>
    );
};
