import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface Employee {
  id?: string;
  name: string;
}

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const employeesCollection = collection(db, "employees");

  // 🔁 Load data pegawai
  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      setLoading(true);
      const snapshot = await getDocs(employeesCollection);
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "(Tanpa Nama)",
      }));
      setEmployees(list);
    } catch (err) {
      console.error("❌ Gagal memuat pegawai:", err);
    } finally {
      setLoading(false);
    }
  }

  // ➕ Tambah pegawai baru
  async function handleAdd() {
    if (!newEmployee.trim()) return alert("Nama pegawai tidak boleh kosong!");
    await addDoc(employeesCollection, { name: newEmployee.trim() });
    setNewEmployee("");
    await loadEmployees();
  }

  // ✏️ Update pegawai
  async function handleUpdate(id: string) {
    if (!editName.trim()) return alert("Nama baru tidak boleh kosong!");
    await updateDoc(doc(db, "employees", id), { name: editName.trim() });
    setEditId(null);
    setEditName("");
    await loadEmployees();
  }

  // ❌ Hapus pegawai
  async function handleDelete(id: string) {
    const confirmDelete = window.confirm("Hapus pegawai ini?");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "employees", id));
    await loadEmployees();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        padding: "40px 16px",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: 800,
          marginBottom: 30,
          flexWrap: "wrap",
        }}
      >
        <h1
          style={{
            color: "#fff",
            margin: 0,
            fontSize: "1.8rem",
            fontWeight: 700,
          }}
        >
          👥 Kelola Pegawai
        </h1>

        <button
          onClick={() => navigate("/calendar")}
          style={{
            padding: "10px 18px",
            background: "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Kembali
        </button>
      </div>

      {/* Card Utama */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 8px 25px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 700,
          padding: "30px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ color: "#1e3a8a", marginBottom: 20 }}>Tambah Pegawai</h2>
        <div
          style={{
            display: "flex",
            flexDirection: window.innerWidth < 600 ? "column" : "row",
            gap: 10,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              width: window.innerWidth < 600 ? "100%" : "auto",
            }}
          >
            Tambah
          </button>
        </div>

        {/* Daftar Pegawai */}
        <h3
          style={{
            color: "#1e3a8a",
            marginTop: 30,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Daftar Pegawai
        </h3>

        {loading ? (
          <p style={{ color: "#6b7280" }}>⏳ Memuat data pegawai...</p>
        ) : employees.length === 0 ? (
          <p style={{ color: "#6b7280" }}>Belum ada pegawai.</p>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "center",
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                <th style={thStyle}>No</th>
                <th style={thStyle}>Nama Pegawai</th>
                <th style={thStyle}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                  }}
                >
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{ ...tdStyle, color: "#1f2937", fontWeight: 500 }}>
                    {editId === emp.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: "1px solid #9ca3af",
                          width: "100%",
                          color: "#111827",
                          background: "#f9fafb",
                        }}
                      />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td style={tdStyle}>
                    {editId === emp.id ? (
                      <>
                        <button onClick={() => handleUpdate(emp.id!)} style={btnSave}>
                          💾 Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                          style={btnCancel}
                        >
                          ✖ Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditId(emp.id!);
                            setEditName(emp.name);
                          }}
                          style={btnEdit}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id!)}
                          style={btnDelete}
                        >
                          🗑️ Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "2px solid #e5e7eb",
  color: "#111827",
  fontWeight: 700,
};

const tdStyle: React.CSSProperties = {
  padding: "8px",
  borderBottom: "1px solid #e5e7eb",
  color: "#1f2937",
};

const btnEdit: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  margin: "0 4px",
};

const btnDelete: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  margin: "0 4px",
};

const btnSave: React.CSSProperties = {
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  margin: "0 4px",
};

const btnCancel: React.CSSProperties = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  margin: "0 4px",
};
