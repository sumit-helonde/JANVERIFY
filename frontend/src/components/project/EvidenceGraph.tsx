import { useMemo, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeProps,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { EvidenceGraphData, EvidenceGraphNode } from '../../lib/api'

const COLUMNS: Record<string, number> = {
  PROJECT: 0,
  GOVERNMENT_CLAIM: 1,
  FINANCIAL_RECORD: 1,
  INSPECTION: 2,
  LATEST_INSPECTION: 2,
  PHOTO_EVIDENCE: 3,
  FINANCIAL_ANOMALY: 4,
  TRUSTMESH_DECISION: 5,
  CITIZEN_SUBMISSION: 6,
  CITIZEN_MEDIA: 6,
}

function GraphNode({ data }: NodeProps) {
  const node = data as unknown as EvidenceGraphNode
  const accent =
    node.type === 'TRUSTMESH_DECISION'
      ? 'border-jv-blue/50 bg-jv-blue/5'
      : node.type === 'LATEST_INSPECTION'
        ? 'border-jv-green/50'
        : node.type === 'CITIZEN_SUBMISSION' || node.type === 'CITIZEN_MEDIA'
          ? 'border-amber-300/70 bg-amber-50'
          : 'border-jv-border bg-white'
  return (
    <div className={`w-52 rounded-xl border p-3 shadow-sm ${accent}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-jv-muted">
        {node.type.replace(/_/g, ' ')}
      </p>
      <p className="mt-1 text-sm font-bold leading-tight text-jv-navy">{node.title}</p>
      <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-jv-muted">{node.summary}</p>
      <dl className="mt-2 space-y-0.5 border-t border-jv-border pt-1.5">
        {node.date && (
          <div className="flex justify-between gap-2 text-[10px]">
            <dt className="text-jv-muted">Date</dt>
            <dd className="font-medium text-jv-navy">{node.date}</dd>
          </div>
        )}
        {node.status && (
          <div className="flex justify-between gap-2 text-[10px]">
            <dt className="text-jv-muted">Status</dt>
            <dd className="font-medium text-jv-navy">{node.status}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

const nodeTypes: NodeTypes = { evidence: GraphNode } as NodeTypes

export default function EvidenceGraph({ data }: { data: EvidenceGraphData }) {
  const [selected, setSelected] = useState<EvidenceGraphNode | null>(null)

  const nodes: RFNode[] = useMemo(() => {
    const rows: Record<number, number> = {}
    return data.nodes.map((node) => {
      const col = COLUMNS[node.type] ?? 5
      const row = rows[col] ?? 0
      rows[col] = row + 1
      return {
        id: node.id,
        type: 'evidence',
        position: { x: col * 250 + 16, y: row * 170 + 24 },
        data: node as unknown as Record<string, unknown>,
      }
    })
  }, [data.nodes])

  const edges: RFEdge[] = useMemo(
    () =>
      data.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: (e.type.charAt(0) + e.type.slice(1).toLowerCase().replace(/_/g, ' ')),
        style: e.type === 'CONTRADICTS' ? { stroke: '#b45309', strokeWidth: 2 } : { stroke: '#9aa4b2' },
        labelStyle: { fontFamily: 'inherit', fontSize: 10, fill: '#667085' },
        labelBgStyle: { fill: '#ffffff', fillOpacity: 0.9 },
        labelBgPadding: [4, 2] as [number, number],
      })),
    [data.edges],
  )

  return (
    <div data-testid="evidence-graph" className="overflow-hidden rounded-2xl border border-jv-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-jv-border px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-jv-navy">Evidence Graph</h2>
          <p className="text-xs text-jv-muted">
            Select any node to inspect its source, date and status. Zoom and pan to explore.
          </p>
        </div>
        {selected && (
          <p className="text-xs font-medium text-jv-blue">{selected.type.replace(/_/g, ' ')} · {selected.title}</p>
        )}
      </div>

      <div className="h-[420px] w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          onNodeClick={(_event, node) => setSelected(node.data as unknown as EvidenceGraphNode)}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={2}
        >
          <Background gap={20} size={1} color="#eef1f4" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {selected ? (
        <div className="border-t border-jv-border bg-slate-50/60 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-jv-muted">
            Selected · {selected.type.replace(/_/g, ' ')}
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-jv-navy">{selected.title}</h3>
          <p className="mt-1 text-xs leading-5 text-jv-muted">{selected.summary}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {selected.source && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-jv-muted">Source</dt>
                <dd className="text-xs font-medium text-jv-navy">{selected.source}</dd>
              </div>
            )}
            {selected.date && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-jv-muted">Date</dt>
                <dd className="text-xs font-medium text-jv-navy">{selected.date}</dd>
              </div>
            )}
            {selected.status && (
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-jv-muted">Status</dt>
                <dd className="text-xs font-medium text-jv-navy">{selected.status}</dd>
              </div>
            )}
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-jv-muted">Record Id</dt>
              <dd className="text-xs font-medium text-jv-navy">{selected.id}</dd>
            </div>
          </dl>
          {Object.keys(selected.meta).length > 0 && (
            <dl className="mt-2 border-t border-jv-border pt-2">
              {Object.entries(selected.meta).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <dt className="w-32 shrink-0 text-jv-muted">{k}</dt>
                  <dd className="font-medium text-jv-navy">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ) : (
        <p className="border-t border-jv-border bg-slate-50/60 px-5 py-4 text-xs text-jv-muted">
          Click a node to see its details and trace it back to its source record.
        </p>
      )}
    </div>
  )
}