import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { gapi } from "gapi-script";
import { useAuth } from "./auth";

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
}
export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const { hasToken, login } = useAuth();

  useEffect(() => {
    (async () => {
      if (!hasToken) return;
      await loadEvents();
    })();
  }, [hasToken]);

  async function loadEvents() {
    try {
      const resp: any = await gapi.client.calendar.events.list({
        calendarId: "primary",
        showDeleted: false,
        singleEvents: true,
        orderBy: "startTime",
      });
      const items = resp.result.items || [];
      const mapped: CalendarEvent[] = items.map((item: any) => ({
        id: item.id,
        title: item.summary || "Tanpa Judul",
        start: item.start?.date || item.start?.dateTime,
        end: item.end?.date || item.end?.dateTime,
      }));
      setEvents(mapped);
    } catch (e) {
      console.error("loadEvents error:", e);
    }
  }

  // CREATE (admin only)
  async function handleDateClick(info: any) {
    if (!canEdit) return;
    if (!hasToken) { await login(); return; }
    const title = prompt("Masukkan keterangan:");
    if (!title) return;
    try {
      await gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: { summary: title, start: { date: info.dateStr }, end: { date: info.dateStr } },
      });
      await loadEvents();
    } catch (e) {
      console.error("insert error:", e);
    }
  }

  // UPDATE (admin only)
  async function handleEventClick(info: any) {
    if (!canEdit) return; // viewer: abaikan
    if (!hasToken) { await login(); return; }
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle) return;
    try {
      await gapi.client.calendar.events.update({
        calendarId: "primary",
        eventId: info.event.id,
        resource: {
          summary: newTitle,
          start: info.event.allDay ? { date: info.event.startStr } : { dateTime: info.event.startStr },
          end: info.event.endStr
            ? (info.event.allDay ? { date: info.event.endStr } : { dateTime: info.event.endStr })
            : (info.event.allDay ? { date: info.event.startStr } : { dateTime: info.event.startStr }),
        },
      });
      await loadEvents();
    } catch (e) {
      console.error("update error:", e);
    }
  }

  // DELETE (admin only)
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    try {
      await gapi.client.calendar.events.delete({ calendarId: "primary", eventId });
      await loadEvents();
    } catch (e) {
      console.error("delete error:", e);
    }
  }

  function renderEventContent(arg: any) {
    const onDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!canEdit) return;
      const ok = confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    const wrap: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%" };
    const title: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 };
    const btn: React.CSSProperties   = { border: "none", background: "transparent", cursor: "pointer", lineHeight: 1, fontSize: 12 };

    return (
      <div style={wrap}>
        <span style={title} title={arg.event.title}>{arg.event.title}</span>
        {canEdit && <button style={btn} aria-label="Hapus" title="Hapus" onClick={onDelete}>🗑️</button>}
      </div>
    );
  }

  return (
    <div style={{ padding: 12 }}>
      {!hasToken && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={login} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}>
            Login Google & Izinkan Calendar
          </button>
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dateClick={canEdit ? handleDateClick : undefined}
        eventClick={canEdit ? handleEventClick : undefined}
        eventContent={renderEventContent}
      />
    </div>
  );
}
