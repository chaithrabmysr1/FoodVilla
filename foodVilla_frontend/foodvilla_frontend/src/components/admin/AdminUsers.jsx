import React, { useEffect, useState } from "react";
import { listUsers, updateUserRole } from "../../services/userApi";
import "../../styles/Admin.css";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");

  const load = () => {
    listUsers()
      .then((res) => setUsers(res.data || []))
      .catch((err) => setMessage(err.response?.data?.message || "Failed to load users"));
  };

  useEffect(load, []);

  const handleRoleChange = async (user, role) => {
    if (role === user.role) return;
    if (!window.confirm(`Change ${user.email}'s role to ${role}?`)) return;
    try {
      await updateUserRole(user.id, role);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to update role");
    }
  };

  return (
    <div>
      <div className="admin-page-header">
        <h2>Users</h2>
      </div>

      {message && <div className="admin-message">{message}</div>}

      {users.length === 0 ? (
        <p className="admin-empty">No users found.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td>{u.phoneNumber}</td>
                <td>
                  <select value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)}>
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsers;
