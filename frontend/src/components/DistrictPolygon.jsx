import { useEffect, useRef } from 'react'
import { Polygon, Popup, Tooltip } from 'react-leaflet'
import { DistrictMarkerContent } from './MapMarkerContent'

const TOOLTIP_CLOSE_DELAY_MS = 150

// Leaflet's own Tooltip wiring closes the tooltip on the polygon's `mouseout` (see
// leaflet/src/layer/Tooltip.js `_initTooltipInteractions`), which fires the instant
// the cursor crosses from the polygon onto the tooltip's own DOM node -- a different
// element capturing the hit-test -- making any link inside unreachable. This has
// nothing to do with `sticky`/`interactive`; it's how Leaflet wires tooltip-on-a-Path
// close, full stop. Fix: remove that listener and replace it with a short close
// delay that's cancelled if the cursor lands on the tooltip content itself (hover
// intent), and always keep a click-to-pin Popup as a guaranteed fallback that never
// depends on hover timing at all.
export default function DistrictPolygon({ district, positions, pathOptions, counts, news }) {
  const layerRef = useRef(null)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return

    let closeTimer = null
    const scheduleClose = () => {
      clearTimeout(closeTimer)
      closeTimer = setTimeout(() => layer.closeTooltip(), TOOLTIP_CLOSE_DELAY_MS)
    }
    const cancelClose = () => clearTimeout(closeTimer)
    const onTooltipOpen = (e) => {
      const el = e.tooltip._container
      if (!el) return
      el.addEventListener('mouseenter', cancelClose)
      el.addEventListener('mouseleave', scheduleClose)
    }
    // Clicking pins the Popup open; hovering a lingering Tooltip at the same time
    // just clutters the view, so drop the hover preview once the pin is up.
    const onPopupOpen = () => layer.closeTooltip()

    layer.off('mouseout', layer.closeTooltip)
    layer.on('mouseout', scheduleClose)
    layer.on('mouseover', cancelClose)
    layer.on('tooltipopen', onTooltipOpen)
    layer.on('popupopen', onPopupOpen)

    return () => {
      layer.off('mouseout', scheduleClose)
      layer.off('mouseover', cancelClose)
      layer.off('tooltipopen', onTooltipOpen)
      layer.off('popupopen', onPopupOpen)
      clearTimeout(closeTimer)
    }
  }, [])

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
