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
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee: string;
  leaveType: string;
  start: string;
  end?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // 🔁 Realtime sync dari Firestore
  useEffect(() => {
    const unsubEvents = onSnapshot(eventsCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as CalendarEvent),
      }));
      setEvents(data);
    });

    const unsubEmployees = onSnapshot(employeesCollection, (snapshot) => {
      const list = snapshot.docs.map((d) => d.data().name as string);
      setEmployees(list);
    });

    return () => {
      unsubEvents();
      unsubEmployees();
    };
  }, []);

  // 🚪 Logout
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  // 🟢 Klik tanggal → buka modal form
  async function handleDateClick(info: any) {
    if (!canEdit) return;
    setSelectedDate(info.dateStr);
    setShowForm(true);
  }

  // 🟢 Simpan event baru
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedEmployee || !leaveType) {
      alert("Harap pilih nama pegawai dan jenis hari libur!");
      return;
    }

    const title = `${selectedEmployee} - ${leaveType}`;
    try {
      await addDoc(eventsCollection, {
        title,
        employee: selectedEmployee,
        leaveType,
        start: selectedDate,
        end: selectedDate,
      });
      setShowForm(false);
      setSelectedEmployee("");
      setLeaveType("");
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // 🟠 Update event
  async function handleEventClick(info: any) {
    if (!canEdit) return;

    const newTitle = window.prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle || newTitle.trim() === "") return;

    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // 🔴 Hapus event
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // 🗓️ Render event di kalender
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span style={{ fontSize: "14px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>
          {arg.event.title}
        </span>
        {canEdit && (
          <button
            onClick={onDelete as any}
            onTouchStart={onDelete as any}
            style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", padding: 4 }}
          >
            🗑️
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, width: "100vw", maxWidth: "100%", overflowX: "hidden" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>📅 Jadwal Hari Libur — Halo, {userName}</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, opacity: 0.8 }}>Role: {localStorage.getItem("role") || "viewer"}</span>
          {canEdit && (
            <button
              onClick={() => navigate("/manage-employees")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #059669",
                background: "#10b981",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Kelola Pegawai
            </button>
          )}
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

      {/* Modal Create Event */}
      {showForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              width: "90%",
              maxWidth: 400,
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Tambah Hari Libur</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Cari Pegawai */}
              <input
                type="text"
                placeholder="Cari nama pegawai..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                required
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              >
                <option value="">Pilih Pegawai</option>
                {employees
                  .filter((name) => name.toLowerCase().includes(search.toLowerCase()))
                  .map((name, idx) => (
                    <option key={idx} value={name}>
                      {name}
                    </option>
                  ))}
              </select>

              {/* Jenis Cuti */}
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                style={{
                  padding: "8px",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                }}
              >
                <option value="">Pilih Jenis Cuti</option>
                <option value="sakit">Sakit</option>
                <option value="cuti tahunan">Cuti Tahunan</option>
                <option value="cuti penting">Cuti Penting</option>
                <option value="cuti penangguhan">Cuti Penangguhan</option>
              </select>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#ccc",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
