import { MarkdownView, Plugin, TFile } from "obsidian";

const SHOW_DELAY_MS = 250;
const HIDE_DELAY_MS = 120;

export default class HoverCoverPreviewPlugin extends Plugin {
  private preview: HTMLDivElement | null = null;
  private showTimer: number | null = null;
  private hideTimer: number | null = null;
  private activeLink: HTMLElement | null = null;

  async onload(): Promise<void> {
    this.preview = document.body.createDiv({ cls: "hover-preview" });
    this.preview.setAttribute("role", "tooltip");
    this.preview.style.display = "none";

    // Use pointer events at the document level so this also works for links
    // added after Obsidian renders a note (Live Preview, Reading view, etc.).
    this.registerDomEvent(document, "pointerover", (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = this.findInternalLink(target);
      if (!link || link === this.activeLink) return;

      this.clearHideTimer();
      this.activeLink = link;
      this.schedulePreview(link);
    });

    this.registerDomEvent(document, "pointerout", (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = this.findInternalLink(target);
      if (!link || link !== this.activeLink) return;
      if (event.relatedTarget instanceof Node && link.contains(event.relatedTarget)) return;
      this.scheduleHide();
    });

    // Navigation can replace the hovered element before it emits pointerout.
    // Clear the informational preview before any click is handled instead.
    this.registerDomEvent(document, "pointerdown", () => this.hidePreview());

    this.register(() => this.preview?.remove());
  }

  private schedulePreview(link: HTMLElement): void {
    this.clearShowTimer();
    this.showTimer = window.setTimeout(async () => {
      if (this.activeLink !== link) return;

      const coverUrl = this.getCoverUrl(link);
      if (!coverUrl || !this.preview) {
        this.hidePreview();
        return;
      }

      this.preview.empty();
      const image = this.preview.createEl("img", {
        attr: { src: coverUrl, alt: `Cover for ${link.textContent ?? "linked note"}` }
      });
      image.addEventListener("error", () => this.hidePreview(), { once: true });
      image.addEventListener("load", () => {
        if (this.activeLink !== link || !this.preview) return;
        this.positionPreview(link);
        this.preview.style.display = "block";
      }, { once: true });
      this.positionPreview(link);
      // A remote cover should not show an empty card while its image is loading.
      this.preview.style.display = "none";
    }, SHOW_DELAY_MS);
  }

  private getCoverUrl(link: HTMLElement): string | null {
    const destination = link.getAttribute("data-href") ?? link.textContent?.trim();
    if (!destination) return null;

    const sourcePath = this.app.workspace.getActiveViewOfType(MarkdownView)?.file?.path ?? "";
    // Links from embeds and some non-Markdown views do not have an active
    // source path. Retrying from the vault root makes ordinary [[Note]] links
    // resolve in those contexts as well.
    const file = this.app.metadataCache.getFirstLinkpathDest(destination, sourcePath)
      ?? this.app.metadataCache.getFirstLinkpathDest(destination, "");
    if (!file) return null;

    const cover = this.app.metadataCache.getFileCache(file)?.frontmatter?.cover;
    const coverPath = this.normaliseCoverValue(cover);
    return coverPath ? this.resolveCoverUrl(coverPath, file) : null;
  }

  private normaliseCoverValue(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const unwrapped = value.trim().replace(/^\[\[|\]\]$/g, "");
    return unwrapped || null;
  }

  /**
   * Reading view uses <a class="internal-link" data-href="...">, while
   * Live Preview renders the same wiki-link as a CodeMirror span with no
   * data-href. The displayed text is its link target in the common
   * [[Note name]] case, which is enough to resolve it through the cache.
   */
  private findInternalLink(target: Element): HTMLElement | null {
    return target.closest<HTMLElement>("a.internal-link, .cm-hmd-internal-link");
  }

  private resolveCoverUrl(cover: string, note: TFile): string | null {
    if (/^(https?:|data:)/i.test(cover)) return cover;

    const file = this.app.metadataCache.getFirstLinkpathDest(cover, note.path);
    return file ? this.app.vault.getResourcePath(file) : null;
  }

  private positionPreview(link: HTMLElement): void {
    if (!this.preview) return;

    const rect = link.getBoundingClientRect();
    const width = 220;
    const gap = 12;
    const rightSide = rect.right + gap;
    const leftSide = rect.left - width - gap;
    const left = rightSide + width <= window.innerWidth - 8
      ? rightSide
      : Math.max(8, leftSide);
    const top = Math.max(8, Math.min(rect.top, window.innerHeight - 328));
    this.preview.setCssProps({ left: `${left}px`, top: `${top}px` });
  }

  private scheduleHide(): void {
    this.clearHideTimer();
    this.hideTimer = window.setTimeout(() => this.hidePreview(), HIDE_DELAY_MS);
  }

  private hidePreview(): void {
    this.clearShowTimer();
    this.clearHideTimer();
    this.activeLink = null;
    if (this.preview) this.preview.style.display = "none";
  }

  private clearShowTimer(): void {
    if (this.showTimer !== null) window.clearTimeout(this.showTimer);
    this.showTimer = null;
  }

  private clearHideTimer(): void {
    if (this.hideTimer !== null) window.clearTimeout(this.hideTimer);
    this.hideTimer = null;
  }
}
