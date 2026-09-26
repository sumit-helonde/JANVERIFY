import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

import { Providers } from './render'

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  options: { queryClient?: QueryClient; initialEntries?: string[] } = {},
) {
  return render(
    <Providers
      queryClient={options.queryClient}
      initialEntries={options.initialEntries}
    >
      {ui}
    </Providers>,
  )
}