// Brand mark: a teal record sliding out of a tomato sleeve. Colors come from the theme tokens.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 32 32' aria-hidden='true'>
      <circle cx='21' cy='16' r='10' fill='var(--color-accent)' />
      <circle cx='21' cy='16' r='2.5' fill='var(--color-canvas)' />
      <rect x='1' y='4' width='20' height='24' rx='4' fill='var(--color-primary)' />
    </svg>
  )
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
