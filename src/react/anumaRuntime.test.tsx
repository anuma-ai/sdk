// @vitest-environment happy-dom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Anuma, AnumaThemeProvider, renderAnumaJsx, resolveThemeColor } from "./anumaRuntime";

describe("AnumaThemeProvider + resolveThemeColor", () => {
  it("resolves theme tokens", () => {
    const theme = {
      fontPreset: "default",
      colors: { accent: "#10b981", textPrimary: "#fff" } as Record<string, string>,
    };
    expect(resolveThemeColor("accent", theme)).toBe("#10b981");
    expect(resolveThemeColor("textPrimary", theme)).toBe("#fff");
  });

  it("passes hex/rgb through unchanged", () => {
    const theme = { fontPreset: "default", colors: {} };
    expect(resolveThemeColor("#abcdef", theme)).toBe("#abcdef");
    expect(resolveThemeColor("rgb(0,0,0)", theme)).toBe("rgb(0,0,0)");
  });

  it("returns the raw value when token missing", () => {
    const theme = { fontPreset: "default", colors: {} };
    expect(resolveThemeColor("textPrimary", theme)).toBe("textPrimary");
  });
});

describe("Anuma primitives render", () => {
  it("Slide renders 960x540 with theme background", () => {
    const { container } = render(
      <AnumaThemeProvider colors={{ slideBg: "#abcdef" }}>
        <Anuma.Slide id="s1" />
      </AnumaThemeProvider>
    );
    const slide = container.querySelector('[data-anuma-tag="Slide"]') as HTMLElement;
    expect(slide).not.toBeNull();
    expect(slide.style.width).toBe("960px");
    expect(slide.style.height).toBe("540px");
    expect(slide.style.background).toBe("#abcdef");
  });

  it("Rect uses fill from theme tokens", () => {
    const { container } = render(
      <AnumaThemeProvider colors={{ accent: "#10b981" }}>
        <Anuma.Slide id="s">
          <Anuma.Rect id="r" x={0} y={0} w={100} h={50} fill="accent" />
        </Anuma.Slide>
      </AnumaThemeProvider>
    );
    const rect = container.querySelector('[data-anuma-tag="Rect"]') as HTMLElement;
    expect(rect.style.background).toBe("#10b981");
    expect(rect.style.left).toBe("0px");
    expect(rect.style.top).toBe("0px");
  });

  it("Group with layout=row uses CSS flex", () => {
    const { container } = render(
      <AnumaThemeProvider>
        <Anuma.Slide id="s">
          <Anuma.Group id="row" layout="row" gap={16} padding={24}>
            <Anuma.Rect id="a" w={50} h={50} fill="#fff" />
            <Anuma.Rect id="b" w={50} h={50} fill="#000" />
          </Anuma.Group>
        </Anuma.Slide>
      </AnumaThemeProvider>
    );
    const group = container.querySelector('[data-anuma-tag="Group"]') as HTMLElement;
    expect(group.style.display).toBe("flex");
    expect(group.style.flexDirection).toBe("row");
    expect(group.style.gap).toBe("16px");
    expect(group.style.padding).toBe("24px");
  });
});

describe("renderAnumaJsx", () => {
  it("parses JSX and renders the tree", () => {
    const jsx = `
      <Anuma.Deck fontPreset="default" textPrimary="#fff" slideBg="#111" accent="#10b981" background="#000" surfaceSecondary="#222" textSecondary="#eee" textMuted="#999" card="#181818" border="#333">
        <Anuma.Slide id="cover">
          <h1 x={58} y={120} w={844} style={{ fontSize: 60, color: "textPrimary" }}>Hello</h1>
          <Anuma.Rect id="bar" x={58} y={400} w={400} h={4} fill="accent" />
        </Anuma.Slide>
      </Anuma.Deck>
    `;
    const { container } = render(<>{renderAnumaJsx(jsx)}</>);
    const h1 = container.querySelector("h1");
    expect(h1).not.toBeNull();
    expect(h1!.textContent).toBe("Hello");
    expect(h1!.style.fontSize).toBe("60px");
    expect(h1!.style.color).toBe("#fff");
    const rect = container.querySelector('[data-anuma-tag="Rect"]') as HTMLElement;
    expect(rect.style.background).toBe("#10b981");
    expect(rect.style.left).toBe("58px");
  });

  it("handles HTML inside a flex Group with grow + alignSelf", () => {
    const jsx = `
      <Anuma.Slide id="s">
        <Anuma.Group layout="row" gap={8}>
          <div grow={1} style={{ background: "#abc" }} />
          <div w={50} style={{ background: "#def" }} />
        </Anuma.Group>
      </Anuma.Slide>
    `;
    const { container } = render(<AnumaThemeProvider>{renderAnumaJsx(jsx)}</AnumaThemeProvider>);
    const divs = container.querySelectorAll<HTMLDivElement>("div[data-anuma-tag='div']");
    expect(divs.length).toBe(2);
    expect(divs[0]!.style.flexGrow).toBe("1");
    expect(divs[1]!.style.width).toBe("50px");
  });
});
