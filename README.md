# Obsidian Hover Preview

An Obsidian plugin that shows the `cover` property of a linked note when you hover an internal link.

For a note named `Arknights.md`, add a frontmatter property such as:

```yaml
---
cover: "assets/arknights-cover.jpg"
---
```

The `cover` value can be a vault image path, a wikilink (`[[assets/arknights-cover.jpg]]`), or an `http(s)` URL. Your current value is supported directly:

```yaml
cover: https://images.igdb.com/igdb/image/upload/t_cover_big/co4uni.jpg
```

Hovering `[[Arknights]]` then displays that image.

## Development

```bash
npm install
npm run build
```

Copy `manifest.json`, `main.js`, and `styles.css` to `<vault>/.obsidian/plugins/hover-cover-preview/`, then enable **Obsidian Hover Preview** in Obsidian's Community plugins settings.

After updating an installed plugin, replace `main.js` with the newly built file and reload Obsidian (or toggle the plugin off and back on).
