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
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // Logout
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  // 🔄 Realtime update dari Firestore
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

  // ➕ CREATE EVENT
  async function handleDateClick(info: any) {
    if (!canEdit) return;

    // Nama pegawai
    const employee = window.prompt(
      `Pilih nama pegawai:\n${employees.join(", ")}\n(Ketik nama sesuai daftar)`
    );
    if (!employee || !employees.includes(employee)) {
      alert("Nama pegawai tidak valid.");
      return;
    }

    // Jenis cuti
    const leaveType = window.prompt(
      "Masukkan jenis hari libur (sakit/cuti tahunan/cuti penting/cuti penangguhan):"
    );
    const validTypes = ["sakit", "cuti tahunan", "cuti penting", "cuti penangguhan"];
    if (!leaveType || !validTypes.includes(leaveType.toLowerCase())) {
      alert("Jenis hari libur tidak valid.");
      return;
    }

    const title = `${employee} - ${leaveType}`;

    try {
      await addDoc(eventsCollection, {
        title,
        employee,
        leaveType,
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

    const newTitle = window.prompt("Ubah nama hari libur:", info.event.title);
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
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // Event Content
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
            onTouchStart={onDelete as any}
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
    </div>
  );
}