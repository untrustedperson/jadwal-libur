import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const eventsCollection = collection(db, "events"); // Firestore collection untuk event

  // 🔄 Load events dari Firestore
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const snapshot = await getDocs(eventsCollection);
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as CalendarEvent[];
      setEvents(data);
    } catch (err) {
      console.error("Gagal memuat event:", err);
    }
  }

  // ➕ CREATE
  async function handleDateClick(info: any) {
    if (!canEdit) return;
    const title = prompt("Masukkan nama hari libur:");
    if (!title) return;

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
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle) return;

    try {
      const eventRef = doc(db, "events", info.event.id);
      await updateDoc(eventRef, {
        title: newTitle,
      });
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

  // 🗓️ Custom render event (pakai tombol hapus)
  function renderEventContent(arg: any) {
    const onDelete = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!canEdit) return;
      const ok = confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    const wrap: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      width: "100%",
    };
    const title: React.CSSProperties = {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      fontSize: 14,
      fontWeight: 500,
    };
    const btn: React.CSSProperties = {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: 14,
      lineHeight: 1,
    };

    return (
      <div style={wrap}>
        <span style={title} title={arg.event.title}>
          {arg.event.title}
        </span>
        {canEdit && (
          <button style={btn} onClick={onDelete}>
            🗑️
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 12, textAlign: "center" }}>📅 Jadwal Hari Libur</h2>
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
