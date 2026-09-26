import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement } from 'react'

import { SearchProvider } from '../components/layout/SearchProvider'
import { AuthProvider } from '../context/AuthContext'
import type { AuthUser } from '../lib/api'

function makeDefaultQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
}

export function Providers({
  children,
  queryClient = makeDefaultQueryClient(),
  initialEntries = ['/'],
  initialUser = null,
}: {
  children: ReactElement
  queryClient?: QueryClient
  initialEntries?: string[]
  initialUser?: AuthUser | null
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={initialUser}>
        <SearchProvider>
          <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}