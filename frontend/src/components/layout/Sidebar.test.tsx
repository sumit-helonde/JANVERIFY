import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Sidebar from './Sidebar'
import { Providers } from '../../test/render'
import { CATEGORIES } from '../../data/mockDashboard'

describe('Sidebar', () => {
  it('renders main navigation, categories, tools and brand promise', () => {
    render(
      <Providers>
        <Sidebar open onClose={() => {}} />
      </Providers>,
    )

    for (const item of ['Dashboard', 'Projects', 'Compare', 'Reports', 'My Watchlist']) {
      expect(screen.getByRole('link', { name: item })).toBeInTheDocument()
    }

    for (const cat of [
      'Roads',
      'Bridges',
      'Schools',
      'Hospitals',
      'Water Plants',
      'Water Supply',
      'Public Buildings',
      'Other Infrastructure',
    ]) {
      expect(screen.getByRole('link', { name: cat })).toBeInTheDocument()
    }

    for (const tool of ['Submit Evidence', 'Submit Inspection']) {
      expect(screen.getByRole('link', { name: tool })).toBeInTheDocument()
    }

    expect(screen.queryByRole('link', { name: 'Audit Logs' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()

    expect(screen.getByText('Independent.')).toBeInTheDocument()
    expect(screen.getByText('Non-partisan.')).toBeInTheDocument()
    expect(screen.getByText('Evidence-first.')).toBeInTheDocument()
  })

  it('gives every category a lucide icon and marks the active category', () => {
    render(
      <Providers initialEntries={['/projects?category=Roads']}>
        <Sidebar open onClose={() => {}} />
      </Providers>,
    )

    const categories = screen.getByRole('navigation', { name: 'Categories' })
    const links = within(categories).getAllByRole('link')
    expect(links).toHaveLength(8)

    for (const [index, cat] of CATEGORIES.entries()) {
      const link = links[index]
      expect(link).toHaveTextContent(cat.label)
      const icon = link.querySelector('svg')
      expect(icon).not.toBeNull()
      expect(icon).toHaveAttribute('aria-hidden', 'true')
      expect(icon).toHaveAttribute('stroke-width', '1.9')
      expect(icon).toHaveStyle({ color: cat.color })
    }

    const active = within(categories).getByRole('link', { name: 'Roads' })
    expect(active).toHaveAttribute('aria-current', 'page')
    expect(active.className).toContain('text-jv-blue')
    expect(within(categories).getByRole('link', { name: 'Bridges' })).not.toHaveAttribute('aria-current')
  })

  it('shows Audit Logs and a sign out button for privileged users', () => {
    render(
      <Providers
        initialUser={{
          id: 1,
          email: 'synthetic.admin.001@janverify.test',
          full_name: 'Synthetic Admin',
          role: 'admin',
          status: 'active',
        }}
      >
        <Sidebar open onClose={() => {}} />
      </Providers>,
    )

    expect(screen.getByRole('link', { name: 'Audit Logs' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.getByText('JANVERIFY NEUTRAL TEAM')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sign in' })).not.toBeInTheDocument()
  })
})