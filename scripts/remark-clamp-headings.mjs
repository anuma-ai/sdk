import { visit } from "unist-util-visit";

/**
 * Convert H4/H5/H6 headings into a paragraph containing bold text.
 * - H1/H2/H3 are preserved
 * - H4+ becomes: **Heading text**
 */
export default function h4ToBoldParagraph() {
  return (tree) => {
    visit(tree, "heading", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (typeof node.depth !== "number") return;

      if (node.depth >= 4) {
        parent.children[index] = {
          type: "paragraph",
          children: [
            {
              type: "strong",
              children: node.children, // preserve inline content (links, code, emphasis)
            },
          ],
        };
      }
    });
  };
}
