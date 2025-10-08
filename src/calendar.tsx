import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");

  // === Logout ===
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("logout error:", e);
    }
  }

  // === Load events ===
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const snap = await getDocs(eventsCollection);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalendarEvent, "id">) }));
      setEvents(data);
    } catch (err) {
      console.error("Gagal memuat event:", err);
    }
  }

  // === Create ===
  async function handleDateClick(info: any) {
    if (!canEdit) return;
    const title = prompt("Masukkan nama hari libur:");
    if (!title) return;
    try {
      await addDoc(eventsCollection, { title, start: info.dateStr, end: info.dateStr });
      await loadEvents();
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // === Update ===
  async function handleEventClick(info: any) {
    if (!canEdit) return;
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle) return;
    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
      await loadEvents();
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // === Delete ===
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      await loadEvents();
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // === Custom event content (dengan tombol hapus) ===
  function renderEventContent(arg: any) {
    const onDelete = async (e: ReactMouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!canEdit) return;
      const ok = confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    const wrap: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, width: "100%" };
    const title: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, fontWeight: 500 };
    const btn: CSSProperties = { border: "none", background: "transparent", cursor: "pointer", fontSize: 14, lineHeight: 1 };

    return (
      <div style={wrap}>
        <span style={title} title={arg.event.title}>{arg.event.title}</span>
        {canEdit && (
          <button style={btn} onClick={onDelete} aria-label="Hapus" title="Hapus">
            🗑️
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>📅 Jadwal Hari Libur</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Role: {localStorage.getItem("role") || "viewer"}</span>
          <button
            onClick={handleLogout}
            style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer", background: "#fff" }}
            aria-label="Logout"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Kalender */}
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

