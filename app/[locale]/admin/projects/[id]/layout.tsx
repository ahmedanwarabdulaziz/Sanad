"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useParams } from "next/navigation";
import ProjectSidebar from "./components/ProjectSidebar";
import { CircularProgress } from "@mui/material";
import { createClient } from "@/lib/supabase/client";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  location: string;
  status: string;
  land_area: number;
}

interface ProjectContextValue {
  project: Project;
  projectId: string;
  refreshProject: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be inside ProjectLayout");
  return ctx;
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  // Auth check
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthenticated(true);
      } else {
        window.location.href = "/admin";
      }
    });
  }, []);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/erp-auth/projects/${projectId}`);
      const data = await res.json();
      if (data.project) setProject(data.project);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (authenticated) fetchProject();
  }, [authenticated, fetchProject]);

  if (!authenticated || loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <CircularProgress sx={{ color: "#3b82f6" }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          color: "#94a3b8",
          fontFamily: "var(--font-cairo)",
          fontSize: "18px",
        }}
      >
        المشروع غير موجود
      </div>
    );
  }

  return (
    <ProjectContext.Provider
      value={{ project, projectId, refreshProject: fetchProject }}
    >
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          direction: "rtl",
        }}
      >
        <ProjectSidebar projectId={projectId} projectName={project.name} projectSlug={project.slug} />
        <main
          className="proj-main"
          style={{
            flex: 1,
            padding: "clamp(16px, 3vw, 32px)",
            minHeight: "100vh",
            overflow: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </ProjectContext.Provider>
  );
}
