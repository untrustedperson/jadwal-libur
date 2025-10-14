import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface UserRole {
  id: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const [deleting] = useState(false); // ⏳ Loading state untuk delete
  const navigate = useNavigate();

  // === Logout ===
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.clear();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  // === Load all users ===
  async function loadUsers() {
    const snapshot = await getDocs(collection(db, "roles"));
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<UserRole, "id">),
    })) as UserRole[];
    setUsers(data);
  }

  // === Listener untuk perubahan role secara realtime ===
  useEffect(() => {
    loadUsers();

    const unsub = onSnapshot(collection(db, "roles"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserRole, "id">),
      })) as UserRole[];
      setUsers(data);

      const currentUser = auth.currentUser;
      if (currentUser) {
        const user = data.find((u) => u.id === currentUser.uid);
        if (user && localStorage.getItem("role") !== user.role) {
          localStorage.setItem("role", user.role);
          window.location.reload();
        }
      }
    });

    return () => unsub();
  }, []);

  // === Update role ===
  async function handleRoleChange(uid: string, newRole: string) {
    try {
      const userRef = doc(db, "roles", uid);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      console.error("Gagal mengubah role:", err);
    }
  }

  // === Hapus user ===
  async function handleDeleteUser(uid: string) {
  if (!confirm("Yakin ingin menghapus user ini?")) return;

  try {
    // ✅ Set flag agar App.tsx tahu ini proses admin
    localStorage.setItem("deleting_user", "true");

    const res = await fetch("/api/delete-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid }),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("Respon bukan JSON:", text);
      throw new Error(text);
    }

    if (!res.ok) throw new Error(data.error || "Server error");

    alert("✅ User berhasil dihapus.");
  } catch (err: any) {
    console.error("Gagal hapus user:", err);
    alert("❌ " + err.message);
  } finally {
    // 🧹 Hapus flag setelah selesai
    localStorage.removeItem("deleting_user");
  }
}


  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>👑 Dev Dashboard – Manajemen Role</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      {/* Table container */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>
                  <span style={{ textTransform: "capitalize" }}>{user.role}</span>
                </td>
                <td style={styles.td}>
                  {user.role !== "dev" ? (
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={{
                          ...styles.actionBtn,
                          background:
                            user.role === "admin" ? "#1d4ed8" : "#2563eb",
                        }}
                      >
                        Jadikan Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={{
                          ...styles.actionBtn,
                          background:
                            user.role === "viewer" ? "#e11d48" : "#f43f5e",
                        }}
                      >
                        Jadikan Viewer
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Hapus User
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: "#6b7280", fontStyle: "italic" }}>
                      Tidak dapat diubah
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🔄 Loading Overlay saat delete */}
      {deleting && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingBox}>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: 12, color: "#1e3a8a", fontWeight: 600 }}>
              Menghapus user...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// === Styles ===
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "30px 16px",
    boxSizing: "border-box",
    overflowX: "hidden",
  },
  header: {
    width: "100%",
    maxWidth: 1000,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  title: {
    color: "#fff",
    fontSize: "1.8rem",
    margin: 0,
  },
  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "0.2s",
  },
  tableContainer: {
    background: "#fff",
    borderRadius: 12,
    padding: "20px",
    width: "100%",
    maxWidth: 1000,
    boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#f3f4f6",
  },
  th: {
    padding: "12px 10px",
    textAlign: "left",
    fontWeight: "bold",
    color: "#1e3a8a",
    fontSize: 14,
  },
  tr: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px 8px",
    fontSize: 14,
    color: "#111827",
    verticalAlign: "middle",
  },
  actionButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(255,255,255,0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingBox: {
    background: "#fff",
    padding: "30px 40px",
    borderRadius: 12,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  spinner: {
    width: 40,
    height: 40,
    border: "4px solid #d1d5db",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
};


