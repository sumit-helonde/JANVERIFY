import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import TopNav from './TopNav'
import { Providers } from '../../test/render'

describe('TopNav', () => {
  it('renders the JANVERIFY brand and primary navigation as links', () => {
    render(
      <Providers>
        <TopNav onMenuClick={() => {}} />
      </Providers>,
    )
    expect(screen.getByRole('link', { name: 'JANVERIFY' })).toBeInTheDocument()
    for (const item of ['Home', 'Projects', 'Compare', 'Reports', 'About']) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument()
    }
  })

  it('renders the search input and Nagpur location', () => {
    render(
      <Providers>
        <TopNav onMenuClick={() => {}} />
      </Providers>,
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search projects' }),
    ).toHaveProperty('placeholder', 'Search projects...')
    expect(screen.getByText('Nagpur')).toBeInTheDocument()
  })

  it('types into the shared search box without crashing', async () => {
    const user = userEvent.setup()
    render(
      <Providers>
        <TopNav onMenuClick={() => {}} />
      </Providers>,
    )
    const input = screen.getByRole('searchbox')
    await user.type(input, 'ward')
    expect(input).toHaveValue('ward')
  })

  it('invokes onMenuClick from the mobile menu button', async () => {
    const user = userEvent.setup()
    const onMenuClick = vi.fn()
    render(
      <Providers>
        <TopNav onMenuClick={onMenuClick} />
      </Providers>,
    )
    await user.click(screen.getByRole('button', { name: 'Open navigation menu' }))
    expect(onMenuClick).toHaveBeenCalledTimes(1)
  })
})