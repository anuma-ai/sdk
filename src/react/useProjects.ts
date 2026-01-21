"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { Q } from "@nozbe/watermelondb";
import type { Database } from "@nozbe/watermelondb";

import {
  Project,
  type StoredProject,
  type CreateProjectOptions,
  type UpdateProjectOptions,
  type ProjectOperationsContext,
  projectToStored,
  createProjectOp,
  getProjectOp,
  getProjectsOp,
  updateProjectNameOp,
  updateProjectOp,
  deleteProjectOp,
  getProjectConversationsOp,
  getProjectConversationCountOp,
} from "../lib/db/project";
import {
  Conversation,
  Message,
  type StoredConversation,
  updateConversationProjectOp,
  getConversationsByProjectOp,
  type StorageOperationsContext,
} from "../lib/db/chat";

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
  // State
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

  // Project CRUD
  /** Create a new project */
  createProject: (opts?: CreateProjectOptions) => Promise<StoredProject>;
  /** Get a single project by ID */
  getProject: (projectId: string) => Promise<StoredProject | null>;
  /** Get all projects */
  getProjects: () => Promise<StoredProject[]>;
  /** Update a project's name */
  updateProjectName: (projectId: string, name: string) => Promise<boolean>;
  /** Update a project with partial options */
  updateProject: (
    projectId: string,
    opts: UpdateProjectOptions
  ) => Promise<boolean>;
  /** Delete a project (soft delete) */
  deleteProject: (projectId: string) => Promise<boolean>;

  // Conversation management
  /** Get all conversations in a project */
  getProjectConversations: (projectId: string) => Promise<StoredConversation[]>;
  /** Get count of conversations in a project */
  getProjectConversationCount: (projectId: string) => Promise<number>;
  /** Move a conversation to a project (or remove with null) */
  updateConversationProject: (
    conversationId: string,
    projectId: string | null
  ) => Promise<boolean>;
  /** Get conversations by project (null = no project) */
  getConversationsByProject: (
    projectId: string | null
  ) => Promise<StoredConversation[]>;

  // Utilities
  /** Refresh the projects list from database */
  refreshProjects: () => Promise<void>;
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
 * import { useProjects } from '@reverbia/sdk/react';
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

  // State
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(
    initialProjectId || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [projectsCollection, setProjectsCollection] = useState<ReturnType<typeof database.get<Project>> | null>(null);
  const [conversationsCollection, setConversationsCollection] = useState<ReturnType<typeof database.get<Conversation>> | null>(null);

  // Initialize collections asynchronously to handle database initialization race conditions
  useEffect(() => {
    const initCollections = async () => {
      console.log("[useProjects] Initializing collections...");
      try {
        // Get collections - these are synchronous but we wrap in async to handle any issues
        const projColl = database.get<Project>("projects");
        const convColl = database.get<Conversation>("conversations");

        console.log("[useProjects] Got collections:", {
          projects: projColl?.table,
          conversations: convColl?.table,
        });

        // Test query to ensure database is initialized and tables exist
        console.log("[useProjects] Running test query on projects table...");
        const testResult = await projColl.query(Q.take(1)).fetch();
        console.log("[useProjects] Test query succeeded, found", testResult.length, "projects");

        setProjectsCollection(projColl);
        setConversationsCollection(convColl);
        setIsReady(true);
        console.log("[useProjects] Collections initialized successfully, isReady=true");
      } catch (error) {
        console.error("[useProjects] Failed to initialize collections:", error);
        console.warn(
          "[useProjects] This usually means the database schema needs to be updated.",
          "Try clearing IndexedDB storage and reloading the page."
        );
        setIsReady(false);
      }
    };

    initCollections();
  }, [database]);

  // Project operations context - only valid when isReady is true
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

  // Storage operations context (for conversation operations) - only valid when isReady is true
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

  /**
   * Refresh projects from database
   */
  const refreshProjects = useCallback(async (): Promise<void> => {
    if (!projectCtx) {
      return;
    }
    setIsLoading(true);
    try {
      const storedProjects = await getProjectsOp(projectCtx);
      setProjects(storedProjects);
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, [projectCtx]);

  // Load projects on mount
  useEffect(() => {
    if (isReady) {
      refreshProjects();
    }
  }, [isReady, refreshProjects]);

  // Subscribe to project changes for real-time updates
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

  /**
   * Create a new project
   */
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

  /**
   * Get a single project by ID
   */
  const getProject = useCallback(
    async (projectId: string): Promise<StoredProject | null> => {
      if (!projectCtx) {
        return null;
      }
      return getProjectOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  /**
   * Get all projects
   */
  const getProjects = useCallback(async (): Promise<StoredProject[]> => {
    if (!projectCtx) {
      return [];
    }
    return getProjectsOp(projectCtx);
  }, [projectCtx]);

  /**
   * Update a project's name
   */
  const updateProjectName = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      if (!projectCtx) {
        return false;
      }
      return updateProjectNameOp(projectCtx, projectId, name);
    },
    [projectCtx]
  );

  /**
   * Update a project with partial options
   */
  const updateProject = useCallback(
    async (projectId: string, opts: UpdateProjectOptions): Promise<boolean> => {
      if (!projectCtx) {
        return false;
      }
      return updateProjectOp(projectCtx, projectId, opts);
    },
    [projectCtx]
  );

  /**
   * Delete a project (soft delete)
   */
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

  /**
   * Get all conversations in a project
   */
  const getProjectConversations = useCallback(
    async (projectId: string): Promise<StoredConversation[]> => {
      if (!projectCtx) {
        return [];
      }
      return getProjectConversationsOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  /**
   * Get count of conversations in a project
   */
  const getProjectConversationCount = useCallback(
    async (projectId: string): Promise<number> => {
      if (!projectCtx) {
        return 0;
      }
      return getProjectConversationCountOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  /**
   * Move a conversation to a project (or remove with null)
   */
  const updateConversationProject = useCallback(
    async (
      conversationId: string,
      projectId: string | null
    ): Promise<boolean> => {
      if (!storageCtx) {
        return false;
      }
      return updateConversationProjectOp(storageCtx, conversationId, projectId);
    },
    [storageCtx]
  );

  /**
   * Get conversations by project (null = no project)
   */
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
    // State
    projects,
    currentProjectId,
    setCurrentProjectId,
    isLoading,
    isReady,

    // Project CRUD
    createProject,
    getProject,
    getProjects,
    updateProjectName,
    updateProject,
    deleteProject,

    // Conversation management
    getProjectConversations,
    getProjectConversationCount,
    updateConversationProject,
    getConversationsByProject,

    // Utilities
    refreshProjects,
  };
}
