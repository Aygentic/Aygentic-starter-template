import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ThemeProvider, useTheme } from "../theme-provider"

function createMatchMediaMock(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = []
  return {
    mock: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark") ? prefersDark : !prefersDark,
      media: query,
      addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners.push(cb)
      },
      removeEventListener: (
        _: string,
        cb: (e: MediaQueryListEvent) => void,
      ) => {
        const idx = listeners.indexOf(cb)
        if (idx !== -1) listeners.splice(idx, 1)
      },
    })),
    listeners,
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

describe("useTheme", () => {
  it("returns default state when used outside ThemeProvider", () => {
    // createContext provides initialState, so useContext never returns undefined
    const { result } = renderHook(() => useTheme())

    expect(result.current.theme).toBe("system")
    expect(result.current.resolvedTheme).toBe("light")
    expect(typeof result.current.setTheme).toBe("function")
  })
})

describe("ThemeProvider", () => {
  const storageKey = "vite-ui-theme"

  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove("light", "dark")
    const { mock } = createMatchMediaMock(false)
    vi.stubGlobal("matchMedia", mock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    localStorage.clear()
    document.documentElement.classList.remove("light", "dark")
  })

  it("defaults to system theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe("system")
  })

  it("reads initial theme from localStorage", () => {
    localStorage.setItem(storageKey, "dark")

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe("dark")
  })

  it("resolves system theme to light when prefers-color-scheme is light", () => {
    const { mock } = createMatchMediaMock(false)
    vi.stubGlobal("matchMedia", mock)

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe("system")
    expect(result.current.resolvedTheme).toBe("light")
  })

  it("resolves system theme to dark when prefers-color-scheme is dark", () => {
    const { mock } = createMatchMediaMock(true)
    vi.stubGlobal("matchMedia", mock)

    const { result } = renderHook(() => useTheme(), { wrapper })

    expect(result.current.theme).toBe("system")
    expect(result.current.resolvedTheme).toBe("dark")
  })

  it("setTheme(dark) persists to localStorage and adds dark class", () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme("dark")
    })

    expect(localStorage.getItem(storageKey)).toBe("dark")
    expect(result.current.theme).toBe("dark")
    expect(result.current.resolvedTheme).toBe("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(document.documentElement.classList.contains("light")).toBe(false)
  })

  it("setTheme(light) persists to localStorage and adds light class", () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => {
      result.current.setTheme("light")
    })

    expect(localStorage.getItem(storageKey)).toBe("light")
    expect(result.current.theme).toBe("light")
    expect(result.current.resolvedTheme).toBe("light")
    expect(document.documentElement.classList.contains("light")).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })
})
