import { Q } from "@nozbe/watermelondb";
import type { Database, Collection } from "@nozbe/watermelondb";

import { Project } from "./models";
import { Conversation } from "../chat/models";
import {
  type StoredProject,
  type CreateProjectOptions,
  type UpdateProjectOptions,
  generateProjectId,
} from "./types";
import type { StoredConversation } from "../chat/types";
import { conversationToStored } from "../chat/operations";

export function projectToStored(project: Project): StoredProject {
  return {
    uniqueId: project.id,
    projectId: project.projectId,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    isDeleted: project.isDeleted,
  };
}

export interface ProjectOperationsContext {
  database: Database;
  projectsCollection: Collection<Project>;
  conversationsCollection: Collection<Conversation>;
}

/**
 * Create a new project.
 */
export async function createProjectOp(
  ctx: ProjectOperationsContext,
  opts?: CreateProjectOptions,
  defaultName: string = "New Project"
): Promise<StoredProject> {
  const projId = opts?.projectId || generateProjectId();
  const name = opts?.name || defaultName;

  const created = await ctx.database.write(async () => {
    return await ctx.projectsCollection.create((proj) => {
      proj._setRaw("project_id", projId);
      proj._setRaw("name", name);
      proj._setRaw("is_deleted", false);
    });
  });

  return projectToStored(created);
}

/**
 * Get a single project by its project ID.
 */
export async function getProjectOp(
  ctx: ProjectOperationsContext,
  id: string
): Promise<StoredProject | null> {
  const results = await ctx.projectsCollection
    .query(Q.where("project_id", id), Q.where("is_deleted", false))
    .fetch();

  return results.length > 0 ? projectToStored(results[0]) : null;
}

/**
 * Get all non-deleted projects, sorted by creation date (newest first).
 */
export async function getProjectsOp(
  ctx: ProjectOperationsContext
): Promise<StoredProject[]> {
  const results = await ctx.projectsCollection
    .query(Q.where("is_deleted", false), Q.sortBy("created_at", Q.desc))
    .fetch();

  return results.map(projectToStored);
}

/**
 * Update a project's name.
 */
export async function updateProjectNameOp(
  ctx: ProjectOperationsContext,
  id: string,
  name: string
): Promise<boolean> {
  const results = await ctx.projectsCollection
    .query(Q.where("project_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((proj) => {
        proj._setRaw("name", name);
      });
    });
    return true;
  }
  return false;
}

/**
 * Update a project with partial options.
 */
export async function updateProjectOp(
  ctx: ProjectOperationsContext,
  id: string,
  opts: UpdateProjectOptions
): Promise<boolean> {
  const results = await ctx.projectsCollection
    .query(Q.where("project_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((proj) => {
        if (opts.name !== undefined) proj._setRaw("name", opts.name);
      });
    });
    return true;
  }
  return false;
}

/**
 * Soft delete a project. Does not delete associated conversations.
 */
export async function deleteProjectOp(
  ctx: ProjectOperationsContext,
  id: string
): Promise<boolean> {
  const results = await ctx.projectsCollection
    .query(Q.where("project_id", id), Q.where("is_deleted", false))
    .fetch();

  if (results.length > 0) {
    await ctx.database.write(async () => {
      await results[0].update((proj) => {
        proj._setRaw("is_deleted", true);
      });
    });
    return true;
  }
  return false;
}

/**
 * Get all conversations belonging to a specific project.
 */
export async function getProjectConversationsOp(
  ctx: ProjectOperationsContext,
  projectId: string
): Promise<StoredConversation[]> {
  const results = await ctx.conversationsCollection
    .query(
      Q.where("project_id", projectId),
      Q.where("is_deleted", false),
      Q.sortBy("created_at", Q.desc)
    )
    .fetch();

  return results.map(conversationToStored);
}

/**
 * Count the number of conversations in a project.
 */
export async function getProjectConversationCountOp(
  ctx: ProjectOperationsContext,
  projectId: string
): Promise<number> {
  return await ctx.conversationsCollection
    .query(Q.where("project_id", projectId), Q.where("is_deleted", false))
    .fetchCount();
}
