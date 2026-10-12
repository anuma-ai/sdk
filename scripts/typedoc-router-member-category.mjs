import { ReflectionKind, Comment } from "typedoc";
import { MemberRouter } from "typedoc-plugin-markdown";

function partsToText(parts) {
  return (parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
}

function getFirstTagText(comment, tagName) {
  if (!comment) return null;
  const tag = comment.getTag(tagName);
  return tag ? partsToText(tag.content) : null;
}

function getCategoryFromReflection(reflection) {
  let cat = getFirstTagText(reflection.comment, "@category");
  if (cat) return cat;

  const sigs = reflection.signatures ?? [];
  for (const sig of sigs) {
    cat = getFirstTagText(sig.comment, "@category");
    if (cat) return cat;
  }

  cat = getFirstTagText(reflection.indexSignature?.comment, "@category");
  if (cat) return cat;

  cat = getFirstTagText(reflection.getSignature?.comment, "@category");
  if (cat) return cat;

  cat = getFirstTagText(reflection.setSignature?.comment, "@category");
  if (cat) return cat;

  return null;
}

function slugDir(s) {
  return s
    .trim()
    .replace(/\\/g, "/")
    .replace(/\s+/g, "-")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((part) => part.replace(/^-+|-+$/g, ""))
    .join("/");
}

class MemberCategoryRouter extends MemberRouter {
  getReflectionDirectory(reflection) {
    if (!reflection || !reflection.kind) {
      console.warn("[MemberCategoryRouter] Invalid reflection passed to getReflectionDirectory");
      return "";
    }

    const category = getCategoryFromReflection(reflection);
    const kindDir = this.directories.get(reflection.kind);

    if (!kindDir) {
      console.warn(
        `[MemberCategoryRouter] No directory mapping for kind ${reflection.kind}: ${reflection.name}`
      );
      return "";
    }

    const dir = category ? slugDir(category) : `Internal/${kindDir}`;

    if (reflection.parent) {
      if (reflection.parent.kind === ReflectionKind.Namespace) {
        return `${this.getIdealBaseName(reflection.parent).replace(/\/[^/]+$/, "")}/${dir}`;
      }

      if (reflection.parent.kind === ReflectionKind.Module) {
        if (this.entryModule && reflection.parent.name === this.entryModule) {
          return `${this.getReflectionAlias(reflection.parent)}/${dir}`;
        }
        return `${this.getIdealBaseName(reflection.parent).replace(/\/[^/]+$/, "")}/${dir}`;
      }

      if (reflection.parent.kind === ReflectionKind.Project) {
        return `${dir}`;
      }

      return `${this.getReflectionAlias(reflection.parent)}/${dir}`;
    }

    return "";
  }
}

export function load(app) {
  app.renderer.defineRouter("member-category", MemberCategoryRouter);
}
