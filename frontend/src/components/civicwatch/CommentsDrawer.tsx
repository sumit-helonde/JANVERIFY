import { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Building2,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  X,
} from 'lucide-react'

import type { CivicComment, CivicCommentBadge } from '../../data/civicWatchComments'

type ThreadTone = 'citizen' | 'authority' | 'verified' | 'follow-up'

const CARD_STYLES: Record<ThreadTone, string> = {
  citizen: 'border-l-2 border-l-jv-blue/20 bg-white',
  authority: 'border-l-2 border-l-jv-blue/65 bg-[#f7faff]',
  verified: 'border-l-2 border-l-jv-green/60 bg-[#f8fcf9]',
  'follow-up': 'border-l-2 border-l-amber-500/50 bg-[#fffdf8]',
}

const NODE_STYLES: Record<ThreadTone, string> = {
  citizen: 'bg-jv-blue/70',
  authority: 'bg-jv-blue',
  verified: 'bg-jv-green',
  'follow-up': 'bg-amber-500/80',
}

const AVATAR_STYLES: Record<ThreadTone, string> = {
  citizen: 'bg-white text-jv-navy ring-1 ring-inset ring-jv-border',
  authority: 'bg-jv-navy text-white',
  verified: 'bg-jv-green/10 text-jv-green ring-1 ring-inset ring-jv-green/20',
  'follow-up': 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
}

const BADGE_STYLES: Record<CivicCommentBadge, string> = {
  'AUTHORITY RESPONSE': 'border-jv-blue/25 bg-jv-blue/[0.07] text-jv-blue',
  'CITIZEN VERIFIED': 'border-jv-green/30 bg-jv-green/[0.08] text-jv-green',
  'FOLLOW-UP': 'border-amber-300 bg-amber-50 text-amber-700',
}

const BADGE_ICONS: Record<CivicCommentBadge, typeof ShieldCheck> = {
  'AUTHORITY RESPONSE': Building2,
  'CITIZEN VERIFIED': ShieldCheck,
  'FOLLOW-UP': Clock,
}

function toneFor(comment: CivicComment): ThreadTone {
  if (comment.badge === 'AUTHORITY RESPONSE' || comment.authorKind === 'AUTHORITY') return 'authority'
  if (comment.badge === 'CITIZEN VERIFIED') return 'verified'
  if (comment.badge === 'FOLLOW-UP') return 'follow-up'
  return 'citizen'
}

function authorTypeLabel(comment: CivicComment): string {
  return comment.authorKind === 'AUTHORITY' ? 'Authority / Worker' : 'Citizen'
}

function initials(author: string): string {
  return author
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

interface CommentsDrawerProps {
  onClose: () => void
  title: string
  issueRef: string
  location: string
  comments: CivicComment[]
  onAdd: (text: string) => void
  imageUrl?: string
  status?: string
}

export default function CommentsDrawer({
  onClose,
  title,
  issueRef,
  location,
  comments,
  onAdd,
  imageUrl,
  status,
}: CommentsDrawerProps) {
  const [draft, setDraft] = useState('')
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartRef = useRef<number | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const threadVerified = comments.some((comment) => comment.badge === 'CITIZEN VERIFIED')

  useEffect(() => {
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 120)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [comments.length])

  function send() {
    const text = draft.trim()
    if (!text) return
    onAdd(text)
    setDraft('')
  }

  function endDrag() {
    const moved = dragOffset
    dragStartRef.current = null
    setDragOffset(0)
    if (moved > 80 || moved < 6) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Comments on ${title}`}
    >
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="jv-comments-backdrop absolute inset-0 h-full w-full cursor-default bg-jv-navy/40"
      />

      <section
        className="jv-comments-panel relative flex h-[90vh] w-full flex-col overflow-hidden rounded-t-[26px] border border-jv-border/80 bg-[#f7f9fb] shadow-[0_28px_70px_-28px_rgba(10,25,50,0.35)] sm:h-full sm:max-w-[452px] sm:rounded-none sm:rounded-l-2xl"
        style={dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined}
      >
        <button
          type="button"
          aria-label="Close comments"
          onPointerDown={(event) => {
            dragStartRef.current = event.clientY
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            if (dragStartRef.current === null) return
            const delta = event.clientY - dragStartRef.current
            setDragOffset(delta > 0 ? Math.min(delta, 160) : 0)
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="flex shrink-0 touch-none justify-center rounded-t-[26px] pt-3 sm:hidden"
        >
          <span className="h-1.5 w-11 rounded-full bg-jv-navy/20" aria-hidden />
        </button>

        <header className="shrink-0 border-b border-jv-border/70 bg-white px-5 pb-4 pt-4 sm:px-6 sm:pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-jv-blue">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                CivicWatch
              </p>
              <h2 className="mt-2 text-[22px] font-semibold leading-7 tracking-[-0.01em] text-jv-navy sm:text-[24px]">
                Comments
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-jv-muted">
                <span className="font-semibold tabular-nums text-jv-navy">{issueRef}</span>
                <span aria-hidden className="text-jv-border">
                  ·
                </span>
                <span className="min-w-0 truncate">{title}</span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-jv-muted">
                <MapPin className="h-3.5 w-3.5 text-jv-blue/60" aria-hidden />
                {location}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close comments"
                className="rounded-lg border border-transparent p-1.5 text-jv-muted transition-colors duration-150 hover:border-jv-border hover:bg-jv-navy/[0.04] hover:text-jv-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jv-blue motion-reduce:transition-none motion-reduce:duration-0"
              >
                <X className="h-[18px] w-[18px]" aria-hidden />
              </button>
              {threadVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-md border border-jv-green/30 bg-jv-green/[0.08] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-jv-green">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Citizen Verified
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {imageUrl || status ? (
          <div className="flex shrink-0 items-center gap-3 border-b border-jv-border/60 bg-white/60 px-5 py-3 sm:px-6">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-[10px] border border-jv-border object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-jv-muted">
                {title}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-jv-navy/80">{location}</p>
            </div>
            {status ? (
              <span className="shrink-0 rounded-md border border-jv-border bg-white px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-jv-navy/70">
                {status}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-3 border-b border-jv-border/60 bg-white/40 px-5 py-3.5 sm:px-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-jv-blue/20 bg-jv-blue/[0.06] text-jv-blue">
            <MessageCircle className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-jv-navy">
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </p>
            <p className="text-[11px] text-jv-muted">Community discussion around this report</p>
          </div>
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center rounded-[14px] border border-dashed border-jv-border bg-white/60 px-6 py-10 text-center">
              <MessageCircle className="h-5 w-5 text-jv-border" aria-hidden />
              <p className="mt-2 text-xs text-jv-muted">No comments yet. Start the conversation below.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {comments.map((comment, index) => {
                const tone = toneFor(comment)
                const BadgeIcon = comment.badge ? BADGE_ICONS[comment.badge] : null
                return (
                  <li key={comment.id} className="relative pl-7">
                    {index < comments.length - 1 ? (
                      <span
                        className="absolute bottom-[-16px] left-[9px] top-[31px] w-px bg-jv-border"
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`absolute left-[5px] top-[26px] h-2.5 w-2.5 rounded-full ring-4 ring-[#f7f9fb] ${NODE_STYLES[tone]}`}
                      aria-hidden
                    />

                    <article
                      className={`rounded-[14px] border border-jv-border/80 px-4 py-4 shadow-[0_1px_2px_rgba(16,32,58,0.04)] transition-colors duration-150 hover:border-jv-blue/25 motion-reduce:transition-none motion-reduce:duration-0 ${CARD_STYLES[tone]}`}
                    >
                      <div className="flex items-center gap-2.5">
                        {comment.authorKind === 'AUTHORITY' ? (
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[8px] font-bold leading-none tracking-[0.02em] ring-1 ring-inset ring-white/20 ${AVATAR_STYLES.authority}`}
                            title="Nagpur Municipal Corporation"
                            aria-hidden
                          >
                            NMC
                          </span>
                        ) : (
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${AVATAR_STYLES[tone]}`}
                            aria-hidden
                          >
                            {initials(comment.author)}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold leading-4 text-jv-navy">
                            {comment.author}
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-jv-muted">
                            {authorTypeLabel(comment)}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] tabular-nums text-jv-muted">
                          {comment.time}
                        </span>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words text-[13.5px] leading-[1.65] text-jv-navy/90">
                        {comment.text}
                      </p>

                      {comment.badge && BadgeIcon ? (
                        <span
                          className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${BADGE_STYLES[comment.badge]}`}
                        >
                          <BadgeIcon className="h-3 w-3" aria-hidden />
                          {comment.badge}
                        </span>
                      ) : null}
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          className="shrink-0 border-t border-jv-border/70 bg-white px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-4 sm:px-6"
        >
          <div className="flex items-end gap-2 rounded-[14px] border border-jv-border bg-white p-1.5 shadow-[0_1px_2px_rgba(16,32,58,0.05)] transition-colors duration-150 focus-within:border-jv-blue/45 motion-reduce:transition-none motion-reduce:duration-0">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              rows={1}
              placeholder="Add a comment..."
              aria-label="Add a comment"
              className="max-h-28 min-h-[38px] w-full resize-none overflow-y-auto border-0 bg-transparent px-2 py-2 text-[13px] leading-5 text-jv-navy outline-none placeholder:text-jv-muted/80"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[10px] bg-jv-navy px-3 text-[12px] font-semibold text-white transition-[background-color,transform,opacity] duration-150 hover:bg-jv-blue active:scale-[0.98] disabled:opacity-40 motion-reduce:transition-none motion-reduce:duration-0"
            >
              Send
              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
