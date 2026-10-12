"use client";

import type { Database } from "@nozbe/watermelondb";
import { Q } from "@nozbe/watermelondb";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Conversation,
  getConversationsByProjectOp,
  Message,
  type StorageOperationsContext,
  type StoredConversation,
  updateConversationProjectOp,
} from "../lib/db/chat";
import {
  createProjectOp,
  type CreateProjectOptions,
  deleteProjectOp,
  getProjectConversationCountOp,
  getProjectConversationsOp,
  getProjectOp,
  getProjectsOp,
  Project,
  type ProjectOperationsContext,
  projectToStored,
  type StoredProject,
  updateProjectNameOp,
  updateProjectOp,
  type UpdateProjectOptions,
} from "../lib/db/project";
import { getLogger } from "../lib/logger";

/**
 * Options for useProjects hook.
 */
export interface UseProjectsOptions {
  /** WatermelonDB database instance */
  database: Database;
  /** Initial project ID to select (optional) */
  initialProjectId?: string;
}

/**
 * Result returned by useProjects hook.
 */
export interface UseProjectsResult {
  /** List of all projects */
  projects: StoredProject[];
  /** Currently selected project ID */
  currentProjectId: string | null;
  /** Set the current project ID */
  setCurrentProjectId: (id: string | null) => void;
  /** Whether projects are being loaded */
  isLoading: boolean;
  /** Whether the projects system is ready (database table exists) */
  isReady: boolean;

  /** Create a new project */
  createProject: (opts?: CreateProjectOptions) => Promise<StoredProject>;
  /** Get a single project by ID */
  getProject: (projectId: string) => Promise<StoredProject | null>;
  /** Get all projects */
  getProjects: () => Promise<StoredProject[]>;
  /** Update a project's name */
  updateProjectName: (projectId: string, name: string) => Promise<boolean>;
  /** Update a project with partial options */
  updateProject: (projectId: string, opts: UpdateProjectOptions) => Promise<boolean>;
  /** Delete a project (soft delete) */
  deleteProject: (projectId: string) => Promise<boolean>;

  /** Get all conversations in a project */
  getProjectConversations: (projectId: string) => Promise<StoredConversation[]>;
  /** Get count of conversations in a project */
  getProjectConversationCount: (projectId: string) => Promise<number>;
  /** Move a conversation to a project (or remove with null) */
  updateConversationProject: (conversationId: string, projectId: string | null) => Promise<boolean>;
  /** Get conversations by project (null = no project) */
  getConversationsByProject: (projectId: string | null) => Promise<StoredConversation[]>;

  /** Refresh the projects list from database */
  refreshProjects: () => Promise<void>;
  /** The ID of the default Inbox project (auto-created) */
  inboxProjectId: string | null;
}

/**
 * A React hook for managing projects (conversation groups).
 *
 * Projects allow users to organize their conversations by topic, purpose,
 * or any other criteria. This hook provides CRUD operations for projects
 * and methods to manage conversation-project associations.
 *
 * @param options - Configuration options
 * @returns An object containing project state and methods
 *
 * @example
 * ```tsx
 * import { useProjects } from '@anuma/sdk/react';
 *
 * function ProjectsComponent({ database }) {
 *   const {
 *     projects,
 *     createProject,
 *     getProjectConversations,
 *     updateConversationProject,
 *   } = useProjects({ database });
 *
 *   const handleCreateProject = async () => {
 *     const project = await createProject({ name: 'My New Project' });
 *     console.log('Created project:', project.projectId);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreateProject}>New Project</button>
 *       {projects.map((p) => (
 *         <div key={p.projectId}>{p.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category Hooks
 */
export function useProjects(options: UseProjectsOptions): UseProjectsResult {
  const { database, initialProjectId } = options;

  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [inboxProjectId, setInboxProjectId] = useState<string | null>(null);
  const [projectsCollection, setProjectsCollection] = useState<ReturnType<
    typeof database.get<Project>
  > | null>(null);
  const [conversationsCollection, setConversationsCollection] = useState<ReturnType<
    typeof database.get<Conversation>
  > | null>(null);

  useEffect(() => {
    const initCollections = async () => {
      getLogger().debug("[useProjects] Initializing collections...");
      try {
        const projColl = database.get<Project>("projects");
        const convColl = database.get<Conversation>("conversations");

        getLogger().debug("[useProjects] Got collections:", {
          projects: projColl?.table,
          conversations: convColl?.table,
        });

        getLogger().debug("[useProjects] Running test query on projects table...");
        const testResult = await projColl.query(Q.take(1)).fetch();
        getLogger().debug(
          "[useProjects] Test query succeeded, found",
          testResult.length,
          "projects"
        );

        setProjectsCollection(projColl);
        setConversationsCollection(convColl);
        setIsReady(true);
        getLogger().debug("[useProjects] Collections initialized successfully, isReady=true");
      } catch (error) {
        getLogger().error("[useProjects] Failed to initialize collections:", error);
        getLogger().warn(
          "[useProjects] This usually means the database schema needs to be updated.",
          "Try clearing IndexedDB storage and reloading the page."
        );
        setIsReady(false);
      }
    };

    void initCollections();
  }, [database]);

  const projectCtx = useMemo<ProjectOperationsContext | null>(() => {
    if (!isReady || !projectsCollection || !conversationsCollection) {
      return null;
    }
    return {
      database,
      projectsCollection,
      conversationsCollection,
    };
  }, [database, projectsCollection, conversationsCollection, isReady]);

  const storageCtx = useMemo<StorageOperationsContext | null>(() => {
    if (!isReady || !conversationsCollection) {
      return null;
    }
    try {
      const messagesCollection = database.get<Message>("history");
      return {
        database,
        messagesCollection,
        conversationsCollection,
      };
    } catch {
      return null;
    }
  }, [database, conversationsCollection, isReady]);

  const refreshProjects = useCallback(async (): Promise<void> => {
    if (!projectCtx) {
      return;
    }
    setIsLoading(true);
    try {
      const storedProjects = await getProjectsOp(projectCtx);
      setProjects(storedProjects);
    } catch (error) {
      getLogger().error("Failed to refresh projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectCtx]);

  useEffect(() => {
    if (isReady) {
      void refreshProjects();
    }
  }, [isReady, refreshProjects]);

  useEffect(() => {
    const ensureInboxProject = async () => {
      if (!projectCtx || !isReady) return;

      try {
        const allProjects = await getProjectsOp(projectCtx);
        const existingInbox = allProjects.find((p) => p.name === "Inbox");

        if (existingInbox) {
          setInboxProjectId(existingInbox.projectId);
        } else {
          const inbox = await createProjectOp(projectCtx, { name: "Inbox" });
          setInboxProjectId(inbox.projectId);
        }
      } catch (error) {
        getLogger().error("[useProjects] Failed to ensure Inbox project:", error);
      }
    };

    void ensureInboxProject();
  }, [projectCtx, isReady]);

  useEffect(() => {
    if (!projectsCollection) {
      return;
    }
    const subscription = projectsCollection
      .query(Q.where("is_deleted", false))
      .observe()
      .subscribe((records) => {
        setProjects(records.map(projectToStored));
      });

    return () => subscription.unsubscribe();
  }, [projectsCollection]);

  const createProject = useCallback(
    async (opts?: CreateProjectOptions): Promise<StoredProject> => {
      if (!projectCtx) {
        throw new Error("Projects not available. Database schema may need to be updated.");
      }
      const project = await createProjectOp(projectCtx, opts);
      return project;
    },
    [projectCtx]
  );

  const getProject = useCallback(
    async (projectId: string): Promise<StoredProject | null> => {
      if (!projectCtx) {
        return null;
      }
      return getProjectOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  const getProjects = useCallback(async (): Promise<StoredProject[]> => {
    if (!projectCtx) {
      return [];
    }
    return getProjectsOp(projectCtx);
  }, [projectCtx]);

  const updateProjectName = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      if (!projectCtx) {
        return false;
      }
      return updateProjectNameOp(projectCtx, projectId, name);
    },
    [projectCtx]
  );

  const updateProject = useCallback(
    async (projectId: string, opts: UpdateProjectOptions): Promise<boolean> => {
      if (!projectCtx) {
        return false;
      }
      return updateProjectOp(projectCtx, projectId, opts);
    },
    [projectCtx]
  );

  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
      if (!projectCtx) {
        return false;
      }
      const result = await deleteProjectOp(projectCtx, projectId);
      if (result && currentProjectId === projectId) {
        setCurrentProjectId(null);
      }
      return result;
    },
    [projectCtx, currentProjectId]
  );

  const getProjectConversations = useCallback(
    async (projectId: string): Promise<StoredConversation[]> => {
      if (!projectCtx) {
        return [];
      }
      return getProjectConversationsOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  const getProjectConversationCount = useCallback(
    async (projectId: string): Promise<number> => {
      if (!projectCtx) {
        return 0;
      }
      return getProjectConversationCountOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  const updateConversationProject = useCallback(
    async (conversationId: string, projectId: string | null): Promise<boolean> => {
      if (!storageCtx) {
        return false;
      }
      return updateConversationProjectOp(storageCtx, conversationId, projectId);
    },
    [storageCtx]
  );

  const getConversationsByProject = useCallback(
    async (projectId: string | null): Promise<StoredConversation[]> => {
      if (!storageCtx) {
        return [];
      }
      return getConversationsByProjectOp(storageCtx, projectId);
    },
    [storageCtx]
  );

  return {
    projects,
    currentProjectId,
    setCurrentProjectId,
    isLoading,
    isReady,

    createProject,
    getProject,
    getProjects,
    updateProjectName,
    updateProject,
    deleteProject,

    getProjectConversations,
    getProjectConversationCount,
    updateConversationProject,
    getConversationsByProject,

    refreshProjects,
    inboxProjectId,
  };
}
