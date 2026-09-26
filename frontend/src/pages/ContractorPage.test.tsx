import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Route, Routes } from 'react-router-dom'

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>()
  return {
    ...actual,
    fetchProjects: vi.fn(),
    fetchProject: vi.fn(),
    fetchRelatedProjects: vi.fn(),
    fetchContractor: vi.fn(),
    fetchTender: vi.fn(),
    fetchPageInfo: vi.fn(),
    fetchDashboardSummary: vi.fn(),
    fetchProjectEvidence: vi.fn(),
    fetchProjectTimeline: vi.fn(),
    fetchProjectDecision: vi.fn(),
    fetchProjectMap: vi.fn(),
  }
})

import { fetchContractor } from '../lib/api'
import { CONTRACTORS } from '../data/testFixtures'
import ContractorPage from './ContractorPage'
import { renderWithProviders } from '../test/helpers'

const mockedFetchContractor = vi.mocked(fetchContractor)

function renderRoute(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/contractors/:id" element={<ContractorPage />} />
    </Routes>,
    { initialEntries: [path] },
  )
}

beforeEach(() => {
  mockedFetchContractor.mockReset()
})

describe('ContractorPage', () => {
  it('renders all required sections without a contractor score', async () => {
    mockedFetchContractor.mockResolvedValue(CONTRACTORS['1'])
    renderRoute('/contractors/1')

    expect(
      await screen.findByRole('heading', { name: 'BuildRight Infra Pvt. Ltd.', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 · Nagpur, Maharashtra')).toBeInTheDocument()

    for (const section of [
      'Projects',
      'Contracts',
      'Awards',
      'Payments',
      'Delays',
      'Inspection records',
      'Documentation',
    ]) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument()
    }

    // No good/bad rating is ever derived for a contractor.
    expect(screen.queryByText(/score/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument()

    // Linked project navigable.
    expect(screen.getByRole('link', { name: 'Ward 24 Road Development' })).toBeInTheDocument()
  })

  it('shows an error state for an unknown contractor', async () => {
    mockedFetchContractor.mockRejectedValue(new Error('Contractor CTR-999 not found'))
    renderRoute('/contractors/CTR-999')

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Contractor CTR-999 not found',
    )
  })
})