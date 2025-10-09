import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
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
      ...(d.data() as Omit<UserRole, "id">),
      id: d.id,
    })) as UserRole[];
    setUsers(data);
  }

  useEffect(() => {
    loadUsers();

    // === Real-time listener untuk perubahan role (langsung update dashboard)
    const unsub = onSnapshot(collection(db, "roles"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        ...(d.data() as Omit<UserRole, "id">),
        id: d.id,
      })) as UserRole[];
      setUsers(data);
    });

    return () => unsub();
  }, []);

  // === Update role ===
  async function handleRoleChange(uid: string, newRole: string) {
    try {
      const userRef = doc(db, "roles", uid);
      await updateDoc(userRef, { role: newRole });

      // 🔄 Cek apakah user yang diubah adalah user yang sedang login
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === uid) {
        localStorage.setItem("role", newRole);
        window.location.reload(); // Paksa reload untuk update hak akses
      }
    } catch (err) {
      console.error("Gagal mengubah role:", err);
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
                  {user.role !== "dev" && (
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={{
                          ...styles.actionBtn,
                          background: user.role === "admin" ? "#16a34a" : "#60a5fa",
                        }}
                      >
                        Jadikan Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={{
                          ...styles.actionBtn,
                          background: user.role === "viewer" ? "#f87171" : "#facc15",
                        }}
                      >
                        Jadikan Viewer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// === Styles ===
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background: "linear-gradient(135deg, #2563eb, #60a5fa)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px 10px",
    boxSizing: "border-box",
    overflowX: "hidden", // 🟢 fix background kanan
  },
  header: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: "1.5rem",
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
  },
  tableContainer: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "100%",
    maxWidth: 900,
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    overflowX: "auto", // ✅ agar tetap responsif di mobile
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#f3f4f6",
  },
  th: {
    padding: "12px 8px",
    textAlign: "left",
    fontWeight: "bold",
    fontSize: 14,
  },
  tr: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: "10px 8px",
    fontSize: 14,
    wordBreak: "break-word",
  },
  actionButtons: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  actionBtn: {
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
    transition: "0.2s",
  },
};
