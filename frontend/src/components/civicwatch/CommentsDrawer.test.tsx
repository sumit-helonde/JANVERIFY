import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import CommentsDrawer from './CommentsDrawer'
import { CIVIC_COMMENT_THREADS } from '../../data/civicWatchComments'

const CW_0258 = CIVIC_COMMENT_THREADS['CW-0258'].map((comment) => ({ ...comment }))

function renderDrawer(comments = CW_0258, onAdd = vi.fn()) {
  const onClose = vi.fn()
  render(
    <CommentsDrawer
      onClose={onClose}
      title="Open Manhole"
      issueRef="CW-0258"
      location="Ward 18, Nagpur"
      comments={comments}
      onAdd={onAdd}
    />,
  )
  return { onAdd, onClose }
}

describe('CommentsDrawer', () => {
  it('lists every comment of the issue with author, time and count', () => {
    renderDrawer()

    expect(screen.getByRole('dialog', { name: 'Comments on Open Manhole' })).toBeInTheDocument()
    expect(screen.getByText('CW-0258')).toBeInTheDocument()
    expect(screen.getByText('Ward 18, Nagpur')).toBeInTheDocument()
    expect(screen.getByText('4 Comments')).toBeInTheDocument()

    for (const comment of CW_0258) {
      expect(screen.getByText(comment.author)).toBeInTheDocument()
      expect(screen.getByText(comment.time)).toBeInTheDocument()
      expect(screen.getByText(comment.text)).toBeInTheDocument()
    }
  })

  it('shows the authority response badge for authority comments', () => {
    renderDrawer()

    expect(screen.getByText('AUTHORITY RESPONSE')).toBeInTheDocument()
  })

  it('shows the NMC seal on authority comments and citizen initials on the rest', () => {
    renderDrawer()

    const seals = screen.getAllByTitle('Nagpur Municipal Corporation')
    expect(seals).toHaveLength(1)
    expect(seals[0]).toHaveTextContent('NMC')

    for (const comment of CW_0258) {
      const row = screen.getByText(comment.author).closest('li')
      expect(row).not.toBeNull()
      const seal = row?.querySelector('[title="Nagpur Municipal Corporation"]')
      if (comment.authorKind === 'AUTHORITY') expect(seal).not.toBeNull()
      else expect(seal).toBeNull()
    }
  })

  it('keeps the verified badge on the manhole thread', () => {
    render(
      <CommentsDrawer
        onClose={() => {}}
        title="Open Manhole"
        issueRef="CW-0258"
        location="Ward 18, Nagpur"
        comments={CIVIC_COMMENT_THREADS['CW-0258'].map((comment) => ({ ...comment }))}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText('CITIZEN VERIFIED')).toBeInTheDocument()
    expect(screen.getByText('Great platform. Work done by the authority within 4 hours after posting.')).toBeInTheDocument()
  })

  it('keeps the follow-up badge on the road damage thread', () => {
    for (const [issueRef, title, location, followUp] of [
      ['CW-0312', 'Road Damage', 'Ward 12, Nagpur', 'I’ll verify the location again after the repair is marked complete.'],
    ] as const) {
      const view = render(
        <CommentsDrawer
          onClose={() => {}}
          title={title}
          issueRef={issueRef}
          location={location}
          comments={CIVIC_COMMENT_THREADS[issueRef].map((comment) => ({ ...comment }))}
          onAdd={() => {}}
        />,
      )
      expect(view.getByText('FOLLOW-UP')).toBeInTheDocument()
      expect(view.getByText('AUTHORITY RESPONSE')).toBeInTheDocument()
      expect(view.getByText(followUp)).toBeInTheDocument()
      view.unmount()
    }
  })

  it('appends a new comment, increments the count and clears the input', async () => {
    const user = userEvent.setup()
    const { onAdd } = renderDrawer()

    const input = screen.getByPlaceholderText('Add a comment...')
    await user.type(input, 'Repair crew reached the spot today.')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(onAdd).toHaveBeenCalledWith('Repair crew reached the spot today.')
    expect(input).toHaveValue('')
  })

  it('disables send until a comment is typed', () => {
    renderDrawer()
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('closes from the close button, the backdrop and the escape key', async () => {
    const user = userEvent.setup()
    const { onClose } = renderDrawer()

    await user.click(screen.getAllByRole('button', { name: 'Close comments' })[1])
    expect(onClose).toHaveBeenCalledTimes(1)

    await user.click(document.querySelector('button[aria-hidden="true"]') as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(2)

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('shows an empty state for an issue without seeded comments', () => {
    render(
      <CommentsDrawer
        onClose={() => {}}
        title="Water Leakage"
        issueRef="CW-0400"
        location="Ward 30, Nagpur"
        comments={[]}
        onAdd={() => {}}
      />,
    )
    expect(screen.getByText('No comments yet. Start the conversation below.')).toBeInTheDocument()
  })
})
