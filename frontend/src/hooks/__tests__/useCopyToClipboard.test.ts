import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useCopyToClipboard } from "../useCopyToClipboard"

describe("useCopyToClipboard", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns [null, copyFn] initially", () => {
    const { result } = renderHook(() => useCopyToClipboard())

    expect(result.current[0]).toBeNull()
    expect(typeof result.current[1]).toBe("function")
  })

  it("copies text and sets copiedText on success", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    })

    const { result } = renderHook(() => useCopyToClipboard())

    let success: boolean
    await act(async () => {
      success = await result.current[1]("hello world")
    })

    expect(success!).toBe(true)
    expect(writeTextMock).toHaveBeenCalledWith("hello world")
    expect(result.current[0]).toBe("hello world")
  })

  it("resets copiedText to null after 2 seconds", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    })

    const { result } = renderHook(() => useCopyToClipboard())

    await act(async () => {
      await result.current[1]("temp text")
    })

    expect(result.current[0]).toBe("temp text")

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current[0]).toBeNull()
  })

  it("returns false and warns when clipboard is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined })
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { result } = renderHook(() => useCopyToClipboard())

    let success: boolean
    await act(async () => {
      success = await result.current[1]("text")
    })

    expect(success!).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith("Clipboard not supported")
    expect(result.current[0]).toBeNull()
  })

  it("returns false and resets when writeText throws", async () => {
    const writeTextMock = vi
      .fn()
      .mockRejectedValue(new Error("Permission denied"))
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    })
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    const { result } = renderHook(() => useCopyToClipboard())

    let success: boolean
    await act(async () => {
      success = await result.current[1]("text")
    })

    expect(success!).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith("Copy failed", expect.any(Error))
    expect(result.current[0]).toBeNull()
  })
})
