import { cn } from '../lib/utils'

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M','⌫'],
]

export default function Keyboard({ onKey, disabled = false, used = {} }) {
  return (
    <div className="flex flex-col items-center gap-2 w-full px-2 py-3 bg-muted/60 rounded-2xl">
      {ROWS.map((row, i) => (
        <div key={i} className="flex gap-2 justify-center">
          {row.map(key => {
            const state = used[key.toLowerCase()]
            return (
              <button
                key={key}
                onClick={() => !disabled && onKey(key)}
                disabled={disabled}
                className={cn(
                  'h-14 rounded-xl font-bold text-lg border shadow-sm select-none',
                  'transition-all active:scale-95',
                  'disabled:cursor-not-allowed',
                  key === '⌫'
                    ? 'w-20 text-base bg-background border-border hover:bg-accent'
                    : 'w-14 border-border',
                  state === 'correct' && 'bg-green-500 text-white border-green-600 hover:bg-green-500',
                  state === 'wrong'   && 'bg-destructive text-destructive-foreground border-destructive/80 hover:bg-destructive opacity-60',
                  !state && key !== '⌫' && 'bg-background hover:bg-accent',
                  disabled && 'opacity-40',
                )}
              >
                {key}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
