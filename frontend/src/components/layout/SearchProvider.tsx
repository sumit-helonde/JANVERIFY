import { useMemo, useState, type ReactNode } from 'react'

import { SearchContext } from '../../context/SearchContext'

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('')

  const value = useMemo(() => ({ query, setQuery }), [query])

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}