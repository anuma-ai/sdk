import { visit } from "unist-util-visit";

/**
 * Remark plugin that:
 * 1. Converts H4/H5/H6 headings into bold paragraphs
 * 2. Strips trailing () from H1 headings (function titles)
 */
export default function remarkHeadingTransforms() {
  return (tree) => {
    visit(tree, "heading", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (typeof node.depth !== "number") return;

      // Strip trailing () from H1 headings (function names)
      if (node.depth === 1) {
        for (const child of node.children) {
          if (child.type === "text" && child.value.endsWith("()")) {
            child.value = child.value.slice(0, -2);
          }
        }
      }

      // Convert H4+ to bold paragraphs
      if (node.depth >= 4) {
        parent.children[index] = {
          type: "paragraph",
          children: [
            {
              type: "strong",
              children: node.children,
            },
          ],
        };
      }
    });
  };
}
