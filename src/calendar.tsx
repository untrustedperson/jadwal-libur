import React, { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { gapi } from "gapi-script";

// ====== GANTI DENGAN PUNYAMU ======
const CLIENT_ID = "492769852023-k4q40pi273ioncit65l16ptclot4i9sq.apps.googleusercontent.com";
const API_KEY = "AIzaSyBnPPmk3MIt2M0m861ZLLVCzVba3sR_-Wc";
const SCOPES = "https://www.googleapis.com/auth/calendar";

// TS helper untuk global GIS
declare global {
  interface Window {
    google: any;
  }
}

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
}

export default function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const tokenClientRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    gapi.load("client", async () => {
      try {
        await gapi.client.init({ apiKey: API_KEY });
        await gapi.client.load("https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest");
        console.log("gapi client + discovery loaded");
        setIsReady(true);
      } catch (e) {
        console.error("gapi init/discovery error:", e);
      }
    });

    const ensureGIS = () => {
      if (!window.google?.accounts?.oauth2) {
        console.warn("GIS script belum terload. Tambahkan: https://accounts.google.com/gsi/client di index.html");
        return;
      }
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp?.access_token) {
            console.log("GIS access token acquired");
            gapi.client.setToken({ access_token: resp.access_token });
            setHasToken(true);
            loadEvents();
          } else {
            console.error("GIS token callback tanpa access_token:", resp);
          }
        },
      });
      console.log("GIS token client initialized");
    };

    if (document.readyState === "complete") {
      ensureGIS();
    } else {
      window.addEventListener("load", ensureGIS);
      return () => window.removeEventListener("load", ensureGIS);
    }
  }, []);

  async function ensureAccessToken() {
    if (!isReady || !tokenClientRef.current) {
      console.warn("Belum siap (isReady/tokenClient null)");
      return;
    }
    tokenClientRef.current.requestAccessToken({ prompt: "consent" });
  }

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
      console.log("Mapped events:", mapped);
      setEvents(mapped);
    } catch (e: any) {
      console.error("loadEvents error:", e);
      if (e.status === 401) setHasToken(false);
    }
  }

  // CREATE
  async function handleDateClick(info: any) {
    if (!hasToken) {
      await ensureAccessToken();
      return;
    }
    const title = prompt("Masukkan keterangan:");
    if (!title) return;

    try {
      await gapi.client.calendar.events.insert({
        calendarId: "primary",
        resource: {
          summary: title,
          start: { date: info.dateStr }, // all-day
          end: { date: info.dateStr },
        },
      });
      await loadEvents();
    } catch (e) {
      console.error("insert error:", e);
    }
  }

  // DELETE helper (dipakai tombol 🗑️)
  async function deleteEventById(eventId: string) {
    try {
      await gapi.client.calendar.events.delete({
        calendarId: "primary",
        eventId,
      });
      await loadEvents();
    } catch (e) {
      console.error("delete error:", e);
    }
  }

  // RENDER custom: judul + tombol hapus
  function renderEventContent(arg: any) {
    const onDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation(); // jangan trigger eventClick
      if (!hasToken) {
        await ensureAccessToken();
        return;
      }
      const ok = confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      deleteEventById(arg.event.id);
    };

    const wrapStyle: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      width: "100%",
    };
    const titleStyle: React.CSSProperties = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: 24,
    };
    const btnStyle: React.CSSProperties = {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      lineHeight: 1,
      fontSize: 12,
    };

    return (
      <div style={wrapStyle}>
        <span style={titleStyle} title={arg.event.title}>{arg.event.title}</span>
        <button style={btnStyle} aria-label="Hapus" title="Hapus" onClick={onDelete}>🗑️</button>
      </div>
    );
  }

  // UPDATE via klik event (tanpa prompt 'hapus')
  async function handleEventClick(info: any) {
    if (!hasToken) {
      await ensureAccessToken();
      return;
    }
    const newTitle = prompt("Ubah keterangan :", info.event.title);
    if (!newTitle) return;

    try {
      await gapi.client.calendar.events.update({
        calendarId: "primary",
        eventId: info.event.id,
        resource: {
          summary: newTitle,
          start: info.event.allDay
            ? { date: info.event.startStr }
            : { dateTime: info.event.startStr },
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

  return (
    <div style={{ padding: 12 }}>
      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button
          onClick={ensureAccessToken}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          {hasToken ? "Refresh Token / Reload Events" : "Login Google & Izinkan Calendar"}
        </button>
        <button
          onClick={loadEvents}
          disabled={!hasToken}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: hasToken ? "pointer" : "not-allowed" }}
          title={!hasToken ? "Login dulu" : ""}
        >
          Muat Ulang Event
        </button>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        height="auto"
        dateClick={handleDateClick}
        eventClick={handleEventClick}       // klik event = edit
        eventContent={renderEventContent}   // tombol 🗑️ di dalam event
      />
    </div>
  );
}

