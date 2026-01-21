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

  // Get collections
  const projectsCollection = useMemo(
    () => database.get<Project>("projects"),
    [database]
  );

  const conversationsCollection = useMemo(
    () => database.get<Conversation>("conversations"),
    [database]
  );

  // Project operations context
  const projectCtx = useMemo<ProjectOperationsContext>(
    () => ({
      database,
      projectsCollection,
      conversationsCollection,
    }),
    [database, projectsCollection, conversationsCollection]
  );

  // Storage operations context (for conversation operations)
  const storageCtx = useMemo<StorageOperationsContext>(
    () => ({
      database,
      messagesCollection: database.get("history"),
      conversationsCollection,
    }),
    [database, conversationsCollection]
  );

  /**
   * Refresh projects from database
   */
  const refreshProjects = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const storedProjects = await getProjectsOp(projectCtx);
      setProjects(storedProjects);
    } finally {
      setIsLoading(false);
    }
  }, [projectCtx]);

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  // Subscribe to project changes for real-time updates
  useEffect(() => {
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
      return getProjectOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  /**
   * Get all projects
   */
  const getProjects = useCallback(async (): Promise<StoredProject[]> => {
    return getProjectsOp(projectCtx);
  }, [projectCtx]);

  /**
   * Update a project's name
   */
  const updateProjectName = useCallback(
    async (projectId: string, name: string): Promise<boolean> => {
      return updateProjectNameOp(projectCtx, projectId, name);
    },
    [projectCtx]
  );

  /**
   * Update a project with partial options
   */
  const updateProject = useCallback(
    async (projectId: string, opts: UpdateProjectOptions): Promise<boolean> => {
      return updateProjectOp(projectCtx, projectId, opts);
    },
    [projectCtx]
  );

  /**
   * Delete a project (soft delete)
   */
  const deleteProject = useCallback(
    async (projectId: string): Promise<boolean> => {
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
      return getProjectConversationsOp(projectCtx, projectId);
    },
    [projectCtx]
  );

  /**
   * Get count of conversations in a project
   */
  const getProjectConversationCount = useCallback(
    async (projectId: string): Promise<number> => {
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
      return updateConversationProjectOp(storageCtx, conversationId, projectId);
    },
    [storageCtx]
  );

  /**
   * Get conversations by project (null = no project)
   */
  const getConversationsByProject = useCallback(
    async (projectId: string | null): Promise<StoredConversation[]> => {
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
