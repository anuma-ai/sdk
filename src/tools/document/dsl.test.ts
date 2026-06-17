import { describe, expect, it } from "vitest";
import { DocDslError, parseDocumentDsl } from "./dsl.js";

const MINIMAL = `
<Document>
  <Page size="A4" style={{ padding: 48, fontFamily: "Times-Roman", fontSize: 11 }}>
    <Text style={{ fontSize: 18, fontFamily: "Times-Bold", marginBottom: 12 }}>Service Agreement</Text>
    <View style={{ marginTop: 8 }}>
      <Text>This Agreement is entered into by the parties.</Text>
    </View>
  </Page>
</Document>`;

describe("parseDocumentDsl — valid documents", () => {
  it("parses a minimal document into a tree", () => {
    const root = parseDocumentDsl(MINIMAL);
    expect(root.tag).toBe("Document");
    expect(root.children).toHaveLength(1);
    const page = root.children[0];
    expect(typeof page === "object" && page.tag).toBe("Page");
  });

  it("accepts inline Text/Link nesting and data: images", () => {
    const src = `
      <Document>
        <Page>
          <Text>Hello <Text style={{ fontFamily: "Helvetica-Bold" }}>world</Text></Text>
          <Image src="data:image/png;base64,iVBORw0KGgo=" style={{ width: 80 }} />
          <Link src="https://example.com">terms</Link>
        </Page>
      </Document>`;
    expect(() => parseDocumentDsl(src)).not.toThrow();
  });

  it("accepts multiple Page elements", () => {
    const src = `<Document><Page><Text>one</Text></Page><Page><Text>two</Text></Page></Document>`;
    expect(parseDocumentDsl(src).children).toHaveLength(2);
  });
});

describe("parseDocumentDsl — structural rules", () => {
  it("rejects a non-Document root", () => {
    expect(() => parseDocumentDsl(`<Page><Text>x</Text></Page>`)).toThrow(
      /Root element must be <Document>/
    );
  });

  it("rejects non-Page children of Document", () => {
    expect(() => parseDocumentDsl(`<Document><View><Text>x</Text></View></Document>`)).toThrow(
      /<Document> may only contain <Page>/
    );
  });

  it("rejects raw text outside a text tag", () => {
    expect(() => parseDocumentDsl(`<Document><Page>bare text</Page></Document>`)).toThrow(
      /cannot contain raw text/
    );
  });

  it("rejects children on a self-closing leaf", () => {
    expect(() =>
      parseDocumentDsl(`<Document><Page><Image src="data:,">x</Image></Page></Document>`)
    ).toThrow(/must be self-closing/);
  });

  it("rejects an SVG primitive outside <Svg>", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><View><Rect width={10} height={10} /></View></Page></Document>`
      )
    ).toThrow(/<Rect> is an SVG element and may only appear inside an <Svg>/);
  });

  it("rejects an SVG primitive nested in <Text>", () => {
    expect(() =>
      parseDocumentDsl(`<Document><Page><Text><Circle r={3} /></Text></Page></Document>`)
    ).toThrow(/may only appear inside an <Svg>/);
  });

  it("accepts SVG primitives inside <Svg>", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Svg><Rect width={10} height={10} /></Svg></Page></Document>`
      )
    ).not.toThrow();
  });
});

describe("parseDocumentDsl — security / literal-only", () => {
  it("rejects unknown tags", () => {
    expect(() => parseDocumentDsl(`<Document><Page><script/></Page></Document>`)).toThrow(
      /Unknown tag <script>/
    );
  });

  it("rejects event handlers", () => {
    expect(() =>
      parseDocumentDsl(`<Document><Page><Text onClick="x">y</Text></Page></Document>`)
    ).toThrow(/Event-handler attribute/);
  });

  it("rejects spread attributes", () => {
    expect(() =>
      parseDocumentDsl(`<Document><Page {...props}><Text>y</Text></Page></Document>`)
    ).toThrow(/Spread attributes/);
  });

  it("rejects dynamic expression attribute values", () => {
    expect(() =>
      parseDocumentDsl(`<Document><Page><Text>{someVar}</Text></Page></Document>`)
    ).toThrow(/Only literal text\/number children/);
  });

  it("rejects a remote (non-data) Image src", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Image src="https://evil.example/logo.png" /></Page></Document>`
      )
    ).toThrow(/must be an inline "data:" URI/);
  });

  it("rejects a remote Image source even when a benign data: src is also present", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Image src="data:image/png;base64,AA==" source="https://evil.example/logo.png" /></Page></Document>`
      )
    ).toThrow(/source must be an inline "data:" URI/);
  });

  it("rejects an Image source={{ uri }} object", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Image source={{ uri: "https://evil.example/logo.png" }} /></Page></Document>`
      )
    ).toThrow(/source must be an inline "data:" URI/);
  });

  it("rejects a javascript: Link href", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Text><Link src="javascript:alert(1)">x</Link></Text></Page></Document>`
      )
    ).toThrow(/unsafe URL scheme/);
  });

  it("rejects a whitespace-obfuscated javascript: Link href", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Text><Link src="   javascript:alert(1)">x</Link></Text></Page></Document>`
      )
    ).toThrow(/unsafe URL scheme/);
  });

  it("rejects a control-char-obfuscated javascript: Link href", () => {
    // An embedded TAB splits the scheme name; PDF viewers strip it and execute.
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Text><Link src="java\tscript:alert(1)">x</Link></Text></Page></Document>`
      )
    ).toThrow(/unsafe URL scheme/);
  });

  it("rejects an uppercase JAVASCRIPT: Link href", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Text><Link src="JAVASCRIPT:alert(1)">x</Link></Text></Page></Document>`
      )
    ).toThrow(/unsafe URL scheme/);
  });

  it("allows http(s), mailto, tel, anchor, and relative Link hrefs", () => {
    for (const href of [
      "https://example.com",
      "http://example.com",
      "mailto:a@b.com",
      "tel:+15551234",
      "#section",
      "/terms",
    ]) {
      expect(() =>
        parseDocumentDsl(
          `<Document><Page><Text><Link src="${href}">x</Link></Text></Page></Document>`
        )
      ).not.toThrow();
    }
  });
});

describe("parseDocumentDsl — style + font validation", () => {
  it("suggests the camelCase key on a typo", () => {
    let err: unknown;
    try {
      parseDocumentDsl(`<Document><Page><Text style={{ fontsize: 12 }}>y</Text></Page></Document>`);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DocDslError);
    expect((err as Error).message).toMatch(/Did you mean "fontSize"/);
  });

  it("rejects unsupported style keys (grid/box-shadow)", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><View style={{ boxShadow: "0 0 4px" }}><Text>y</Text></View></Page></Document>`
      )
    ).toThrow(/Unknown react-pdf style key/);
  });

  it("rejects a non-standard fontFamily", () => {
    expect(() =>
      parseDocumentDsl(
        `<Document><Page><Text style={{ fontFamily: "Comic Sans" }}>y</Text></Page></Document>`
      )
    ).toThrow(/not a built-in PDF font/);
  });

  it("reports line:col on invalid JSX", () => {
    let err: unknown;
    try {
      parseDocumentDsl(`<Document><Page><Text>unclosed</Page></Document>`);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(DocDslError);
  });
});
