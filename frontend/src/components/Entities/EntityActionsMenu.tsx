import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { EntityPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteEntity from "../Entities/DeleteEntity"
import EditEntity from "../Entities/EditEntity"

interface EntityActionsMenuProps {
  entity: EntityPublic
}

export const EntityActionsMenu = ({ entity }: EntityActionsMenuProps) => {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditEntity entity={entity} onSuccess={() => setOpen(false)} />
        <DeleteEntity id={entity.id} onSuccess={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
