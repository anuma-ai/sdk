import { visit } from "unist-util-visit";

export default function remarkHeadingTransforms() {
  return (tree) => {
    visit(tree, "heading", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (typeof node.depth !== "number") return;

      if (node.depth === 1) {
        for (const child of node.children) {
          if (child.type === "text" && child.value.endsWith("()")) {
            child.value = child.value.slice(0, -2);
          }
        }
      }

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
