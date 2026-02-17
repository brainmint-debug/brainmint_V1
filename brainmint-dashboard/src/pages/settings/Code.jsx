// FILE: src/pages/settings/Code.jsx
import React, { useState, useEffect, useRef } from "react";

const API_BASE = "http://localhost:8000/api";

const PLATFORMS = [
  {
    key: "github", label: "GitHub", icon: "🐙",
    tokenLabel: "Personal Access Token",
    tokenHelp: "GitHub → Settings → Developer settings → Personal access tokens → repo scope",
    color: "#24292f", light: "#f6f8fa"
  },
  {
    key: "gitlab", label: "GitLab", icon: "🦊",
    tokenLabel: "Private Token",
    tokenHelp: "GitLab → User Settings → Access Tokens → read_api scope",
    color: "#e24329", light: "#fff7f5"
  },
  {
    key: "bitbucket", label: "Bitbucket", icon: "🧰",
    tokenLabel: "username:app_password",
    tokenHelp: "Bitbucket → Settings → App passwords → Repositories: Read",
    color: "#0052cc", light: "#f0f5ff"
  },
];

const Badge = ({ children, color = "#e8f0fe", text = "#1967d2" }) => (
  <span style={{ background: color, color: text, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
    {children}
  </span>
);

const Card = ({ title, icon, children, style = {} }) => (
  <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8eaed", padding: 20, ...style }}>
    <div style={{ fontWeight: 700, fontSize: 13, color: "#5f6368", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
      <span>{icon}</span>{title}
    </div>
    {children}
  </div>
);

export default function Code({ user }) {
  const userId = user?.id || null;

  const [integrations, setIntegrations] = useState({});
  const [loading, setLoading] = useState(true);
  const [activePlatform, setActivePlatform] = useState(null);

  // NEW: All repos state
  const [allRepos, setAllRepos] = useState({});
  const [reposLoading, setReposLoading] = useState({});
  const [selectedRepo, setSelectedRepo] = useState({});

  // Repo data state
  const [repoData, setRepoData] = useState({});
  const [repoLoading, setRepoLoading] = useState({});
  const [repoErrors, setRepoErrors] = useState({});

  // Modal state
  const [modalPlatform, setModalPlatform] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { if (userId) fetchIntegrations(); }, [userId]);
  useEffect(() => { if (modalPlatform) setTimeout(() => inputRef.current?.focus(), 100); }, [modalPlatform]);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/integrations/?user_id=${userId}`);
      const data = await res.json();
      const integs = data.integrations || {};
      setIntegrations(integs);
      const first = Object.keys(integs)[0];
      if (first) {
        setActivePlatform(first);
        fetchAllRepos(first);
      }
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Fetch all repos for a platform
  const fetchAllRepos = async (platform) => {
    setReposLoading(p => ({ ...p, [platform]: true }));
    try {
      const res = await fetch(`${API_BASE}/integrations/repos/?user_id=${userId}&platform=${platform}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAllRepos(p => ({ ...p, [platform]: data.repos || [] }));

      // Auto-select first repo
      if (data.repos && data.repos.length > 0) {
        setSelectedRepo(p => ({ ...p, [platform]: data.repos[0].url }));
        fetchRepoData(platform, data.repos[0].url);
      }
    } catch (err) {
      console.error(`Failed to fetch repos for ${platform}:`, err);
      setRepoErrors(p => ({ ...p, [platform]: err.message }));
    } finally {
      setReposLoading(p => ({ ...p, [platform]: false }));
    }
  };

  // UPDATED: Fetch repo data with repo URL param
  const fetchRepoData = async (platform, repoUrl) => {
    setRepoLoading(p => ({ ...p, [platform]: true }));
    setRepoErrors(p => ({ ...p, [platform]: null }));
    try {
      const res = await fetch(
        `${API_BASE}/integrations/repo-data/?user_id=${userId}&platform=${platform}&repo_url=${encodeURIComponent(repoUrl)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRepoData(p => ({ ...p, [platform]: data.data }));
    } catch (err) {
      setRepoErrors(p => ({ ...p, [platform]: err.message }));
    } finally {
      setRepoLoading(p => ({ ...p, [platform]: false }));
    }
  };

  const openModal = (key) => {
    setAccessToken("");
    setModalError("");
    setModalPlatform(key);
  };

  const closeModal = () => {
    setModalPlatform(null);
    setAccessToken("");
    setModalError("");
  };

  const handleSave = async () => {
    if (!accessToken.trim()) {
      setModalError("Access token is required.");
      return;
    }

    setSaving(true);
    setModalError("");
    try {
      const res = await fetch(`${API_BASE}/integrations/save/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          platform: modalPlatform,
          repo_url: "https://placeholder.com", // Not used anymore
          access_token: accessToken.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIntegrations(prev => ({
        ...prev,
        [modalPlatform]: {
          repo_url: "https://placeholder.com",
          connected_at: new Date().toISOString()
        }
      }));

      setActivePlatform(modalPlatform);
      closeModal();
      fetchAllRepos(modalPlatform);
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (key) => {
    if (!window.confirm("Disconnect this integration? This will remove access to all repositories.")) return;

    await fetch(`${API_BASE}/integrations/delete/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, platform: key }),
    });

    const updated = { ...integrations };
    delete updated[key];
    setIntegrations(updated);

    // Clean up state
    setAllRepos(p => { const n = { ...p }; delete n[key]; return n; });
    setRepoData(p => { const n = { ...p }; delete n[key]; return n; });
    setSelectedRepo(p => { const n = { ...p }; delete n[key]; return n; });

    if (activePlatform === key) {
      setActivePlatform(Object.keys(updated)[0] || null);
    }
  };

  const handleRepoChange = (platform, newRepoUrl) => {
    setSelectedRepo(p => ({ ...p, [platform]: newRepoUrl }));
    fetchRepoData(platform, newRepoUrl);
  };

  const connectedPlatforms = PLATFORMS.filter(p => integrations[p.key]);
  const activePlatformMeta = PLATFORMS.find(p => p.key === activePlatform);
  const active = repoData[activePlatform];
  const activeLoading = repoLoading[activePlatform];
  const activeError = repoErrors[activePlatform];
  const modalMeta = PLATFORMS.find(p => p.key === modalPlatform);

  const currentRepos = allRepos[activePlatform] || [];
  const currentReposLoading = reposLoading[activePlatform];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", fontSize: 14, color: "#202124", background: "#f8f9fa", minHeight: "100vh" }}>
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#202124" }}>Code Integrations</h1>
            <p style={{ margin: "4px 0 0", color: "#5f6368", fontSize: 13 }}>
              Connect your account to view all repositories, commits, PRs, and branches.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PLATFORMS.map(({ key, label, icon, color }) => {
              const connected = !!integrations[key];
              return (
                <button
                  key={key}
                  onClick={() => openModal(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                    border: connected ? `1.5px solid ${color}` : "1.5px solid #dadce0",
                    background: connected ? color : "white",
                    color: connected ? "white" : "#3c4043",
                    boxShadow: connected ? `0 2px 8px ${color}33` : "none",
                  }}
                >
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  {connected ? `✓ ${label}` : `+ ${label}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Empty state ── */}
        {!loading && connectedPlatforms.length === 0 && (
          <div style={{ background: "white", borderRadius: 16, border: "1px solid #e8eaed", padding: "60px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Connect your code to BrainMint</h2>
            <p style={{ color: "#5f6368", maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.6 }}>
              Gain visibility into all your repositories, commits, pull requests, and branches without switching context.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 32 }}>
              <div style={{ width: 180, height: 110, background: "linear-gradient(135deg, #7c73f9, #a19dfc)", borderRadius: 10, boxShadow: "0 4px 16px #7c73f940", padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ width: 36, height: 6, background: "#6deb7d", borderRadius: 2 }} />
                <div style={{ fontSize: 22, color: "white", fontWeight: 700 }}>kan-251</div>
              </div>
              <pre style={{ background: "#0f0f0f", borderRadius: 10, color: "#7ae582", fontFamily: "monospace", fontSize: 14, padding: "16px 20px", margin: 0, display: "flex", alignItems: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" }}>
                $ git commit -m "Kan-1 update"
              </pre>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              {PLATFORMS.map(({ key, label, icon }) => (
                <button key={key} onClick={() => openModal(key)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, border: "1.5px solid #dadce0", background: "white", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span> Connect {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Connected view ── */}
        {connectedPlatforms.length > 0 && (
          <>
            {/* Platform tabs */}
            {connectedPlatforms.length > 1 && (
              <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "white", borderRadius: 10, padding: 4, border: "1px solid #e8eaed", width: "fit-content" }}>
                {connectedPlatforms.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setActivePlatform(p.key);
                      if (!allRepos[p.key]) fetchAllRepos(p.key);
                    }}
                    style={{
                      padding: "7px 18px", borderRadius: 7, border: "none", cursor: "pointer",
                      fontWeight: activePlatform === p.key ? 700 : 500, fontSize: 13,
                      background: activePlatform === p.key ? activePlatformMeta?.color || "#1a73e8" : "transparent",
                      color: activePlatform === p.key ? "white" : "#5f6368",
                      transition: "all 0.15s",
                    }}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* NEW: Repository Selector Dropdown */}
            {activePlatform && currentRepos.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#3c4043" }}>
                  Select Repository ({currentRepos.length} {currentRepos.length === 1 ? 'repo' : 'repos'})
                </label>
                <select
                  value={selectedRepo[activePlatform] || ''}
                  onChange={(e) => handleRepoChange(activePlatform, e.target.value)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1.5px solid #dadce0",
                    fontSize: 14,
                    width: "100%",
                    maxWidth: 600,
                    cursor: "pointer",
                    background: "white",
                    outline: "none",
                  }}
                >
                  {currentRepos.map((repo, i) => (
                    <option key={i} value={repo.url}>
                      {repo.name} {repo.is_private ? "🔒" : ""} {repo.language ? `• ${repo.language}` : ""} {repo.stars > 0 ? `⭐ ${repo.stars}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Loading repos */}
            {currentReposLoading && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e8eaed", padding: "48px 24px", textAlign: "center", color: "#5f6368" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                Fetching your repositories from {activePlatformMeta?.label}...
              </div>
            )}

            {/* Loading repo data */}
            {!currentReposLoading && activeLoading && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e8eaed", padding: "48px 24px", textAlign: "center", color: "#5f6368" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                Fetching live data from {activePlatformMeta?.label}...
              </div>
            )}

            {/* Error */}
            {!activeLoading && activeError && (
              <div style={{ background: "#fce8e6", border: "1px solid #f5c6c4", borderRadius: 12, padding: 20 }}>
                <div style={{ fontWeight: 700, color: "#c5221f", marginBottom: 6 }}>⚠️ Failed to load repo data</div>
                <div style={{ color: "#c5221f", fontSize: 13, marginBottom: 10 }}>{activeError}</div>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => selectedRepo[activePlatform] && fetchRepoData(activePlatform, selectedRepo[activePlatform])}
                    style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "#c5221f", color: "white", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
                  >
                    ↻ Retry
                  </button>
                  <button onClick={() => openModal(activePlatform)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #dadce0", background: "white", cursor: "pointer", fontSize: 13 }}>Update Token</button>
                  <span style={{ fontSize: 12, color: "#5f6368" }}>Make sure your token has repo read access.</span>
                </div>
              </div>
            )}

            {/* ── Repo Data ── */}
            {!currentReposLoading && !activeLoading && !activeError && active && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Stats bar */}
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e8eaed", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 20 }}>{activePlatformMeta?.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 17 }}>{active.stats?.name}</span>
                      <Badge color={activePlatformMeta?.light} text={activePlatformMeta?.color}>{active.stats?.visibility}</Badge>
                      {active.stats?.language && <Badge color="#fce8e6" text="#c5221f">{active.stats.language}</Badge>}
                    </div>
                    <div style={{ color: "#5f6368", fontSize: 13 }}>{active.stats?.description || "No description provided"}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Badge color="#e6f4ea" text="#137333">🌿 {active.stats?.default_branch}</Badge>
                      <button onClick={() => handleDisconnect(activePlatform)} style={{ fontSize: 11, color: "#c5221f", background: "none", border: "1px solid #f5c6c4", borderRadius: 20, cursor: "pointer", padding: "2px 10px", fontWeight: 600 }}>Disconnect</button>
                      <button onClick={() => openModal(activePlatform)} style={{ fontSize: 11, color: "#1a73e8", background: "none", border: "1px solid #c5d9f1", borderRadius: 20, cursor: "pointer", padding: "2px 10px", fontWeight: 600 }}>Update Token</button>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 28 }}>
                    {[
                      { icon: "⭐", val: active.stats?.stars, label: "Stars" },
                      { icon: "🍴", val: active.stats?.forks, label: "Forks" },
                      { icon: "🐛", val: active.stats?.open_issues, label: "Issues" },
                    ].map(({ icon, val, label }) => (
                      <div key={label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#9aa0a6", marginBottom: 2 }}>{label}</div>
                        <div style={{ fontWeight: 700, fontSize: 20 }}>{icon} {val ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid: Commits + PRs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                  {/* Commits */}
                  <Card title="Recent Commits" icon="🕐">
                    {!active.commits?.length ? (
                      <div style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No commits found</div>
                    ) : active.commits.map((c, i) => (
                      <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < active.commits.length - 1 ? "1px solid #f1f3f4" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <code style={{ background: "#f1f3f4", padding: "1px 7px", borderRadius: 4, fontSize: 11, color: "#3c4043", fontFamily: "monospace" }}>{c.sha}</code>
                          <span style={{ fontSize: 11, color: "#9aa0a6" }}>{c.date}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#202124", lineHeight: 1.4 }}>{c.message}</div>
                        <div style={{ fontSize: 11, color: "#5f6368", marginTop: 2 }}>by {c.author}</div>
                      </div>
                    ))}
                  </Card>

                  {/* Pull Requests */}
                  <Card title="Open Pull Requests" icon="🔀">
                    {!active.pull_requests?.length ? (
                      <div style={{ color: "#9aa0a6", fontSize: 13, textAlign: "center", padding: "16px 0" }}>No open pull requests 🎉</div>
                    ) : active.pull_requests.map((pr, i) => (
                      <div key={i} style={{ paddingBottom: 12, marginBottom: 12, borderBottom: i < active.pull_requests.length - 1 ? "1px solid #f1f3f4" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <Badge color="#e6f4ea" text="#137333">#{pr.number}</Badge>
                          <span style={{ fontSize: 11, color: "#9aa0a6" }}>{pr.created_at}</span>
                        </div>
                        <a href={pr.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: "#1a73e8", textDecoration: "none", display: "block", lineHeight: 1.4 }}>
                          {pr.title}
                        </a>
                        <div style={{ fontSize: 11, color: "#5f6368", marginTop: 3 }}>by {pr.author}</div>
                      </div>
                    ))}
                  </Card>
                </div>

                {/* Branches */}
                <Card title="Branches" icon="🌿">
                  {!active.branches?.length ? (
                    <div style={{ color: "#9aa0a6", fontSize: 13 }}>No branches found</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {active.branches.map((b, i) => {
                        const isDefault = b === active.stats?.default_branch;
                        return (
                          <span key={i} style={{
                            background: isDefault ? activePlatformMeta?.color || "#1a73e8" : "#f1f3f4",
                            color: isDefault ? "white" : "#3c4043",
                            borderRadius: 6, padding: "5px 12px",
                            fontSize: 12, fontFamily: "monospace", fontWeight: isDefault ? 700 : 400,
                            border: isDefault ? "none" : "1px solid #e0e0e0",
                            display: "flex", alignItems: "center", gap: 4,
                          }}>
                            {isDefault && <span style={{ fontSize: 10 }}>★</span>}{b}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Repo URL footer */}
                <div style={{ background: "#f8f9fa", borderRadius: 10, padding: "12px 16px", border: "1px solid #e8eaed", display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#5f6368" }}>
                  <span>🔗</span>
                  <a href={selectedRepo[activePlatform]} target="_blank" rel="noreferrer" style={{ color: "#1a73e8", textDecoration: "none", fontWeight: 500 }}>
                    {selectedRepo[activePlatform]}
                  </a>
                  <span style={{ marginLeft: "auto" }}>Connected {new Date(integrations[activePlatform]?.connected_at).toLocaleDateString()}</span>
                </div>

              </div>
            )}
          </>
        )}
      </main>

      {/* ── Modal ── */}
      {modalPlatform && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ background: "white", borderRadius: 16, width: "100%", maxWidth: 500, margin: "0 16px", boxShadow: "0 16px 48px rgba(0,0,0,0.2)", overflow: "hidden" }}>

            {/* Modal header with platform color */}
            <div style={{ background: modalMeta?.color, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "white", fontWeight: 700, fontSize: 16 }}>
                <span style={{ fontSize: 24 }}>{modalMeta?.icon}</span>
                {integrations[modalPlatform] ? `Update ${modalMeta?.label}` : `Connect ${modalMeta?.label}`}
              </div>
              <button onClick={closeModal} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", color: "white", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontWeight: 600, fontSize: 13, marginBottom: 6, color: "#3c4043" }}>
                  {modalMeta?.tokenLabel} *
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste your access token here"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #dadce0", outline: "none", fontSize: 14, boxSizing: "border-box" }}
                />
                <div style={{ fontSize: 11, color: "#9aa0a6", marginTop: 6, padding: "6px 10px", background: "#f8f9fa", borderRadius: 6, border: "1px solid #e8eaed" }}>
                  📍 {modalMeta?.tokenHelp}
                </div>
              </div>
              {modalError && (
                <div style={{ color: "#c5221f", fontSize: 12, background: "#fce8e6", padding: "8px 12px", borderRadius: 6 }}>{modalError}</div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid #f1f3f4" }}>
              <button onClick={closeModal} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #dadce0", background: "white", cursor: "pointer", fontSize: 14 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: saving ? "#aaa" : modalMeta?.color, color: "white", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14 }}>
                {saving ? "Connecting..." : "Connect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}