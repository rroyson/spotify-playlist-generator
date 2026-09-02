import { isOverLimit } from '@/utils/rate-limit'

describe('isOverLimit', () => {
  it('allows up to the limit per hour per key, then blocks until the window slides', () => {
    const t0 = 1_000_000
    const hour = 60 * 60 * 1000

    expect(isOverLimit('u', 2, t0)).toBe(false)
    expect(isOverLimit('u', 2, t0 + 1)).toBe(false)
    expect(isOverLimit('u', 2, t0 + 2)).toBe(true)
    expect(isOverLimit('other', 2, t0 + 2)).toBe(false)
    expect(isOverLimit('u', 2, t0 + hour)).toBe(false) // the t0 hit slid out of the window
    expect(isOverLimit('u', 2, t0 + hour + 1)).toBe(false) // the t0 + 1 hit slid out
    expect(isOverLimit('u', 2, t0 + hour + 2)).toBe(true) // two hits inside the window again
  })
})
