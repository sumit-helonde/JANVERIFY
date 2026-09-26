export interface PageInfoSection {
  id: string
  title: string
  description: string
}

export interface PageInfo {
  title: string
  description: string
  sections: PageInfoSection[]
}

export const PAGE_INFO: Record<string, PageInfo> = {
  compare: {
    title: 'Compare Projects',
    description:
      'Side-by-side comparison of sanctioned budget, progress and evidence across selected projects.',
    sections: [
      {
        id: 'criteria',
        title: 'Comparison criteria',
        description: 'Budget, progress, evidence state, contractor performance indicators and timelines.',
      },
      {
        id: 'selection',
        title: 'Select projects',
        description: 'Pick two or more projects from the registry to build a comparison.',
      },
      {
        id: 'output',
        title: 'Visual output',
        description: 'Bar charts and ranked tables rendered in the JANVERIFY design system.',
      },
    ],
  },
  reports: {
    title: 'Reports',
    description:
      'Generated accountability reports per ward, department, category and time period.',
    sections: [
      {
        id: 'predefined',
        title: 'Predefined reports',
        description: 'Monthly expenditure digest, evidence gap reports and ward-wise dashboards.',
      },
      {
        id: 'custom',
        title: 'Custom reports',
        description: 'Build a report by combining category, time period and evidence filters.',
      },
      {
        id: 'downloads',
        title: 'Downloads',
        description: 'PDF and CSV exports with full source traceability footnotes.',
      },
    ],
  },
  evidence: {
    title: 'Evidence',
    description:
      'Inspection reports, financial records and citizen-submitted evidence linked to TRUSTMESH.',
    sections: [
      {
        id: 'feed',
        title: 'Evidence feed',
        description: 'Every captured record with status, source and project link.',
      },
      {
        id: 'status',
        title: 'Verification status',
        description: 'SUPPORTED, INCOMPLETE, CONFLICTING, HUMAN_REVIEW_REQUIRED labels.',
      },
      {
        id: 'trace',
        title: 'Source traceability',
        description: 'Documents and records chain back to their originating source.',
      },
    ],
  },
  'submit-evidence': {
    title: 'Submit Evidence',
    description:
      'Citizens can submit photos, documents and observations for human review on a project.',
    sections: [
      {
        id: 'form',
        title: 'Evidence form',
        description: 'Project link, date, evidence type, files and a short description.',
      },
      {
        id: 'review',
        title: 'Human review queue',
        description: 'Submitted items enter a review queue before appearing in the evidence feed.',
      },
      {
        id: 'anonymity',
        title: 'Anonymity controls',
        description: 'Citizens may submit without revealing public identity.',
      },
    ],
  },
  about: {
    title: 'About JANVERIFY',
    description:
      'An independent, non-partisan public accountability platform for evidence-backed project scrutiny.',
    sections: [
      {
        id: 'mission',
        title: 'Mission',
        description: 'Every citizen has the right to know how public money is spent.',
      },
      {
        id: 'method',
        title: 'Method',
        description: 'TRUSTMESH and FRAUDSCOPE engines combine records, inspections and citizen evidence.',
      },
      {
        id: 'ground',
        title: 'Ground rules',
        description: 'Independent, non-partisan, evidence-based — never fake accusations.',
      },
    ],
  },
}