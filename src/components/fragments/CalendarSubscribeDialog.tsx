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
import { CheckIcon, CopyIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"
import { PEOPLEPORTAL_SERVER_ENDPOINT } from "@/commons/config"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"

/** Mirrors the server's APICalendarFeedLinks */
interface FeedLinks {
  url: string
  webcalUrl: string
}

/** Mirrors the server's APICalendarSubscriptionResponse */
interface Subscription {
  allTeams: FeedLinks
  team: FeedLinks | null
  issuedAt: string
  lastAccessedAt: string | null
}

type FeedScope = "team" | "all"

export interface CalendarSubscribeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Authentik group PK of the team whose page the dialog was opened from */
  teamId: string
  /** Friendly team name, used only for labels */
  teamName?: string
}

/**
 * Hands the user a personal, live calendar-feed link (like Canvas's calendar
 * feed) they can subscribe to from Google Calendar, Apple Calendar or Outlook.
 * Because it is a subscription rather than a one-off import, the calendar app
 * keeps re-fetching it, so later schedule changes flow through on their own
 * and the app's reminders fire for each meeting.
 */
export const CalendarSubscribeDialog = (props: CalendarSubscribeDialogProps) => {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(false)
  const [scope, setScope] = useState<FeedScope>("team")
  const [copied, setCopied] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  const subscriptionUrl = `${PEOPLEPORTAL_SERVER_ENDPOINT}/api/calendar/subscription?teamId=${encodeURIComponent(props.teamId)}`

  /* Load (or lazily create) the user's feed links each time the dialog opens */
  useEffect(() => {
    if (!props.open) return
    setLoading(true)
    setCopied(false)
    fetch(subscriptionUrl, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || `HTTP ${res.status}`)
        }
        return res.json() as Promise<Subscription>
      })
      .then(setSubscription)
      .catch((e) => toast.error(`Failed to load calendar link: ${e.message}`))
      .finally(() => setLoading(false))
  }, [props.open, subscriptionUrl])

  const links = scope === "team" ? subscription?.team ?? null : subscription?.allTeams ?? null
  const feedName = scope === "team" && props.teamName ? `${props.teamName} Meetings` : "People Portal Meetings"

  const copyLink = async () => {
    if (!links) return
    try {
      await navigator.clipboard.writeText(links.url)
      setCopied(true)
      toast.success("Calendar link copied")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually")
    }
  }

  const openExternal = (url: string) => window.open(url, "_blank", "noopener,noreferrer")

  /* One-click "add by URL" entry points for the common calendar apps */
  const googleUrl = links ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(links.webcalUrl)}` : ""
  const outlookLiveUrl = links
    ? `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(links.url)}&name=${encodeURIComponent(feedName)}`
    : ""
  const outlookOfficeUrl = links
    ? `https://outlook.office.com/calendar/0/addfromweb?url=${encodeURIComponent(links.url)}&name=${encodeURIComponent(feedName)}`
    : ""

  const resetLink = () => {
    setResetting(true)
    fetch(`${PEOPLEPORTAL_SERVER_ENDPOINT}/api/calendar/subscription/rotate?teamId=${encodeURIComponent(props.teamId)}`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.message || `HTTP ${res.status}`)
        }
        return res.json() as Promise<Subscription>
      })
      .then((next) => {
        setSubscription(next)
        setCopied(false)
        toast.success("Calendar link reset — re-add the new link in your calendar app")
      })
      .catch((e) => toast.error(`Failed to reset link: ${e.message}`))
      .finally(() => {
        setResetting(false)
        setResetOpen(false)
      })
  }

  return (
    <>
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add to your calendar</DialogTitle>
            <DialogDescription>
              Subscribe to a live feed of your meetings. New, moved, or cancelled meetings update in your
              calendar app automatically, and its reminders will notify you before each one.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={scope} onValueChange={(v) => setScope(v as FeedScope)}>
            <TabsList className="w-full">
              <TabsTrigger value="team" className="flex-1">{props.teamName ? `${props.teamName} only` : "This team only"}</TabsTrigger>
              <TabsTrigger value="all" className="flex-1">All my teams</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-2">
            <Label htmlFor="calendar-feed-url">Calendar feed link</Label>
            <div className="flex items-center gap-2">
              <Input
                id="calendar-feed-url"
                readOnly
                value={loading ? "Loading…" : links?.url ?? ""}
                onFocus={(e) => e.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" className="shrink-0" disabled={!links} onClick={copyLink} aria-label="Copy link">
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Treat this link like a password: anyone who has it can see the meetings you can see.
            </p>
          </div>

          <div className="grid gap-2">
            <Label>Open in</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" disabled={!links} asChild={!!links}>
                {links
                  ? <a href={links.webcalUrl}><ExternalLinkIcon />Apple / Outlook app</a>
                  : <span><ExternalLinkIcon />Apple / Outlook app</span>}
              </Button>
              <Button variant="outline" disabled={!links} onClick={() => openExternal(googleUrl)}>
                <ExternalLinkIcon />
                Google Calendar
              </Button>
              <Button variant="outline" disabled={!links} onClick={() => openExternal(outlookLiveUrl)}>
                <ExternalLinkIcon />
                Outlook.com
              </Button>
              <Button variant="outline" disabled={!links} onClick={() => openExternal(outlookOfficeUrl)}>
                <ExternalLinkIcon />
                Outlook 365
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Or paste the link into your app's "subscribe by URL" / "from internet" option. Apps refresh on their own
              schedule — Apple and Outlook within a few hours, Google Calendar up to a day.
              {subscription?.lastAccessedAt && (
                <> Last fetched by a calendar app {new Date(subscription.lastAccessedAt).toLocaleString()}.</>
              )}
            </p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" className="text-destructive" disabled={!subscription} onClick={() => setResetOpen(true)}>
              <RefreshCwIcon />
              Reset link
            </Button>
            <Button onClick={() => props.onOpenChange(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your calendar link?</AlertDialogTitle>
            <AlertDialogDescription>
              Every calendar app you previously added this feed to will stop updating until you add the new link.
              Do this if the link was shared or leaked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); resetLink() }} disabled={resetting}>
              {resetting && <Loader2Icon className="animate-spin" />}
              Reset link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
