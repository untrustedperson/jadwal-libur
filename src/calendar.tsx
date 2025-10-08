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
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"add" | "edit" | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState("");

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

  // === Load Events ===
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

  // === CRUD HANDLERS ===
  async function handleSave() {
    if (!title.trim()) return alert("Nama hari libur tidak boleh kosong.");
    try {
      if (modalType === "add") {
        await addDoc(eventsCollection, { title, start: selectedDate, end: selectedDate });
      } else if (modalType === "edit" && selectedEvent?.id) {
        const ref = doc(db, "events", selectedEvent.id);
        await updateDoc(ref, { title });
      }
      setShowModal(false);
      setTitle("");
      await loadEvents();
    } catch (err) {
      console.error("Gagal menyimpan event:", err);
    }
  }

  async function handleDelete() {
    if (!selectedEvent?.id) return;
    try {
      await deleteDoc(doc(db, "events", selectedEvent.id));
      setShowModal(false);
      await loadEvents();
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // === Calendar Handlers ===
  function handleDateClick(info: any) {
    if (!canEdit) return;
    setSelectedDate(info.dateStr);
    setTitle("");
    setModalType("add");
    setShowModal(true);
  }

  function handleEventClick(info: any) {
    if (!canEdit) return;
    setSelectedEvent({
      id: info.event.id,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr || info.event.startStr,
    });
    setTitle(info.event.title);
    setModalType("edit");
    setShowModal(true);
  }

  // === Modal Component ===
  const Modal = () =>
    showModal ? (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <h3 style={styles.modalTitle}>
            {modalType === "add" ? "Tambah Hari Libur" : "Edit Hari Libur"}
          </h3>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Masukkan nama hari libur"
            style={styles.input}
          />

          <div style={styles.modalButtons}>
            <button onClick={handleSave} style={styles.saveButton}>
              💾 Simpan
            </button>
            {modalType === "edit" && (
              <button onClick={handleDelete} style={styles.deleteButton}>
                🗑️ Hapus
              </button>
            )}
            <button onClick={() => setShowModal(false)} style={styles.cancelButton}>
              ❌ Batal
            </button>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0 }}>📅 Jadwal Hari Libur</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>
            Role: {localStorage.getItem("role") || "viewer"}
          </span>
          <button onClick={handleLogout} style={styles.logoutButton}>
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
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      {/* Modal */}
      <Modal />
    </div>
  );
}

// === Inline Styles ===
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "90%",
    maxWidth: 400,
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    margin: "0 0 10px",
    fontSize: 18,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: "1px solid #ccc",
    marginBottom: 12,
  },
  modalButtons: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
  },
  saveButton: {
    flex: 1,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  deleteButton: {
    flex: 1,
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  cancelButton: {
    flex: 1,
    background: "#9ca3af",
    color: "#fff",
    border: "none",
    padding: "8px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 600,
  },
  logoutButton: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
};
