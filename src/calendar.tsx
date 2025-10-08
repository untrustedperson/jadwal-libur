import { useState, useEffect } from "react";
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
  const [showModal, setShowModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const snap = await getDocs(eventsCollection);
    const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CalendarEvent, "id">) }));
    setEvents(data);
  }

  // === Ganti prompt jadi modal ===
  function handleDateClick(info: any) {
    if (!canEdit) return;
    setSelectedDate(info.dateStr);
    setNewEventTitle("");
    setShowModal(true);
  }

  async function handleSaveEvent() {
    if (!newEventTitle.trim()) return alert("Isi nama hari libur dulu!");
    await addDoc(eventsCollection, { title: newEventTitle, start: selectedDate, end: selectedDate });
    setShowModal(false);
    setNewEventTitle("");
    await loadEvents();
  }

  async function handleEventClick(info: any) {
    if (!canEdit) return;
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle) return;
    const ref = doc(db, "events", info.event.id);
    await updateDoc(ref, { title: newTitle });
    await loadEvents();
  }

  async function deleteEventById(eventId: string) {
    await deleteDoc(doc(db, "events", eventId));
    await loadEvents();
  }

  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
      e.stopPropagation();
      const ok = confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{arg.event.title}</span>
        {canEdit && <button onClick={onDelete}>🗑️</button>}
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>📅 Jadwal Hari Libur</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>Role: {localStorage.getItem("role")}</span>
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
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
      />

      {/* Modal Tambah Event */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              width: "90%",
              maxWidth: 350,
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 10 }}>Tambah Hari Libur</h3>
            <p style={{ fontSize: 14, marginBottom: 8 }}>Tanggal: {selectedDate}</p>
            <input
              type="text"
              placeholder="Nama hari libur..."
              value={newEventTitle}
              onChange={(e) => setNewEventTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #ddd",
                borderRadius: 8,
                marginBottom: 12,
                fontSize: 14,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "6px 10px",
                  background: "#eee",
                  borderRadius: 6,
                  border: "none",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSaveEvent}
                style={{
                  padding: "6px 12px",
                  background: "#2563eb",
                  color: "white",
                  borderRadius: 6,
                  border: "none",
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
