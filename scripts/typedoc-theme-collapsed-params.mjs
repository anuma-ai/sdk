// scripts/typedoc-theme-collapsed-params.mjs
// Custom theme that collapses parent parameter types when they have expanded children

import { MarkdownTheme, MarkdownThemeContext } from "typedoc-plugin-markdown";

class CollapsedParamsTheme extends MarkdownTheme {
  getRenderContext(page) {
    return new CollapsedParamsThemeContext(this, page, this.application.options);
  }
}

class CollapsedParamsThemeContext extends MarkdownThemeContext {
  constructor(theme, page, options) {
    super(theme, page, options);

    // Collect types that should be collapsed (parent params with expandable children)
    const typesToCollapse = new WeakSet();

    const originalParametersTable = this.partials.parametersTable.bind(this);
    const originalReflectionType = this.partials.reflectionType.bind(this);

    // Override reflectionType to return "object" for types we've marked
    this.partials.reflectionType = (model, opts) => {
      if (model && typesToCollapse.has(model)) {
        return "`object`";
      }
      return originalReflectionType(model, opts);
    };

    this.partials.parametersTable = (model) => {
      // Mark types that have children for collapse
      for (const param of model) {
        if (param.type?.type === "reflection" && param.type.declaration?.children?.length > 0) {
          typesToCollapse.add(param.type);
        }
      }

      return originalParametersTable(model);
    };
  }
}

export function load(app) {
  app.renderer.defineTheme("collapsed-params", CollapsedParamsTheme);
}
