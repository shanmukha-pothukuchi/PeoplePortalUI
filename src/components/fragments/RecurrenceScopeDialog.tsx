/**
  People Portal UI
  Copyright (C) 2026  Atheesh Thirumalairajan

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"

export type RecurrenceScope = "this" | "following" | "all"

export type RecurrenceAction = "edit" | "delete"

export interface RecurrenceScopeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: RecurrenceAction
  onSelect: (scope: RecurrenceScope) => void
}

export const RecurrenceScopeDialog = (props: RecurrenceScopeDialogProps) => {
  /* Parents typically clear their pending action the moment a scope is picked,
     which flips the `action` prop while the dialog is still animating closed.
     Latch the action seen while open so the copy can't change mid-close
     (e.g. "Delete recurring meeting" turning into "Edit recurring meeting"). */
  const [latchedAction, setLatchedAction] = useState<RecurrenceAction>(props.action)
  useEffect(() => {
    if (props.open) setLatchedAction(props.action)
  }, [props.open, props.action])
  const action = props.open ? props.action : latchedAction

  const verb = action === "delete" ? "Delete" : "Edit"
  const choose = (scope: RecurrenceScope) => {
    props.onSelect(scope)
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{verb} recurring meeting</DialogTitle>
          <DialogDescription>
            This meeting repeats weekly. Which occurrences should be {action === "delete" ? "deleted" : "changed"}?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Button variant="outline" onClick={() => choose("this")}>This meeting</Button>
          <Button variant="outline" onClick={() => choose("following")}>This and following meetings</Button>
          <Button variant="outline" onClick={() => choose("all")}>All meetings</Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
