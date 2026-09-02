// Brand mark: a record disc, primary body with a teal centre. Colors come from the theme tokens.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 32 32' aria-hidden='true'>
      <circle cx='16' cy='16' r='15' fill='var(--color-primary)' />
      <circle cx='16' cy='16' r='9.5' fill='none' stroke='var(--color-canvas)' strokeWidth='1.5' />
      <circle cx='16' cy='16' r='4' fill='var(--color-accent)' />
    </svg>
  )
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
