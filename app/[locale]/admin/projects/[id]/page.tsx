"use client";

import { redirect } from "next/navigation";
import { useProject } from "./layout";

export default function ProjectIndexPage() {
  const { projectId } = useProject();
  redirect(`/admin/projects/${projectId}/overview`);
}
