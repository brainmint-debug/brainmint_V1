// FILE: src/pages/settings/Pages.jsx
import React, { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000/api";

export default function Pages({ user }) {
  const userId = user?.id || null;

  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null); // null = create, object = edit
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [saving, setSaving] = useState(false);

  // View state
  const [viewingPage, setViewingPage] = useState(null);

  useEffect(() => {
    if (!userId) return;
    fetchPages();
  }, [userId]);

  const fetchPages = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/pages/?user_id=${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages(data.pages || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingPage(null);
    setFormTitle("");
    setFormBody("");
    setModalOpen(true);
  };

  const openEdit = (page) => {
    setEditingPage(page);
    setFormTitle(page.title);
    setFormBody(page.body);
    setModalOpen(true);
    setViewingPage(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPage(null);
    setFormTitle("");
    setFormBody("");
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    setSaving(true);
    try {
      if (editingPage) {
        // Update
        const res = await fetch(`${API_BASE}/pages/update/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page_id: editingPage.id, title: formTitle, body: formBody }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingPage.id
              ? { ...p, title: formTitle, body: formBody, updated_at: new Date().toISOString() }
              : p
          )
        );
      } else {
        // Create
        const res = await fetch(`${API_BASE}/pages/create/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, title: formTitle, body: formBody }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setPages((prev) => [data.page, ...prev]);
      }
      closeModal();
    } catch (err) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pageId) => {
    if (!window.confirm("Delete this page?")) return;
    try {
      const res = await fetch(`${API_BASE}/pages/delete/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_id: pageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages((prev) => prev.filter((p) => p.id !== pageId));
      if (viewingPage?.id === pageId) setViewingPage(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const filtered = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    (p.body || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Viewing a page ──
  if (viewingPage) {
    return (
      <div className="p-6 w-full max-w-3xl mx-auto">
        <button
          onClick={() => setViewingPage(null)}
          className="text-sm text-gray-500 hover:text-gray-800 mb-4 flex items-center gap-1"
        >
          ← Back to Pages
        </button>
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">{viewingPage.title}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => openEdit(viewingPage)}
                className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(viewingPage.id)}
                className="px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-6">
            Updated {formatDate(viewingPage.updated_at)}
          </div>
          <div
            className="text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[200px]"
            style={{ fontSize: 15 }}
          >
            {viewingPage.body || <span className="text-gray-400 italic">No content yet.</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      <h1 className="text-2xl font-semibold mb-4">Pages</h1>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6 gap-3">
        <input
          className="border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-300 flex-1 max-w-sm"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
        >
          + New Page
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center text-gray-400 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <div className="text-4xl mb-3">📄</div>
          <div className="font-medium text-gray-500">No pages yet</div>
          <div className="text-sm mt-1">Create your first page to get started</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((page) => (
            <div
              key={page.id}
              className="bg-white border rounded-2xl p-4 shadow-sm flex justify-between items-center hover:border-green-300 transition"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="font-medium text-gray-800 truncate">{page.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Updated {formatDate(page.updated_at)}
                  {page.body ? ` • ${page.body.slice(0, 60)}${page.body.length > 60 ? "…" : ""}` : " • No content"}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => setViewingPage(page)}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Open
                </button>
                <button
                  onClick={() => openEdit(page)}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(page.id)}
                  className="px-3 py-1.5 border border-red-200 text-red-400 rounded-lg text-sm hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 flex flex-col" style={{ maxHeight: "90vh" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPage ? "Edit Page" : "New Page"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5 flex flex-col gap-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Page title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Write your page content here..."
                  rows={14}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 text-sm resize-none"
                  style={{ fontFamily: "inherit", lineHeight: 1.6 }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingPage ? "Save Changes" : "Create Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}