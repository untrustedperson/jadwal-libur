import { useEffect, useState } from "react";
import { db } from "./firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface Employee {
  id: string;
  name: string;
}

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const snap = await getDocs(collection(db, "employees"));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Employee[];
    setEmployees(data);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await addDoc(collection(db, "employees"), { name: newName });
    setNewName("");
    loadEmployees();
  }

  async function handleEdit(id: string, name: string) {
    setEditId(id);
    setNewName(name);
  }

  async function handleSaveEdit() {
    if (!editId) return;
    await updateDoc(doc(db, "employees", editId), { name: newName });
    setEditId(null);
    setNewName("");
    loadEmployees();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus pegawai ini?")) return;
    await deleteDoc(doc(db, "employees", id));
    loadEmployees();
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>👥 Kelola Pegawai</h2>
          <button
            onClick={handleLogout}
            style={{
              background: "#ef4444",
              border: "none",
              color: "#fff",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>

        {/* Input tambah/edit */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Nama Pegawai"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
            }}
          />
          {editId ? (
            <button
              onClick={handleSaveEdit}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              Simpan
            </button>
          ) : (
            <button
              onClick={handleAdd}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              Tambah
            </button>
          )}
        </div>

        {/* Daftar pegawai */}
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {employees.map((emp) => (
            <li
              key={emp.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #eee",
                padding: "8px 0",
              }}
            >
              <span>{emp.name}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => handleEdit(emp.id, emp.name)}
                  style={{
                    background: "#fbbf24",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                  }}
                >
                  Hapus
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
