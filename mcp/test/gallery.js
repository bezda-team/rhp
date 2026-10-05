// The site's gallery examples, mounted as the site mounts them (src/gallery/ui/Playground.jsx): in the playground's
// preview, inside the docs' light theme (and v1's colors for the v1 replicas), with the poster fonts, Starlight's
// colors and the gallery's stylesheet, in a splash page's column. Fixed props: the CSS version and seed 0.
// The examples are read from the documentation checkout and never changed; the mounts are written to the OS temp dir.
import fs from "fs";
import os from "os";
import path from "path";

export const DOCS = process.env.RHP_DOCS ?? "/Users/anasb/repositories/rhp-documentation";
const EXAMPLES = path.join(DOCS, "src/gallery/examples");
const MODULES = path.join(DOCS, "node_modules");

// Each example's best orientation and theme, from its gallery page's frontmatter
function meta(slug) {

  const page = fs.readFileSync(path.join(DOCS, "src/content/docs/gallery", slug + ".mdx"), "utf8");

  return {
    orientation: page.match(/^\s+orientation:\s*(\w+)/m)?.[1] ?? "horizontal",
    theme: page.match(/^\s+theme:\s*(\w+)/m)?.[1] ?? "site",
  };
}

export function examples() {

  if (!fs.existsSync(EXAMPLES)) return [];

  const out = [];

  for (const slug of fs.readdirSync(EXAMPLES).sort()) {
    for (const version of ["poster", "simple"]) {
      const file = path.join(EXAMPLES, slug, version, "chart.jsx");
      if (fs.existsSync(file)) out.push({ slug, version, file, ...meta(slug) });
    }
  }

  return out;
}

const css = (p) => `import ${JSON.stringify(p)};`;

// Writes the mount for one example in one orientation, and returns its path
export function mount(example, orientation) {

  const dir = path.join(os.tmpdir(), "rhp-check-gallery", `${example.slug}-${example.version}-${orientation}`);
  fs.mkdirSync(dir, { recursive: true });
  const v1 = example.version === "poster" && example.theme === "v1";
  const themes = path.join(DOCS, "src/gallery/ui/themes.js");

  const code = `${css(path.join(MODULES, "@astrojs/starlight/style/props.css"))}
${css(path.join(MODULES, "@astrojs/starlight/style/reset.css"))}
${css(path.join(MODULES, "@fontsource-variable/fraunces/opsz.css"))}
${css(path.join(MODULES, "@fontsource-variable/fraunces/opsz-italic.css"))}
${css(path.join(MODULES, "@fontsource-variable/bricolage-grotesque/index.css"))}
${["500", "600", "700", "800"].map((w) => css(path.join(MODULES, `@fontsource/barlow-condensed/${w}.css`))).join("\n")}
${["400", "500", "600"].map((w) => css(path.join(MODULES, `@fontsource/ibm-plex-mono/${w}.css`))).join("\n")}
${css(path.join(DOCS, "src/customizations/styles/gallery.css"))}
import { Theme } from "@bezda/rhp";
import { DOCS_LIGHT, V1_LIGHT } from ${JSON.stringify(themes)};
import Example from ${JSON.stringify(example.file)};

document.documentElement.dataset.theme = "light";

export default function Gallery() {
  return (
    <div style={{ "max-width": "67.5rem", margin: "1.5rem auto", padding: "0 var(--sl-content-pad-x)" }}>
      <section class="playground not-content" data-version=${JSON.stringify(example.version)}>
        <div class="pg-body">
          <div class="pg-preview">
            <Theme value={DOCS_LIGHT}>
              ${v1 ? `<Theme value={V1_LIGHT}><Example o=${JSON.stringify(orientation)} js={false} seed={0} /></Theme>` : `<Example o=${JSON.stringify(orientation)} js={false} seed={0} />`}
            </Theme>
          </div>
        </div>
      </section>
    </div>
  );
}
`;

  const file = path.join(dir, "gallery.jsx");
  fs.writeFileSync(file, code);

  return file;
}
