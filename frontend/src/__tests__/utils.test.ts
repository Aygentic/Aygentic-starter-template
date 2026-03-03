import { AxiosError } from "axios"
import { describe, expect, it, vi } from "vitest"

import { getInitials, handleError } from "../utils"

describe("handleError", () => {
  it("extracts message from AxiosError", () => {
    const callback = vi.fn()
    const axiosErr = new AxiosError("Network Error")

    handleError.call(callback, axiosErr as any)

    expect(callback).toHaveBeenCalledWith("Network Error")
  })

  it("extracts body.detail when it is a string", () => {
    const callback = vi.fn()
    const apiErr = { body: { detail: "Invalid credentials" } }

    handleError.call(callback, apiErr as any)

    expect(callback).toHaveBeenCalledWith("Invalid credentials")
  })

  it("extracts first item msg when body.detail is an array", () => {
    const callback = vi.fn()
    const apiErr = {
      body: {
        detail: [
          { msg: "Field required", loc: ["body", "name"] },
          { msg: "Invalid email", loc: ["body", "email"] },
        ],
      },
    }

    handleError.call(callback, apiErr as any)

    expect(callback).toHaveBeenCalledWith("Field required")
  })

  it("falls back to default message when body has no detail", () => {
    const callback = vi.fn()
    const apiErr = { body: {} }

    handleError.call(callback, apiErr as any)

    expect(callback).toHaveBeenCalledWith("Something went wrong.")
  })

  it("falls back to default message when body is undefined", () => {
    const callback = vi.fn()
    const apiErr = {} as any

    handleError.call(callback, apiErr)

    expect(callback).toHaveBeenCalledWith("Something went wrong.")
  })

  it("falls back to default message when detail is empty string", () => {
    const callback = vi.fn()
    const apiErr = { body: { detail: "" } }

    handleError.call(callback, apiErr as any)

    expect(callback).toHaveBeenCalledWith("Something went wrong.")
  })

  it("passes empty array through when detail is empty array", () => {
    // [] is truthy, so `errDetail || fallback` returns []
    const callback = vi.fn()
    const apiErr = { body: { detail: [] } }

    handleError.call(callback, apiErr as any)

    expect(callback).toHaveBeenCalledWith([])
  })
})

describe("getInitials", () => {
  it("returns first letter for a single word", () => {
    expect(getInitials("Alice")).toBe("A")
  })

  it("returns first two letters for a two-word name", () => {
    expect(getInitials("Alice Bob")).toBe("AB")
  })

  it("returns only first two initials for three+ words", () => {
    expect(getInitials("Alice Bob Charlie")).toBe("AB")
  })

  it("uppercases lowercase input", () => {
    expect(getInitials("alice bob")).toBe("AB")
  })

  it("preserves already uppercase input", () => {
    expect(getInitials("ALICE BOB")).toBe("AB")
  })

  it("returns empty string for empty input", () => {
    expect(getInitials("")).toBe("")
  })
})
