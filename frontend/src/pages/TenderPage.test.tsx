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

import { fetchTender } from '../lib/api'
import { TENDERS } from '../data/testFixtures'
import TenderPage from './TenderPage'
import { renderWithProviders } from '../test/helpers'

const mockedFetchTender = vi.mocked(fetchTender)

function renderRoute(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/tenders/:id" element={<TenderPage />} />
    </Routes>,
    { initialEntries: [path] },
  )
}

beforeEach(() => {
  mockedFetchTender.mockReset()
})

describe('TenderPage', () => {
  it('renders every tender field with contractor and documents', async () => {
    mockedFetchTender.mockResolvedValue(TENDERS['1'])
    renderRoute('/tenders/TND-2024-118')

    expect(
      await screen.findByRole('heading', { name: 'Public Works', level: 1 }),
    ).toBeInTheDocument()

    for (const value of [
      'TND-2024-118',
      'NAGPUR-PWD/2024/118',
      '2024-04-15',
      '2024-06-20',
      '₹51.2 Cr',
      '₹47.8 Cr',
      '14 months',
      'WO/PWD/2024/312',
    ]) {
      expect(screen.getAllByText(value, { exact: true }).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText('Public Works', { exact: true }).length).toBeGreaterThan(0)

    expect(
      screen.getAllByRole('link', { name: /BuildRight Infra Pvt\. Ltd\./ }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: 'Documents' })).toBeInTheDocument()
    expect(screen.getAllByText('Bid evaluation summary').length).toBeGreaterThan(0)
  })

  it('shows an error state for an unknown tender', async () => {
    mockedFetchTender.mockRejectedValue(new Error('Tender TND-000 not found'))
    renderRoute('/tenders/TND-000')

    expect(await screen.findByTestId('error-state')).toHaveTextContent(
      'Tender TND-000 not found',
    )
  })
})