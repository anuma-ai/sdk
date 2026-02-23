// scripts/typedoc-router-member-category.mjs
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
  const tag = comment.getTag(tagName); // expects "@category" form
  return tag ? partsToText(tag.content) : null;
}

function getCategoryFromReflection(reflection) {
  // 1) Direct comment on reflection
  let cat = getFirstTagText(reflection.comment, "@category");
  if (cat) return cat;

  // 2) Common case: functions store docs on the first signature
  const sigs = reflection.signatures ?? [];
  for (const sig of sigs) {
    cat = getFirstTagText(sig.comment, "@category");
    if (cat) return cat;
  }

  // 3) Other signature-like locations (covers some type shapes)
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
    .replace(/\\/g, "/") // normalize backslashes to forward slashes
    .replace(/\s+/g, "-") // spaces to dashes
    .replace(/^\/+|\/+$/g, "") // trim leading/trailing slashes
    .split("/")
    .map((part) => part.replace(/^-+|-+$/g, "")) // trim dashes from each part
    .join("/");
}

class MemberCategoryRouter extends MemberRouter {
  getReflectionDirectory(reflection) {
    // Safety check: ensure we have a valid reflection
    if (!reflection || !reflection.kind) {
      console.warn("[MemberCategoryRouter] Invalid reflection passed to getReflectionDirectory");
      return "";
    }

    const category = getCategoryFromReflection(reflection);
    const kindDir = this.directories.get(reflection.kind);

    // If no kindDir mapping exists, skip this reflection
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
