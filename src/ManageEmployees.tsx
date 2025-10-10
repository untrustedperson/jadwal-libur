import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
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
  const navigate = useNavigate();

  const employeesCollection = collection(db, "employees");

  // 🔁 Load Data
  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const snapshot = await getDocs(employeesCollection);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Employee) }));
    setEmployees(list);
  }

  // ➕ Tambah
  async function handleAdd() {
    if (!newEmployee.trim()) return alert("Nama pegawai tidak boleh kosong!");
    await addDoc(employeesCollection, { name: newEmployee.trim() });
    setNewEmployee("");
    await loadEmployees();
  }

  // ✏️ Update
  async function handleUpdate(id: string) {
    if (!editName.trim()) return alert("Nama baru tidak boleh kosong!");
    await updateDoc(doc(db, "employees", id), { name: editName.trim() });
    setEditId(null);
    setEditName("");
    await loadEmployees();
  }

  // ❌ Hapus
  async function handleDelete(id: string) {
    const confirmDelete = window.confirm("Hapus pegawai ini?");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "employees", id));
    await loadEmployees();
  }

  return (
    <div
      style={{
        padding: "20px",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "24px",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "700px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <h2 style={{ margin: 0, color: "#1e3a8a" }}>👥 Kelola Pegawai</h2>
          <button
            onClick={() => navigate("/calendar")}
            style={{
              padding: "8px 14px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ← Kembali ke Kalender
          </button>
        </div>

        {/* Input Tambah Pegawai */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            style={{
              flex: 1,
              minWidth: "180px",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              outline: "none",
              fontSize: 14,
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Tambah
          </button>
        </div>

        {/* Tabel Responsif */}
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
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
                    transition: "0.2s",
                  }}
                >
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={tdStyle}>
                    {editId === emp.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          padding: "6px 8px",
                          border: "1px solid #ccc",
                          borderRadius: 6,
                          width: "100%",
                        }}
                      />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td style={{ ...tdStyle, display: "flex", gap: "6px", justifyContent: "center" }}>
                    {editId === emp.id ? (
                      <>
                        <button
                          onClick={() => handleUpdate(emp.id!)}
                          style={btnSave}
                        >
                          Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                          style={btnCancel}
                        >
                          Batal
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
        </div>

        {/* Jika kosong */}
        {employees.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              marginTop: "20px",
            }}
          >
            Belum ada pegawai.
          </p>
        )}
      </div>
    </div>
  );
}

// 🎨 Styling tabel dan tombol
const thStyle: React.CSSProperties = {
  padding: "10px",
  textAlign: "center",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  textAlign: "center",
  color: "#1f2937",
  borderBottom: "1px solid #e5e7eb",
};

const btnEdit: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};

const btnDelete: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};

const btnSave: React.CSSProperties = {
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};

const btnCancel: React.CSSProperties = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};
