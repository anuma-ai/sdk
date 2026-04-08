/** Strip leading slash and collapse traversal segments so paths are always clean relative paths. */
export function normalizePath(p: string): string {
  return p
    .replace(/^\/+/, "")
    .replace(/\/\/+/g, "/")
    .split("/")
    .reduce<string[]>((acc, seg) => {
      if (seg === "..") acc.pop();
      else if (seg !== ".") acc.push(seg);
      return acc;
    }, [])
    .join("/");
}
