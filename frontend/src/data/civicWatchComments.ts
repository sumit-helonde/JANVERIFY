import type { CivicCategoryKey } from './civicWatchData'

export type CivicCommentAuthorKind = 'CITIZEN' | 'AUTHORITY'

export type CivicCommentBadge = 'AUTHORITY RESPONSE' | 'CITIZEN VERIFIED' | 'FOLLOW-UP'

export interface CivicComment {
  id: string
  author: string
  authorKind: CivicCommentAuthorKind
  time: string
  text: string
  badge?: CivicCommentBadge
}

export const CIVIC_COMMENT_THREADS: Readonly<Record<string, readonly CivicComment[]>> = {
  'CW-0258': [
    {
      id: 'CW-0258-c1',
      author: 'Pooja Deshmukh',
      authorKind: 'CITIZEN',
      time: '49h ago',
      text: 'The cover is completely missing near the bus stop. It is dark after 7 pm and nobody can see the hole.',
    },
    {
      id: 'CW-0258-c2',
      author: 'NMC Sewerage Department',
      authorKind: 'AUTHORITY',
      time: '46h ago',
      text: 'Crew dispatched within 4 hours of the report. The cover has been replaced and the surrounding surface has been sealed.',
      badge: 'AUTHORITY RESPONSE',
    },
    {
      id: 'CW-0258-c3',
      author: 'Mohit Gupta',
      authorKind: 'CITIZEN',
      time: '45h ago',
      text: 'Visited this morning. The cover is back in place and the edge is properly sealed, no gap left around it.',
    },
    {
      id: 'CW-0258-c4',
      author: 'Sunita Wankhede',
      authorKind: 'CITIZEN',
      time: '40h ago',
      text: 'Great platform. Work done by the authority within 4 hours after posting.',
      badge: 'CITIZEN VERIFIED',
    },
  ],
  'CW-0305': [
    {
      id: 'CW-0305-c1',
      author: 'Suresh Nikam',
      authorKind: 'CITIZEN',
      time: '28h ago',
      text: 'Waste is spread across the road after yesterday’s market closing. The smell is unbearable for the shop owners.',
    },
    {
      id: 'CW-0305-c2',
      author: 'Kavita Rane',
      authorKind: 'CITIZEN',
      time: '26h ago',
      text: 'Adding a photo from this morning. Nothing has been cleared, and vehicles are pushing the waste towards the drain.',
    },
    {
      id: 'CW-0305-c3',
      author: 'NMC Sanitation Cell',
      authorKind: 'AUTHORITY',
      time: '20h ago',
      text: 'A collection vehicle is scheduled for the next night shift. The market clearing point is also being reviewed with the ward office.',
      badge: 'AUTHORITY RESPONSE',
    },
    {
      id: 'CW-0305-c4',
      author: 'Imran Qureshi',
      authorKind: 'CITIZEN',
      time: '12h ago',
      text: 'Target time has passed, but action is not completed yet.',
      badge: 'FOLLOW-UP',
    },
  ],
  'CW-0312': [
    {
      id: 'CW-0312-c1',
      author: 'Prachi Joshi',
      authorKind: 'CITIZEN',
      time: '3d ago',
      text: 'The road surface near the school gate has broken up badly. Children walk on this stretch every morning.',
    },
    {
      id: 'CW-0312-c2',
      author: 'Sandeep Pawar',
      authorKind: 'CITIZEN',
      time: '3d ago',
      text: 'Confirmed. Two-wheelers slip here when it rains, and autos slow down right at the school crossing.',
    },
    {
      id: 'CW-0312-c3',
      author: 'NMC Roads Division',
      authorKind: 'AUTHORITY',
      time: '2d ago',
      text: 'Patching work has been completed on the damaged stretch. A final top layer is scheduled after the monsoon recedes.',
      badge: 'AUTHORITY RESPONSE',
    },
    {
      id: 'CW-0312-c4',
      author: 'Meera Kulkarni',
      authorKind: 'CITIZEN',
      time: '5h ago',
      text: 'I’ll verify the location again after the repair is marked complete.',
      badge: 'FOLLOW-UP',
    },
  ],
}

const CATEGORY_THREAD_FALLBACK: Partial<Record<CivicCategoryKey, string>> = {
  manholes: 'CW-0258',
  garbage: 'CW-0305',
}

const SEEDED_ISSUE_REFS = new Set<string>([
  ...Object.keys(CIVIC_COMMENT_THREADS),
  ...Object.values(CATEGORY_THREAD_FALLBACK),
])

export function commentThreadKey(issueRef: string, categoryKey?: CivicCategoryKey): string {
  if (CIVIC_COMMENT_THREADS[issueRef]) return issueRef
  if (!SEEDED_ISSUE_REFS.has(issueRef)) return issueRef
  const fallback = categoryKey ? CATEGORY_THREAD_FALLBACK[categoryKey] : undefined
  if (fallback && CIVIC_COMMENT_THREADS[fallback]) return fallback
  return issueRef
}
