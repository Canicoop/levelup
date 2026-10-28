import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

// Temporary page to check the Graphite tokens. Replaced in the next step.
const heatmapLevels = [
  'bg-heatmap-0',
  'bg-heatmap-1',
  'bg-heatmap-2',
  'bg-heatmap-3',
] as const

function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">LevelUP</h1>
        <p className="text-muted-foreground">
          Página de teste da identidade visual. Vai ser substituída em breve.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Peso</CardTitle>
          <CardDescription>Valor de exemplo</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <p className="text-4xl font-semibold tracking-tight text-data">
            78,4
            <span className="ml-1 text-base font-normal text-muted-foreground">
              kg
            </span>
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground">Escala de atividade</p>
            <ul className="flex gap-1.5" aria-label="Escala de atividade, do nível 0 ao 3">
              {heatmapLevels.map((level, index) => (
                <li
                  key={level}
                  className={`size-6 rounded-sm ${level}`}
                  title={`Nível ${index}`}
                />
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full sm:w-auto sm:self-start">
        Começar
      </Button>
    </main>
  )
}

export default App
