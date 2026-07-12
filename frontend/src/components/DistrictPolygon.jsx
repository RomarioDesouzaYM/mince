import { useRef } from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'
import useDebouncedTooltip from '../hooks/useDebouncedTooltip'
import { DistrictMarkerContent } from './MapMarkerContent'

// See useDebouncedTooltip for why this is needed (Leaflet's default
// mouseout->closeTooltip wiring makes links inside the tooltip unreachable).
export default function DistrictPolygon({ district, positions, pathOptions, counts, news }) {
  const layerRef = useRef(null)
  useDebouncedTooltip(layerRef)

  return (
    <Polygon ref={layerRef} positions={positions} pathOptions={pathOptions}>
      <Popup>
        <DistrictMarkerContent district={district} counts={counts} news={news} />
      </Popup>
      <Tooltip interactive>
        <DistrictMarkerContent district={district} counts={counts} news={news} />
      </Tooltip>
    </Polygon>
  )
}
