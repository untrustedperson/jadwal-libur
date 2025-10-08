import { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
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

  // === Load semua user ===
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const snapshot = await getDocs(collection(db, "roles"));
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserRole[];
    setUsers(data);
  }

  async function handleRoleChange(uid: string, newRole: string) {
    const userRef = doc(db, "roles", uid);
    await updateDoc(userRef, { role: newRole });
    await loadUsers();
  }

  // === LOGOUT DEV ===
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
        padding: 20,
        color: "#fff",
        boxSizing: "border-box",
      }}
    >
      {/* 🔹 Top Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h2 style={{ margin: 0 }}>👑 Dev Dashboard – Manajemen Role</h2>

        <button
          onClick={handleLogout}
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.3s",
          }}
          onMouseOver={(e) => ((e.currentTarget.style.background = "#dc2626"))}
          onMouseOut={(e) => ((e.currentTarget.style.background = "#ef4444"))}
        >
          Logout
        </button>
      </div>

      {/* 🔹 User Table */}
      <div
        style={{
          background: "#fff",
          color: "#000",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
          }}
        >
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ padding: 12 }}>Email</th>
              <th style={{ padding: 12 }}>Role</th>
              <th style={{ padding: 12 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: 12 }}>{user.email}</td>
                <td style={{ padding: 12, textTransform: "capitalize" }}>
                  {user.role}
                </td>
                <td style={{ padding: 12 }}>
                  {user.role !== "dev" && (
                    <>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={{
                          marginRight: 8,
                          padding: "6px 10px",
                          background: "#2563eb",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        Jadikan Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={{
                          padding: "6px 10px",
                          background: "#fbbf24",
                          color: "#000",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                        }}
                      >
                        Jadikan Viewer
                      </button>
                    </>
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
