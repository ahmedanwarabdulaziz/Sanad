"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  Tabs,
  Tab,
  Alert,
} from "@mui/material";
import {
  WidgetsOutlined,
  FolderOutlined,
} from "@mui/icons-material";

interface Module {
  id: string;
  name: string;
  slug: string;
  icon: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
}

interface AccessItem {
  id: string;
  role: string;
  module?: Module;
  project?: Project;
  module_id?: string;
  project_id?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onSaved: () => void;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "مدير" },
  { value: "editor", label: "محرر" },
  { value: "viewer", label: "مشاهد" },
];

const dropdownSx = {
  background: "#1e293b",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: "12px",
  "& .MuiMenuItem-root": {
    fontFamily: "var(--font-cairo)",
    color: "#e2e8f0",
    fontSize: "13px",
    "&:hover": { background: "rgba(59,130,246,0.1)" },
    "&.Mui-selected": { background: "rgba(59,130,246,0.15)" },
  },
};

export default function UserAccessDialog({
  open,
  onClose,
  userId,
  userName,
  onSaved,
}: Props) {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All available modules and projects
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);

  // User's current access: map of id → role
  const [moduleAccess, setModuleAccess] = useState<
    Record<string, string>
  >({});
  const [projectAccess, setProjectAccess] = useState<
    Record<string, string>
  >({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [modulesRes, projectsRes, accessRes] = await Promise.all([
        fetch("/api/erp-auth/modules"),
        fetch("/api/erp-auth/projects"),
        fetch(`/api/erp-auth/users/${userId}/access`),
      ]);

      const modulesData = await modulesRes.json();
      const projectsData = await projectsRes.json();
      const accessData = await accessRes.json();

      setAllModules(modulesData.modules || []);
      setAllProjects(projectsData.projects || []);

      // Build access maps
      const modAccess: Record<string, string> = {};
      (accessData.modules || []).forEach((a: AccessItem) => {
        if (a.module_id) modAccess[a.module_id] = a.role;
      });
      setModuleAccess(modAccess);

      const projAccess: Record<string, string> = {};
      (accessData.projects || []).forEach((a: AccessItem) => {
        if (a.project_id) projAccess[a.project_id] = a.role;
      });
      setProjectAccess(projAccess);
    } catch {
      setError("فشل في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) fetchData();
  }, [open, userId, fetchData]);

  const toggleModule = (moduleId: string) => {
    setModuleAccess((prev) => {
      const next = { ...prev };
      if (next[moduleId]) {
        delete next[moduleId];
      } else {
        next[moduleId] = "viewer";
      }
      return next;
    });
  };

  const toggleProject = (projectId: string) => {
    setProjectAccess((prev) => {
      const next = { ...prev };
      if (next[projectId]) {
        delete next[projectId];
      } else {
        next[projectId] = "viewer";
      }
      return next;
    });
  };

  const setModuleRole = (moduleId: string, role: string) => {
    setModuleAccess((prev) => ({ ...prev, [moduleId]: role }));
  };

  const setProjectRole = (projectId: string, role: string) => {
    setProjectAccess((prev) => ({ ...prev, [projectId]: role }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const modules = Object.entries(moduleAccess).map(
        ([module_id, role]) => ({ module_id, role })
      );
      const projects = Object.entries(projectAccess).map(
        ([project_id, role]) => ({ project_id, role })
      );

      const res = await fetch(`/api/erp-auth/users/${userId}/access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules, projects }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("فشل في حفظ الصلاحيات");
    } finally {
      setSaving(false);
    }
  };

  const dialogSx = {
    "& .MuiDialog-paper": {
      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
      border: "1px solid rgba(148, 163, 184, 0.12)",
      borderRadius: "20px",
      color: "#e2e8f0",
      direction: "rtl" as const,
      minWidth: "min(500px, 92vw)",
      maxHeight: "80vh",
    },
  };

  return (
    <Dialog open={open} onClose={onClose} sx={dialogSx}>
      <DialogTitle
        sx={{
          fontFamily: "var(--font-cairo)",
          fontWeight: 700,
          fontSize: "20px",
          pb: 0,
        }}
      >
        صلاحيات {userName}
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          px: 3,
          "& .MuiTab-root": {
            fontFamily: "var(--font-cairo)",
            color: "#64748b",
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 600,
            minHeight: "48px",
            "&.Mui-selected": { color: "#60a5fa" },
          },
          "& .MuiTabs-indicator": {
            backgroundColor: "#3b82f6",
            borderRadius: "2px",
          },
        }}
      >
        <Tab
          icon={<WidgetsOutlined sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label="الوحدات"
        />
        <Tab
          icon={<FolderOutlined sx={{ fontSize: 18 }} />}
          iconPosition="start"
          label="المشاريع"
        />
      </Tabs>

      <DialogContent sx={{ pt: 2, minHeight: "250px" }}>
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{
              mb: 2,
              borderRadius: "12px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              color: "#fca5a5",
              "& .MuiAlert-icon": { color: "#f87171" },
              fontFamily: "var(--font-cairo)",
            }}
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <CircularProgress sx={{ color: "#3b82f6" }} size={32} />
          </div>
        ) : tab === 0 ? (
          /* ── Modules Tab ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allModules.length === 0 ? (
              <p style={{ color: "#64748b", textAlign: "center", fontFamily: "var(--font-cairo)" }}>
                لا توجد وحدات
              </p>
            ) : (
              allModules.map((mod) => {
                const hasAccess = !!moduleAccess[mod.id];
                return (
                  <div
                    key={mod.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: hasAccess
                        ? "rgba(59, 130, 246, 0.08)"
                        : "rgba(30, 41, 59, 0.4)",
                      border: `1px solid ${hasAccess ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.06)"}`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Checkbox
                      checked={hasAccess}
                      onChange={() => toggleModule(mod.id)}
                      sx={{
                        color: "#475569",
                        "&.Mui-checked": { color: "#3b82f6" },
                        p: 0,
                      }}
                    />
                    <span
                      style={{
                        flex: 1,
                        fontFamily: "var(--font-cairo)",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: hasAccess ? "#e2e8f0" : "#94a3b8",
                      }}
                    >
                      {mod.name}
                    </span>
                    {hasAccess && (
                      <FormControl size="small">
                        <Select
                          value={moduleAccess[mod.id]}
                          onChange={(e) =>
                            setModuleRole(mod.id, e.target.value)
                          }
                          sx={{
                            color: "#e2e8f0",
                            fontSize: "13px",
                            fontFamily: "var(--font-cairo)",
                            borderRadius: "8px",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: "rgba(148,163,184,0.15)",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "rgba(59,130,246,0.3)",
                            },
                            "& .MuiSelect-icon": { color: "#64748b" },
                            minWidth: "90px",
                          }}
                          MenuProps={{ PaperProps: { sx: dropdownSx } }}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <MenuItem key={r.value} value={r.value}>
                              {r.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── Projects Tab ── */
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {allProjects.length === 0 ? (
              <p style={{ color: "#64748b", textAlign: "center", fontFamily: "var(--font-cairo)" }}>
                لا توجد مشاريع بعد
              </p>
            ) : (
              allProjects.map((proj) => {
                const hasAccess = !!projectAccess[proj.id];
                return (
                  <div
                    key={proj.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      borderRadius: "12px",
                      background: hasAccess
                        ? "rgba(139, 92, 246, 0.08)"
                        : "rgba(30, 41, 59, 0.4)",
                      border: `1px solid ${hasAccess ? "rgba(139, 92, 246, 0.2)" : "rgba(148, 163, 184, 0.06)"}`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Checkbox
                      checked={hasAccess}
                      onChange={() => toggleProject(proj.id)}
                      sx={{
                        color: "#475569",
                        "&.Mui-checked": { color: "#8b5cf6" },
                        p: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-cairo)",
                          fontSize: "14px",
                          fontWeight: 500,
                          color: hasAccess ? "#e2e8f0" : "#94a3b8",
                        }}
                      >
                        {proj.name}
                      </span>
                      {proj.description && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#475569",
                            margin: "2px 0 0",
                            fontFamily: "var(--font-cairo)",
                          }}
                        >
                          {proj.description}
                        </p>
                      )}
                    </div>
                    {hasAccess && (
                      <FormControl size="small">
                        <Select
                          value={projectAccess[proj.id]}
                          onChange={(e) =>
                            setProjectRole(proj.id, e.target.value)
                          }
                          sx={{
                            color: "#e2e8f0",
                            fontSize: "13px",
                            fontFamily: "var(--font-cairo)",
                            borderRadius: "8px",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: "rgba(148,163,184,0.15)",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "rgba(139,92,246,0.3)",
                            },
                            "& .MuiSelect-icon": { color: "#64748b" },
                            minWidth: "90px",
                          }}
                          MenuProps={{ PaperProps: { sx: dropdownSx } }}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <MenuItem key={r.value} value={r.value}>
                              {r.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            color: "#94a3b8",
            fontFamily: "var(--font-cairo)",
            textTransform: "none",
          }}
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          variant="contained"
          sx={{
            borderRadius: "10px",
            fontFamily: "var(--font-cairo)",
            fontWeight: 600,
            textTransform: "none",
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            },
            "&.Mui-disabled": {
              background: "rgba(59, 130, 246, 0.3)",
              color: "rgba(255,255,255,0.4)",
            },
          }}
        >
          {saving ? (
            <CircularProgress size={20} sx={{ color: "#fff" }} />
          ) : (
            "حفظ الصلاحيات"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
