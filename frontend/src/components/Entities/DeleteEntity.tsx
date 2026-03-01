import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Trash2 } from "lucide-react"
import { useState } from "react"

import { EntitiesService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { LoadingButton } from "@/components/ui/loading-button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

interface DeleteEntityProps {
  id: string
  onSuccess: () => void
}

const DeleteEntity = ({ id, onSuccess }: DeleteEntityProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const deleteEntity = async (id: string) => {
    await EntitiesService.deleteEntity({ entityId: id })
  }

  const mutation = useMutation({
    mutationFn: deleteEntity,
    onSuccess: () => {
      showSuccessToast("The entity was deleted successfully")
      setIsOpen(false)
      onSuccess()
    },
    onError: handleError.bind(showErrorToast),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] })
    },
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuItem
        variant="destructive"
        onSelect={(e) => e.preventDefault()}
        onClick={() => setIsOpen(true)}
      >
        <Trash2 />
        Delete Entity
      </DropdownMenuItem>
      <DialogContent className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate(id)
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete Entity</DialogTitle>
            <DialogDescription>
              This entity will be permanently deleted. Are you sure? You will
              not be able to undo this action.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" disabled={mutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              type="submit"
              loading={mutation.isPending}
            >
              Delete
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteEntity
