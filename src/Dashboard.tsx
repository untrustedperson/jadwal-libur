import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

interface UserRole {
  id: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [users, setUsers] = useState<UserRole[]>([]);

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

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ textAlign: "center", marginBottom: 20 }}>👑 Dev Dashboard – Manajemen Role</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th style={{ padding: 8 }}>Email</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: 8 }}>{user.email}</td>
              <td style={{ padding: 8, textTransform: "capitalize" }}>{user.role}</td>
              <td style={{ padding: 8 }}>
                {user.role !== "dev" && (
                  <>
                    <button
                      onClick={() => handleRoleChange(user.id, "admin")}
                      style={{ marginRight: 8, padding: "4px 8px", cursor: "pointer" }}
                    >
                      Jadikan Admin
                    </button>
                    <button
                      onClick={() => handleRoleChange(user.id, "viewer")}
                      style={{ padding: "4px 8px", cursor: "pointer" }}
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
  );
}