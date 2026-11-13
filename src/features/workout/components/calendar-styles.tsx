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

// The day's number on each level, at least 4.5:1 in both themes: the text
// colour on levels 0 to 2 (5.2:1 at the lowest, level 2 in the light theme),
// the background colour on level 3, the strongest (10.4:1 light, 8.8:1 dark).
export const LEVEL_TEXT_CLASSES: Record<HeatmapLevel, string> = {
  0: 'text-foreground',
  1: 'text-foreground',
  2: 'text-foreground',
  3: 'text-background',
}

// The day picked on Home's calendar.
export const SELECTED_CLASSES = 'ring-2 ring-foreground ring-offset-1 ring-offset-card'
