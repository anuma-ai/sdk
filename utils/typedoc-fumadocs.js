/**
 * Custom TypeDoc plugin to add title frontmatter to each documentation page
 * and generate meta.json file
 */
const { MarkdownPageEvent } = require("typedoc-plugin-markdown");
const { RendererEvent } = require("typedoc");
const fs = require("fs");
const path = require("path");

/**
 * @param {import('typedoc').Application} app
 */
function load(app) {
  app.renderer.on(
    MarkdownPageEvent.BEGIN,
    /**
     * @param {import('typedoc-plugin-markdown').MarkdownPageEvent} page
     */
    (page) => {
      // Set the title in the frontmatter to the name of the reflection
      if (page.model?.name) {
        page.frontmatter = {
          title: page.model.name,
          ...page.frontmatter,
        };
      }
    }
  );

  app.renderer.on(
    RendererEvent.END,
    /**
     * @param {import('typedoc').RendererEvent} event
     */
    (event) => {
      // Generate meta.json file in the docs directory
      const outputDir = event.outputDirectory;
      const metaJsonPath = path.join(outputDir, "meta.json");
      const metaJson = {
        title: "Client",
        description: "Client documentation",
        root: true,
      };

      fs.writeFileSync(metaJsonPath, JSON.stringify(metaJson, null, 2), "utf8");
    }
  );
}

module.exports = { load };
