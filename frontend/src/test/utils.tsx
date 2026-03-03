import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type RenderOptions, render } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

interface ProvidersProps {
  children: ReactNode
}

function createProviders(queryClient: QueryClient) {
  return function Providers({ children }: ProvidersProps) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) {
  const queryClient = createTestQueryClient()
  return {
    ...render(ui, {
      wrapper: createProviders(queryClient),
      ...options,
    }),
    queryClient,
  }
}
