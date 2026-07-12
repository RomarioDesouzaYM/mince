import { useRef } from 'react'
import { CircleMarker, Popup, Tooltip } from 'react-leaflet'
import useDebouncedTooltip from '../hooks/useDebouncedTooltip'
import { ReportMarkerContent } from './MapMarkerContent'

// See useDebouncedTooltip for why this is needed (same fix as DistrictPolygon).
export default function ReportMarker({ report, center, radius, pane, pathOptions }) {
  const layerRef = useRef(null)
  useDebouncedTooltip(layerRef)

  return (
    <CircleMarker ref={layerRef} center={center} radius={radius} pane={pane} pathOptions={pathOptions}>
      <Popup>
        <ReportMarkerContent report={report} />
      </Popup>
      <Tooltip interactive>
        <ReportMarkerContent report={report} />
      </Tooltip>
    </CircleMarker>
  )
}
