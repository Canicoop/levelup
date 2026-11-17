import { useId } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type XAxisTickContentProps,
} from 'recharts'
import { Card } from '@/components/ui/card'
import {
  chartPoints,
  showDailyDot,
  timeDomain,
  timeTicks,
  weightDomain,
  weightTicks,
  type ChartPoint,
} from '@/features/weight/lib/chart'
import type { WeightEntry } from '@/features/weight/lib/entries'
import { formatAxisDay, formatChartDay, formatChartDescription } from '@/features/weight/lib/labels'
import { dayTime, daysBetween, type DayKey } from '@/features/weight/lib/lisbon-day'
import { entriesInPeriod, periodStart, type Period } from '@/features/weight/lib/periods'
import { formatKg, toTenths } from '@/features/weight/lib/weight-values'

type WeightChartProps = {
  entries: WeightEntry[]
  period: Period
  today: DayKey
}

// The daily values and the 7-day average over the chosen period. The colours
// are the Graphite tokens (secondary text, data accent); since they are close
// in the dark theme, the two series also differ in shape: dots for the daily
// values, a plain 2px line for the average. Screen readers get a sentence
// instead (the chart is hidden from them); the history below is the table.
export function WeightChart({ entries, period, today }: WeightChartProps) {
  const titleId = useId()
  const inPeriod = entriesInPeriod(entries, period, today)
  const points = chartPoints(entries, period, today)
  const start = periodStart(period, today, entries) ?? today
  const weights = weightDomain(points)
  const hasAverage = points.some((point) => point.average !== null)
  const description = formatChartDescription(period, inPeriod)

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="sr-only">
        Gráfico do peso
      </h2>
      <Card>
        <figure className="flex flex-col gap-3 px-4">
          <figcaption className="sr-only">{description}</figcaption>
          {weights === null ? (
            <p className="flex min-h-50 items-center justify-center text-sm text-muted-foreground lg:min-h-60">
              Sem registos neste período.
            </p>
          ) : (
            <>
              <Legend average={hasAverage} />
              <Plot points={points} start={start} today={today} weights={weights} />
              {/* The first days have no average yet: say when it comes,
                  instead of a legend for a line that is not there. */}
              {!hasAverage && (
                <p className="text-sm text-pretty text-muted-foreground">
                  A média de 7 dias aparece quando houver 3 registos numa semana.
                </p>
              )}
            </>
          )}
        </figure>
      </Card>
    </section>
  )
}

// Each series' key mirrors its mark: a dot on a thin line for the daily
// values, a plain line for the average. Shared by the legend and the card.
function DailyKey() {
  return (
    <svg aria-hidden width="20" height="10" viewBox="0 0 20 10" className="shrink-0">
      <line x1="2" y1="5" x2="18" y2="5" stroke="var(--muted-foreground)" strokeWidth="1.5" />
      <circle cx="10" cy="5" r="3" fill="var(--muted-foreground)" />
    </svg>
  )
}

function AverageKey() {
  return (
    <svg aria-hidden width="20" height="10" viewBox="0 0 20 10" className="shrink-0">
      <line x1="2" y1="5" x2="18" y2="5" stroke="var(--data)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Only the series on the chart: no key for an average that is not there yet.
function Legend({ average }: { average: boolean }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <DailyKey />
        Diário
      </span>
      {average && (
        <span className="flex items-center gap-1.5">
          <AverageKey />
          Média de 7 dias
        </span>
      )}
    </div>
  )
}

function Plot({
  points,
  start,
  today,
  weights,
}: {
  points: ChartPoint[]
  start: DayKey
  today: DayKey
  weights: [number, number]
}) {
  const span = daysBetween(start, today)
  const ticks = timeTicks(start, today)
  const labels = new Map(ticks.map((day) => [dayTime(day), formatAxisDay(day, span)]))
  const yTicks = weightTicks(weights)

  return (
    // Hidden from screen readers: the figure's caption and the history carry
    // the same data. No animation, so there is nothing to reduce.
    <div aria-hidden className="h-50 lg:h-60">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="time"
            scale="time"
            domain={timeDomain(start, today)}
            ticks={[...labels.keys()]}
            // The first label hangs right of its tick and the last one left of
            // it, so neither is cut at the chart's edges.
            tick={(props: XAxisTickContentProps) => (
              <text
                x={props.x}
                y={props.y}
                dy="0.71em"
                textAnchor={labels.size === 1 ? 'middle' : props.index === 0 ? 'start' : props.index === labels.size - 1 ? 'end' : 'middle'}
                fill="var(--muted-foreground)"
                fontSize={12}
              >
                {labels.get(Number(props.payload.value))}
              </text>
            )}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
            isAnimationActive={false}
            content={(props) => <ChartTooltip point={props.active ? props.payload?.[0]?.payload : undefined} today={today} />}
          />
          <Line
            dataKey="weight"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            dot={(props: { cx?: number; cy?: number; index?: number }) => {
              const { cx, cy, index = 0 } = props
              if (cx == null || cy == null || !showDailyDot(points, index)) return <g key={`dot-${index}`} />
              return (
                <circle
                  key={`dot-${index}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="var(--muted-foreground)"
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              )
            }}
            activeDot={{ r: 5, fill: 'var(--muted-foreground)', stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="average"
            stroke="var(--data)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 5, fill: 'var(--data)', stroke: 'var(--card)', strokeWidth: 2 }}
            isAnimationActive={false}
            // Above the daily dots (600), which would otherwise cut the line
            // with their rings, and below the touch cursor (1100).
            zIndex={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// The card under the finger or the pointer: the day, then each value before
// its series' name, keyed by its line's shape. Nothing on the empty points
// that break the lines.
function ChartTooltip({ point, today }: { point: ChartPoint | undefined; today: DayKey }) {
  if (!point || (point.weight === null && point.average === null)) return null
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-card px-3 py-2 text-sm shadow-md ring-1 ring-border">
      <p className="text-muted-foreground">{formatChartDay(point.day, today)}</p>
      {point.weight !== null && (
        <p className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{formatKg(toTenths(point.weight))} kg</span>
          <DailyKey />
          <span className="text-muted-foreground">Diário</span>
        </p>
      )}
      {point.average !== null && (
        <p className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{formatKg(Math.round(point.average * 10))} kg</span>
          <AverageKey />
          <span className="text-muted-foreground">Média de 7 dias</span>
        </p>
      )}
    </div>
  )
}
