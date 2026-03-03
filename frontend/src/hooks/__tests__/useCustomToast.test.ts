import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import useCustomToast from "../useCustomToast"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("useCustomToast", () => {
  it("showSuccessToast calls toast.success with correct title and description", async () => {
    const { toast } = await import("sonner")

    const { result } = renderHook(() => useCustomToast())

    result.current.showSuccessToast("Entity created")

    expect(toast.success).toHaveBeenCalledWith("Success!", {
      description: "Entity created",
    })
  })

  it("showErrorToast calls toast.error with correct title and description", async () => {
    const { toast } = await import("sonner")

    const { result } = renderHook(() => useCustomToast())

    result.current.showErrorToast("Something failed")

    expect(toast.error).toHaveBeenCalledWith("Something went wrong!", {
      description: "Something failed",
    })
  })
})
