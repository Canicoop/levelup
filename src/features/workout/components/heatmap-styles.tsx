import type { HeatmapLevel } from '@/features/workout/lib/history'

// The heatmap's colours, one per level (rule AU). In a .tsx file because
// Tailwind only reads those (see src/index.css), and written out in full so it
// finds the class names.
export const LEVEL_CLASSES: Record<HeatmapLevel, string> = {
  0: 'bg-heatmap-0',
  1: 'bg-heatmap-1',
  2: 'bg-heatmap-2',
  3: 'bg-heatmap-3',
}

// The day picked on Home's heatmap.
export const SELECTED_CLASSES = 'ring-2 ring-foreground ring-offset-1 ring-offset-card'
