import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AddEntity from "../AddEntity"

// --- Module mocks ---

const mockShowSuccessToast = vi.fn()
const mockShowErrorToast = vi.fn()

vi.mock("@/client", () => ({
  EntitiesService: {
    createEntity: vi.fn(),
  },
}))

vi.mock("@/hooks/useCustomToast", () => ({
  default: vi.fn(() => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  })),
}))

vi.mock("@/utils", () => ({
  handleError: vi.fn(),
}))

// --- Helpers ---

function renderWithProviders(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )
}

async function openDialog() {
  const trigger = screen.getByRole("button", { name: /add entity/i })
  await userEvent.click(trigger)
}

// --- Tests ---

describe("AddEntity", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the 'Add Entity' trigger button", () => {
    renderWithProviders(<AddEntity />)

    expect(
      screen.getByRole("button", { name: /add entity/i }),
    ).toBeInTheDocument()
  })

  it("opens the dialog when the trigger button is clicked", async () => {
    renderWithProviders(<AddEntity />)

    await openDialog()

    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Add Entity" }),
    ).toBeInTheDocument()
  })

  it("shows title and description fields in the dialog", async () => {
    renderWithProviders(<AddEntity />)

    await openDialog()

    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Description")).toBeInTheDocument()
  })

  it("shows validation error when title is empty and form is submitted", async () => {
    renderWithProviders(<AddEntity />)

    await openDialog()

    const titleInput = screen.getByPlaceholderText("Title")
    await userEvent.click(titleInput)
    await userEvent.tab()

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument()
    })
  })

  it("calls EntitiesService.createEntity with form data on valid submission", async () => {
    const { EntitiesService } = await import("@/client")
    const createEntityMock = vi.mocked(EntitiesService.createEntity)
    createEntityMock.mockResolvedValueOnce({} as any)

    renderWithProviders(<AddEntity />)

    await openDialog()

    await userEvent.type(screen.getByPlaceholderText("Title"), "Test Entity")
    await userEvent.type(
      screen.getByPlaceholderText("Description"),
      "Test description",
    )

    await userEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(createEntityMock).toHaveBeenCalledWith({
        requestBody: { title: "Test Entity", description: "Test description" },
      })
    })
  })

  it("shows success toast and closes dialog on successful submission", async () => {
    const { EntitiesService } = await import("@/client")
    vi.mocked(EntitiesService.createEntity).mockResolvedValueOnce({} as any)

    renderWithProviders(<AddEntity />)

    await openDialog()

    await userEvent.type(screen.getByPlaceholderText("Title"), "New Entity")
    await userEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(mockShowSuccessToast).toHaveBeenCalledWith(
        "Entity created successfully",
      )
    })

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
  })

  it("calls handleError on mutation failure", async () => {
    const { EntitiesService } = await import("@/client")
    const { handleError } = await import("@/utils")
    const apiError = new Error("Network error")
    vi.mocked(EntitiesService.createEntity).mockRejectedValueOnce(apiError)

    renderWithProviders(<AddEntity />)

    await openDialog()

    await userEvent.type(screen.getByPlaceholderText("Title"), "Failing Entity")
    await userEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(handleError).toHaveBeenCalled()
    })
  })

  it("invalidates the 'entities' query key on settlement", async () => {
    const { EntitiesService } = await import("@/client")
    vi.mocked(EntitiesService.createEntity).mockResolvedValueOnce({} as any)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    render(
      <QueryClientProvider client={queryClient}>
        <AddEntity />
      </QueryClientProvider>,
    )

    await openDialog()

    await userEvent.type(
      screen.getByPlaceholderText("Title"),
      "Settlement Entity",
    )
    await userEvent.click(screen.getByRole("button", { name: /save/i }))

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ["entities"] }),
      )
    })
  })
})
