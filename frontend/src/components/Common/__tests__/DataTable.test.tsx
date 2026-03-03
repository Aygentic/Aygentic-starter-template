import type { ColumnDef } from "@tanstack/react-table"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { DataTable } from "../DataTable"

/** Default page size used by DataTable — tests rely on this threshold. */
const DEFAULT_PAGE_SIZE = 10

interface Row {
  id: number
  name: string
}

const columns: ColumnDef<Row>[] = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "Name" },
]

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
  }))
}

describe("DataTable", () => {
  it("renders column headers from column definitions", () => {
    render(<DataTable columns={columns} data={[]} />)

    expect(screen.getByText("ID")).toBeInTheDocument()
    expect(screen.getByText("Name")).toBeInTheDocument()
  })

  it("renders rows matching provided data", () => {
    const data = makeRows(3)
    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText("1")).toBeInTheDocument()
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("Item 3")).toBeInTheDocument()
  })

  it("shows 'No results found.' for empty data array", () => {
    render(<DataTable columns={columns} data={[]} />)

    expect(screen.getByText("No results found.")).toBeInTheDocument()
  })

  it("hides pagination when data fits on a single page", () => {
    const data = makeRows(DEFAULT_PAGE_SIZE - 1)
    render(<DataTable columns={columns} data={data} />)

    expect(screen.queryByText("Rows per page")).not.toBeInTheDocument()
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it("shows pagination controls when data exceeds page size", () => {
    const data = makeRows(DEFAULT_PAGE_SIZE + 1)
    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText("Rows per page")).toBeInTheDocument()
    expect(screen.getByText(/Showing/)).toBeInTheDocument()
  })
})
