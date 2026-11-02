import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DonorDashboard.css";

const API_URL = "https://sharemeal-1qz0.onrender.com";

export default function DonorDashboard() {
  const [user, setUser] = useState(null);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    quantity: "",
    expiryDate: "",
    pickupAddress: "",
    contactInfo: "",
  });
  const [editingId, setEditingId] = useState(null);

  const navigate = useNavigate();

  // Fetch logged-in user
  useEffect(() => {
    fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
        setUser(null);
      });
  }, []);

  // Fetch donor's donations
  const reloadDonations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/donations`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setDonations([]);
        if (res.status === 401) {
          setMsg("Please log in to view and manage your donations.");
        } else {
          setMsg(data?.message || "Failed to fetch donations.");
        }
        return;
      }

      setDonations(Array.isArray(data.donations) ? data.donations : []);
    } catch (e) {
      console.error("Fetch donations error:", e);
      setDonations([]);
      setMsg("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function fetchDonationsOnMount() {
      try {
        const res = await fetch(`${API_URL}/api/donations`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json();

        if (ignore) return;

        if (!res.ok) {
          setDonations([]);
          if (res.status === 401) {
            setMsg("Please log in to view and manage your donations.");
          } else {
            setMsg(data?.message || "Failed to fetch donations.");
          }
          return;
        }

        setDonations(Array.isArray(data.donations) ? data.donations : []);
      } catch (e) {
        if (!ignore) {
          console.error("Fetch donations error:", e);
          setDonations([]);
          setMsg("Failed to connect to the server.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchDonationsOnMount();

    return () => {
      ignore = true;
    };
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({
      title: "",
      description: "",
      quantity: "",
      expiryDate: "",
      pickupAddress: "",
      contactInfo: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API_URL}/api/donations/${editingId}`
      : `${API_URL}/api/donations`;

    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to save donation.");
      }

      setMsg(
        data?.message ||
        (editingId
          ? "Donation updated successfully."
          : "Donation created successfully!")
      );

      setForm({
        title: "",
        description: "",
        quantity: "",
        expiryDate: "",
        pickupAddress: "",
        contactInfo: "",
      });

      setEditingId(null);
      await reloadDonations();
    } catch (err) {
      setMsg(err.message || "Failed to save donation.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (don) => {
    setForm({
      title: don.title || "",
      description: don.description || "",
      quantity: don.quantity || "",
      expiryDate: don.expiryDate ? don.expiryDate.split("T")[0] : "",
      pickupAddress: don.pickupAddress || don.location || "",
      contactInfo: don.contactInfo || "",
    });

    setEditingId(don._id);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const deleteDonation = async (id) => {
    if (!window.confirm("Are you sure you want to delete this donation?"))
      return;

    try {
      const res = await fetch(`${API_URL}/api/donations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete donation.");
      }

      setMsg(data?.message || "Donation deleted successfully.");
      await reloadDonations();
    } catch (err) {
      setMsg(err.message || "Failed to delete donation.");
    }
  };

  const donationList = Array.isArray(donations) ? donations : [];
  const totalQuantity = donationList.reduce(
    (sum, d) => sum + (Number(d.quantity) || 0),
    0
  );
  const activeDonations = donationList.filter(
    (d) => !d.status || d.status === "available"
  );

  return (
    <div className="donor-dashboard-page">
      <nav className="dd-navbar">
        <a href="/" className="dd-logo">
          <span className="dd-logo-icon">🥗</span> ShareMeal
        </a>

        <div className="dd-nav-actions">
          {user && (
            <div className="dd-user-badge">
              <span className="dd-user-dot"></span>
              {user.name} ({user.role || "Donor"})
            </div>
          )}

          <button
            className="dd-back-link"
            onClick={() => navigate("/")}
          >
            ← Back to Home
          </button>
        </div>
      </nav>

      <main className="dd-main">
        <header className="dd-header">
          <span className="dd-eyebrow">FOOD DONOR PORTAL</span>
          <h1 className="dd-title">
            {user ? `Welcome back, ${user.name}` : "Donor Dashboard"}
          </h1>
          <p className="dd-subtitle">
            Manage your surplus food listings, track pickup statuses, and
            connect surplus meals with local NGOs and volunteers.
          </p>
        </header>

        {msg && (
          <div
            className={`dd-alert ${msg.toLowerCase().includes("failed") ||
                msg.toLowerCase().includes("error")
                ? "dd-alert-error"
                : "dd-alert-info"
              }`}
            role="status"
          >
            <span>{msg}</span>
          </div>
        )}

        <section className="dd-stats-grid">
          <article className="dd-stat-card">
            <div className="dd-stat-icon">🍲</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">{donationList.length}</span>
              <span className="dd-stat-label">Total Donations</span>
            </div>
          </article>

          <article className="dd-stat-card">
            <div className="dd-stat-icon">🥗</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">{totalQuantity}</span>
              <span className="dd-stat-label">Meals / Portions Shared</span>
            </div>
          </article>

          <article className="dd-stat-card">
            <div className="dd-stat-icon">📦</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">
                {activeDonations.length}
              </span>
              <span className="dd-stat-label">Available for Pickup</span>
            </div>
          </article>
        </section>

        <section className="dd-card">
          <div className="dd-card-header">
            <h2 className="dd-card-title">
              {editingId ? "Edit Food Donation" : "Add Food Donation"}
            </h2>
            <p className="dd-card-subtitle">
              {editingId
                ? "Update the details of your existing donation listing below."
                : "List surplus food to make it immediately available for NGO partners."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="dd-form">
            <div className="dd-field">
              <label htmlFor="title">
                Food Title / Item Name
                <span className="dd-required">*</span>
              </label>
              <input
                id="title"
                name="title"
                placeholder="e.g. Fresh Veggie Rice Bowls"
                value={form.title}
                onChange={handleChange}
                required
                className="dd-input"
              />
            </div>

            <div className="dd-field">
              <label htmlFor="quantity">
                Quantity (Number of Meals)
                <span className="dd-required">*</span>
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                min="1"
                placeholder="e.g. 20"
                value={form.quantity}
                onChange={handleChange}
                required
                className="dd-input"
              />
            </div>

            <div className="dd-field">
              <label htmlFor="expiryDate">
                Expiry Date / Best Before
                <span className="dd-hint">Optional</span>
              </label>
              <input
                id="expiryDate"
                name="expiryDate"
                type="date"
                value={form.expiryDate}
                onChange={handleChange}
                className="dd-input"
              />
            </div>

            <div className="dd-field">
              <label htmlFor="pickupAddress">
                Pickup Address / Location
                <span className="dd-hint">Optional</span>
              </label>
              <input
                id="pickupAddress"
                name="pickupAddress"
                placeholder="e.g. 142 Community Center, Hall B"
                value={form.pickupAddress}
                onChange={handleChange}
                className="dd-input"
              />
            </div>

            <div className="dd-field dd-field-full">
              <label htmlFor="contactInfo">
                Contact Information
                <span className="dd-hint">Phone or email for coordination</span>
              </label>
              <input
                id="contactInfo"
                name="contactInfo"
                placeholder="e.g. +1 555-0199 or kitchen@example.org"
                value={form.contactInfo}
                onChange={handleChange}
                className="dd-input"
              />
            </div>

            <div className="dd-field dd-field-full">
              <label htmlFor="description">
                Description & Dietary Notes
                <span className="dd-hint">
                  Ingredients, packaging, or storage advice
                </span>
              </label>
              <textarea
                id="description"
                name="description"
                placeholder="e.g. Packed in sealed biodegradable meal boxes. Prepared 2 hours ago. Vegetarian and nut-free."
                value={form.description}
                onChange={handleChange}
                className="dd-textarea"
              />
            </div>

            <div className="dd-form-actions">
              <button
                type="submit"
                className="dd-btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : editingId
                    ? "Update Donation"
                    : "Create Food Donation"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="dd-btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="dd-card">
          <div className="dd-card-header">
            <h2 className="dd-card-title">
              Your Food Donations
              <span className="dd-count-pill">{donationList.length} total</span>
            </h2>
            <p className="dd-card-subtitle">
              All surplus food contributions associated with your donor account.
            </p>
          </div>

          {loading ? (
            <div className="dd-empty-state">
              <p>Loading donations...</p>
            </div>
          ) : donationList.length === 0 ? (
            <div className="dd-empty-state">
              <div className="dd-empty-icon">🍲</div>
              <h3 className="dd-empty-title">No food donations listed yet</h3>
              <p className="dd-empty-text">
                Your listed surplus food will appear here. Fill out the form
                above to share meals with the community.
              </p>
            </div>
          ) : (
            <div className="dd-table-wrapper">
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>Item Details</th>
                    <th>Qty</th>
                    <th>Expiry</th>
                    <th>Pickup Location</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {donationList.map((d) => (
                    <tr key={d._id}>
                      <td>
                        <div className="dd-table-title">{d.title}</div>
                        {d.description && (
                          <div className="dd-table-meta">
                            {d.description}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="dd-qty-badge">
                          {d.quantity} meals
                        </span>
                      </td>

                      <td>
                        {d.expiryDate
                          ? new Date(d.expiryDate).toLocaleDateString()
                          : "—"}
                      </td>

                      <td>{d.pickupAddress || d.location || "—"}</td>

                      <td>
                        <span
                          className={`dd-status dd-status-${d.status || "available"
                            }`}
                        >
                          {d.status || "available"}
                        </span>
                      </td>

                      <td>
                        <div className="dd-actions-cell">
                          <button
                            type="button"
                            onClick={() => startEdit(d)}
                            className="dd-action-btn dd-btn-edit"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteDonation(d._id)}
                            className="dd-action-btn dd-btn-delete"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="dd-footer">
        <div className="dd-logo">
          <span className="dd-logo-icon">🥗</span> ShareMeal
        </div>
        <p>Share food. Spread kindness. Make a difference.</p>
        <span>© 2026 ShareMeal</span>
      </footer>
    </div>
  );
}