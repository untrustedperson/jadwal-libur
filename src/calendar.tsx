import { useState, useEffect } from "react";
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
  getDocs,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee: string;
  type: string;
  start: string;
  end?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [employees, setEmployees] = useState<string[]>([]);
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // 🔒 Logout
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  // 🔄 Real-time data events
  useEffect(() => {
    const unsubscribe = onSnapshot(eventsCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as CalendarEvent),
      }));
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

  // 🔄 Load nama pegawai untuk dropdown
  useEffect(() => {
    const loadEmployees = async () => {
      const snapshot = await getDocs(employeesCollection);
      setEmployees(snapshot.docs.map((d) => d.data().name));
    };
    loadEmployees();
  }, []);

  // ➕ CREATE
  async function handleDateClick(info: any) {
    if (!canEdit) return;

    // Menu pilihan pegawai
    const employee = prompt(
      "Masukkan nama pegawai (atau pilih dari daftar):\n\n" +
        employees.join(", ")
    );
    if (!employee || employee.trim() === "") return;

    // Menu pilihan jenis libur
    const type = prompt(
      "Pilih jenis hari libur:\n1. Sakit\n2. Cuti Tahunan\n3. Cuti Penting\n4. Cuti Penangguhan"
    );
    if (!type) return;

    const mappedType = {
      "1": "Sakit",
      "2": "Cuti Tahunan",
      "3": "Cuti Penting",
      "4": "Cuti Penangguhan",
    }[type.trim()] as string;

    const title = `${employee} - ${mappedType}`;

    try {
      await addDoc(eventsCollection, {
        title,
        employee,
        type: mappedType,
        start: info.dateStr,
        end: info.dateStr,
      });
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // ✏️ UPDATE
  async function handleEventClick(info: any) {
    if (!canEdit) return;
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle || newTitle.trim() === "") return;

    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // ❌ DELETE
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    const ok = window.confirm("Hapus event ini?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // 🗓️ Event Content
  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
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
            onClick={onDelete}
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

  // 🔍 Fungsi pencarian
  function handleSearch() {
    if (!search.trim()) {
      setSummary({});
      return;
    }

    const lower = search.toLowerCase();
    const filtered = events.filter((e) =>
      e.employee.toLowerCase().includes(lower)
    );

    const counts: Record<string, number> = {};
    filtered.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });

    setSummary(counts);
  }

  return (
    <div
      style={{
        padding: "20px",
        width: "100vw",
        maxWidth: "100%",
        overflowX: "hidden",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
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
        <h2 style={{ margin: 0, fontSize: 20 }}>
          📅 Jadwal Hari Libur — Halo, {userName}
        </h2>

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

      {/* 🔍 Search Bar */}
      <div
        style={{
          marginTop: 24,
          background: "#f9fafb",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          maxWidth: 500,
          marginInline: "auto",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 10 }}>
          🔍 Cari Data Hari Libur Pegawai
        </h3>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "10px",
              border: "1px solid #d1d5db",
              borderRadius: 8,
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "10px 16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cari
          </button>
        </div>

        {/* Hasil */}
        {Object.keys(summary).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ textAlign: "center", color: "#1e3a8a" }}>
              Hasil untuk "{search}"
            </h4>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "center",
              }}
            >
              <thead>
                <tr style={{ background: "#e5e7eb" }}>
                  <th style={{ padding: 8 }}>Jenis Libur</th>
                  <th style={{ padding: 8 }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary).map(([type, count]) => (
                  <tr key={type}>
                    <td style={{ padding: 8 }}>{type}</td>
                    <td style={{ padding: 8 }}>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
