"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STORAGE_KEY = "ielts-reminder-time";

export function NotificationSettings() {
  // `Notification` doesn't exist during SSR, so the initial render must match what the
  // server produced ("default"/not-yet-known) — the real browser state is only safe to
  // read after mount, via the effect below.
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [time, setTime] = useState("18:00");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with browser Notification API, which cannot be read during SSR
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setTime(saved);
      setEnabled(true);
    }
  }, []);

  async function enable() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem(STORAGE_KEY, time);
      setEnabled(true);
      scheduleNextReminder(time);
    }
  }

  function disable() {
    localStorage.removeItem(STORAGE_KEY);
    setEnabled(false);
  }

  function scheduleNextReminder(t: string) {
    const [h, m] = t.split(":").map(Number);
    const next = new Date();
    next.setHours(h, m, 0, 0);
    if (next.getTime() < Date.now()) next.setDate(next.getDate() + 1);
    const delay = next.getTime() - Date.now();
    setTimeout(() => {
      if (Notification.permission === "granted" && localStorage.getItem(STORAGE_KEY)) {
        new Notification("Time to study IELTS", { body: "Today's plan is ready — 10 minutes is better than none." });
        scheduleNextReminder(t);
      }
    }, delay);
  }

  if (permission === "unsupported") {
    return (
      <Card>
        <p className="font-medium text-sm mb-1">Study reminders</p>
        <p className="text-xs text-[var(--color-text-muted)]">Notifications aren&apos;t supported in this browser.</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="font-medium text-sm mb-1">Study reminders</p>
      <p className="text-xs text-[var(--color-text-muted)] mb-3">
        A daily browser notification while the app is open or installed. Optional — never required.
      </p>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="time"
          value={time}
          onChange={(e) => {
            setTime(e.target.value);
            if (enabled) {
              localStorage.setItem(STORAGE_KEY, e.target.value);
              scheduleNextReminder(e.target.value);
            }
          }}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
        />
        {enabled ? (
          <Button variant="secondary" size="sm" onClick={disable}>
            Turn off
          </Button>
        ) : (
          <Button size="sm" onClick={enable}>
            {permission === "denied" ? "Blocked — check browser settings" : "Enable reminders"}
          </Button>
        )}
      </div>
    </Card>
  );
}
