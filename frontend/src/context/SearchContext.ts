import { createContext, useContext } from 'react'

export interface SearchContextValue {
  query: string
  setQuery: (query: string) => void
}

export const SearchContext = createContext<SearchContextValue | null>(null)

export function useSearchQuery(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error('useSearchQuery must be used within a SearchProvider')
  }
  return ctx
}