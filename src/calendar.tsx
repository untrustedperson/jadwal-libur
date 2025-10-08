import { useEffect, useState } from "react";
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

  // ===== Logout =====
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  // ===== Load events =====
  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      // Tambahkan di awal setiap fungsi CRUD
    if (!canEdit) {
      alert("Akses ditolak: hanya admin atau dev yang bisa mengubah kalender!");
      return;
    }

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

  // ===== Create =====
  async function handleDateClick(info: any) {
    // Tambahkan di awal setiap fungsi CRUD
    if (!canEdit) {
      alert("Akses ditolak: hanya admin atau dev yang bisa mengubah kalender!");
      return;
    }

    if (!canEdit) return;

    // Gunakan prompt yang lebih stabil di mobile
    const title = window.prompt("Masukkan keterangan hari libur:");
    if (!title?.trim()) return;

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

  // ===== Update =====
  async function handleEventClick(info: any) {
    // Tambahkan di awal setiap fungsi CRUD
    if (!canEdit) {
      alert("Akses ditolak: hanya admin atau dev yang bisa mengubah kalender!");
      return;
    }

    if (!canEdit) return;
    const newTitle = window.prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle?.trim()) return;

    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
      await loadEvents();
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // ===== Delete =====
  async function deleteEventById(eventId: string) {
    // Tambahkan di awal setiap fungsi CRUD
    if (!canEdit) {
      alert("Akses ditolak: hanya admin atau dev yang bisa mengubah kalender!");
      return;
    }
    if (!canEdit) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
      await loadEvents();
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // ===== Custom Event Content (tombol hapus) =====
  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
      e.stopPropagation();
      // Tambahkan di awal setiap fungsi CRUD
      if (!canEdit) {
      alert("Akses ditolak: hanya admin atau dev yang bisa mengubah kalender!");
      return;
    }
      if (!canEdit) return;
      const ok = window.confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    return (
      <div
        onTouchStart={(e) => e.stopPropagation()} // cegah tap double trigger
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
            fontWeight: 500,
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
            onClick={onDelete}
            onTouchEnd={onDelete} // ✅ tambah dukungan tap mobile
            style={{
              background: "transparent",
              border: "none",
              fontSize: 16,
              cursor: "pointer",
              padding: 4,
              color: "red",
            }}
          >
            🗑️
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header / Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>📅 Jadwal Hari Libur</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Role: {localStorage.getItem("role") || "viewer"}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #2563eb",
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

      {/* Kalender */}
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
        dateClick={(info) => {
          // ✅ buat tap lebih responsif di mobile
          setTimeout(() => handleDateClick(info), 100);
        }}
        eventClick={(info) => {
          // ✅ buat tap lebih responsif di mobile
          setTimeout(() => handleEventClick(info), 100);
        }}
      />
    </div>
  );
}
