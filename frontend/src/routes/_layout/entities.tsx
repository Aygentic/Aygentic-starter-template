import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Search } from "lucide-react"
import { Suspense } from "react"

import { EntitiesService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import AddEntity from "@/components/Entities/AddEntity"
import { columns } from "@/components/Entities/columns"
import PendingEntities from "@/components/Pending/PendingEntities"

function getEntitiesQueryOptions() {
  return {
    queryFn: () => EntitiesService.listEntities({ offset: 0, limit: 100 }),
    queryKey: ["entities"],
  }
}

export const Route = createFileRoute("/_layout/entities")({
  component: Entities,
  head: () => ({
    meta: [
      {
        title: "Entities",
      },
    ],
  }),
})

function EntitiesTableContent() {
  const { data: entities } = useSuspenseQuery(getEntitiesQueryOptions())

  if (entities.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">
          You don't have any entities yet
        </h3>
        <p className="text-muted-foreground">Add a new entity to get started</p>
      </div>
    )
  }

  return <DataTable columns={columns} data={entities.data} />
}

function EntitiesTable() {
  return (
    <Suspense fallback={<PendingEntities />}>
      <EntitiesTableContent />
    </Suspense>
  )
}

function Entities() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entities</h1>
          <p className="text-muted-foreground">
            Create and manage your entities
          </p>
        </div>
        <AddEntity />
      </div>
      <EntitiesTable />
    </div>
  )
}
