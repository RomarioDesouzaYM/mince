import { useEffect } from 'react'

const TOOLTIP_CLOSE_DELAY_MS = 150

// Leaflet's own Tooltip wiring closes the tooltip on the layer's `mouseout`, which
// fires the instant the cursor crosses from the layer onto the tooltip's own DOM (a
// different element capturing the hit-test) -- making any link inside unreachable,
// independent of `sticky`/`interactive`. This replaces that with a short close delay
// cancelled by hovering the tooltip content itself (hover intent), and closes any
// lingering tooltip when a Popup pins open instead. Shared by DistrictPolygon and
// report CircleMarkers -- same bug, same fix, not reinvented per layer type.
export default function useDebouncedTooltip(layerRef) {
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
    // Clicking pins the Popup open; a lingering hover Tooltip at the same time just
    // clutters the view, so drop it once the pin is up.
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
  }, [layerRef])
}
