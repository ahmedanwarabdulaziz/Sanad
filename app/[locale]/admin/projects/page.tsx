"use client";

import { useState, useEffect, useCallback } from "react";
import AdminAuthenticatedLayout from "../components/AdminAuthenticatedLayout";
import { useRouter } from "next/navigation";
import { CircularProgress, Chip, Button } from "@mui/material";
import { AddOutlined, LocationOnOutlined } from "@mui/icons-material";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  status: string;
  project_stages: { count: number }[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PLANNING: { label: "تخطيط", color: "#f59e0b" },
  ACTIVE: { label: "نشط", color: "#10b981" },
  COMPLETED: { label: "مكتمل", color: "#6366f1" },
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/erp-auth/projects");
      const data = await res.json();
      if (data.projects) setProjects(data.projects);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <AdminAuthenticatedLayout>
      <div>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 28px)",
                fontWeight: 700,
                color: "#f1f5f9",
                margin: "0 0 4px 0",
                fontFamily: "var(--font-cairo)",
              }}
            >
              المشاريع
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#64748b",
                margin: 0,
                fontFamily: "var(--font-cairo)",
              }}
            >
              إدارة وتتبع جميع المشاريع
            </p>
          </div>
          <Button
            variant="contained"
            startIcon={<AddOutlined />}
            onClick={() => router.push("/admin/projects/new")}
            sx={{
              borderRadius: "12px",
              px: 3,
              py: 1.2,
              fontFamily: "var(--font-cairo)",
              fontWeight: 600,
              fontSize: "14px",
              textTransform: "none",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              },
            }}
          >
            مشروع جديد
          </Button>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <CircularProgress sx={{ color: "#3b82f6" }} />
          </div>
        ) : projects.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "80px 24px",
              borderRadius: "20px",
              background: "rgba(30, 41, 59, 0.4)",
              border: "1px solid rgba(148, 163, 184, 0.08)",
            }}
          >
            <p style={{ fontSize: "48px", margin: "0 0 16px" }}>🏗️</p>
            <p
              style={{
                fontSize: "18px",
                color: "#94a3b8",
                fontFamily: "var(--font-cairo)",
              }}
            >
              لا توجد مشاريع بعد
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {projects.map((project) => {
              const stageCount = project.project_stages?.[0]?.count || 0;
              const status = STATUS_MAP[project.status] || STATUS_MAP.PLANNING;
              return (
                <div
                  key={project.id}
                  onClick={() => router.push(`/admin/projects/${project.id}`)}
                  style={{
                    padding: "24px",
                    borderRadius: "20px",
                    background: "rgba(30, 41, 59, 0.6)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(148, 163, 184, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "rgba(59, 130, 246, 0.3)";
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      "rgba(148, 163, 184, 0.08)";
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(0)";
                  }}
                >
                  {/* Project header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#f1f5f9",
                          margin: "0 0 6px",
                          fontFamily: "var(--font-cairo)",
                        }}
                      >
                        {project.name}
                      </h3>
                      {project.location && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <LocationOnOutlined
                            sx={{ fontSize: 14, color: "#64748b" }}
                          />
                          <span
                            style={{
                              fontSize: "13px",
                              color: "#64748b",
                              fontFamily: "var(--font-cairo)",
                            }}
                          >
                            {project.location}
                          </span>
                        </div>
                      )}
                    </div>
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{
                        backgroundColor: `${status.color}22`,
                        color: status.color,
                        border: `1px solid ${status.color}33`,
                        fontFamily: "var(--font-cairo)",
                        fontSize: "12px",
                        fontWeight: 600,
                        height: "26px",
                      }}
                    />
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p
                      style={{
                        fontSize: "13px",
                        color: "#94a3b8",
                        margin: "0 0 16px",
                        fontFamily: "var(--font-cairo)",
                        lineHeight: 1.6,
                      }}
                    >
                      {project.description}
                    </p>
                  )}

                  {/* Footer stats */}
                  <div
                    style={{
                      display: "flex",
                      gap: "24px",
                      paddingTop: "16px",
                      borderTop: "1px solid rgba(148, 163, 184, 0.06)",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#64748b",
                          margin: "0 0 2px",
                          fontFamily: "var(--font-cairo)",
                        }}
                      >
                        المراحل
                      </p>
                      <p
                        style={{
                          fontSize: "20px",
                          fontWeight: 700,
                          color: "#3b82f6",
                          margin: 0,
                        }}
                      >
                        {stageCount}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminAuthenticatedLayout>
  );
}
