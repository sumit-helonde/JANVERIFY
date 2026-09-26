import L from 'leaflet'
import { useEffect, useRef } from 'react'

import { CATEGORY_LEGEND, type Project } from '../../data/mockDashboard'

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const DEFAULT_CENTER: [number, number] = [21.1458, 79.0882]

function colorFor(project: Project): string {
  const match = CATEGORY_LEGEND.find(
    (c) => c.label === project.category || c.label.startsWith(project.categoryShort),
  )
  return match?.color ?? '#64748b'
}

function markerHtml(color: string, short: string): string {
  return `
    <div class="jv-pin" style="--pin-color:${color}">
      <span>${short}</span>
    </div>
  `
}

export default function LeafletMap({
  projects = [],
  center,
}: {
  projects?: Project[]
  center?: [number, number]
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: center ?? DEFAULT_CENTER,
      zoom: center && projects.length === 1 ? 15 : 12,
      scrollWheelZoom: false,
    })
    mapRef.current = map

    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map)

    projects.forEach((project) => {
      const color = colorFor(project)
      const icon = L.divIcon({
        className: '',
        html: markerHtml(color, project.categoryShort),
        iconSize: [28, 34],
        iconAnchor: [14, 32],
        popupAnchor: [0, -30],
      })
      L.marker(project.min, { icon })
        .addTo(map)
        .bindPopup(
          `<div class="jv-popup">
             <p class="jv-popup-id">${project.id}</p>
             <p class="jv-popup-name">${project.name}</p>
             <p class="jv-popup-meta">${project.category} · ${project.budget}</p>
           </div>`,
        )
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [projects, center])

  return <div ref={containerRef} className="h-full w-full" aria-label="Project map" />
}