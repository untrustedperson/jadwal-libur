import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

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

  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("logout error:", e);
    }
  }

  // 🔄 load event dari Firestore
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const snap = await getDocs(eventsCollection);
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CalendarEvent, "id">),
      }));
      setEvents(data);
    } catch (err) {
      console.error("Gagal memuat event:", err);
    }
  }

  // ➕ CREATE
  async function handleDateClick(info: any) {
    if (!canEdit) return;

    // Gunakan prompt yang kompatibel dengan mobile
    const title = window.prompt("Masukkan keterangan hari libur:");
    if (!title || title.trim() === "") return;

    try {
      await addDoc(eventsCollection, {
        title,
        start: info.dateStr,
        end: info.dateStr,
      });
      await loadEvents();
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // ✏️ UPDATE
  async function handleEventClick(info: any) {
    if (!canEdit) return;

    const newTitle = window.prompt(
      "Ubah nama hari libur:",
      info.event.title
    );
    if (!newTitle || newTitle.trim() === "") return;

    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
      await loadEvents();
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // ❌ DELETE
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      await loadEvents();
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // 🗓️ Event Content (delete btn fix for mobile)
  function renderEventContent(arg: any) {
    const onDelete = async (
      e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>
    ) => {
      e.stopPropagation();
      if (!canEdit) return;
      const ok = window.confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: "500",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "80%",
          }}
        >
          {arg.event.title}
        </span>

        {canEdit && (
          <button
            onClick={onDelete as any}
            onTouchStart={onDelete as any} // 🟢 tambahkan ini agar bisa di-tap di mobile
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
            }}
          >
            🗑️
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      {/* Header bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>📅 Jadwal Hari Libur</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            Role: {localStorage.getItem("role") || "viewer"}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Calendar */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView={window.innerWidth < 600 ? "dayGridWeek" : "dayGridMonth"}
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: window.innerWidth < 600 ? "" : "dayGridMonth,dayGridWeek",
        }}
        events={events}
        height="auto"
        eventContent={renderEventContent}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />
    </div>
  );
}
