// Shared by the month calendar and the year view.

export const MONTH_SHORT = [
    'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
    'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.',
]

export const EMPTY_CELL_COLOR = 'rgba(255,255,255,0.06)'

function hexToRgba(hex: string, alpha: number): string {
    if (!hex || hex.length < 7) return `rgba(139, 92, 246, ${alpha})`
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Cell color for each heatmap intensity (index 0 is "no study"). */
export function getIntensityColors(accentColor: string): string[] {
    return [
        'transparent',
        hexToRgba(accentColor, 0.15),
        hexToRgba(accentColor, 0.30),
        hexToRgba(accentColor, 0.50),
        hexToRgba(accentColor, 0.70),
    ]
}
