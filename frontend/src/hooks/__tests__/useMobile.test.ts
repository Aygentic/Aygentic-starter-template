import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useIsMobile } from "../useMobile"

const MOBILE_BREAKPOINT = 768

function createMatchMediaMock(width: number) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  const mock = vi.fn().mockImplementation((query: string) => ({
    matches:
      width < MOBILE_BREAKPOINT && query.includes(`${MOBILE_BREAKPOINT - 1}px`),
    media: query,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb)
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb)
      if (idx !== -1) listeners.splice(idx, 1)
    },
  }))
  return { mock, listeners }
}

describe("useIsMobile", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("returns false when window width is >= 768px", () => {
    vi.stubGlobal("innerWidth", 1024)
    const { mock } = createMatchMediaMock(1024)
    vi.stubGlobal("matchMedia", mock)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it("returns true when window width is < 768px", () => {
    vi.stubGlobal("innerWidth", 375)
    const { mock } = createMatchMediaMock(375)
    vi.stubGlobal("matchMedia", mock)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("updates when media query fires a change event", () => {
    vi.stubGlobal("innerWidth", 1024)
    const { mock, listeners } = createMatchMediaMock(1024)
    vi.stubGlobal("matchMedia", mock)

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    act(() => {
      vi.stubGlobal("innerWidth", 375)
      for (const listener of listeners) {
        listener({} as MediaQueryListEvent)
      }
    })

    expect(result.current).toBe(true)
  })
})
