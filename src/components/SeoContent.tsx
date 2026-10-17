import { SEO_LINKS, type SeoPage } from "@/lib/seo";

/** The page's descriptive text and links; mirrors `renderSeoContentHtml`. */
export function SeoContent({ page }: { page: SeoPage }): JSX.Element {
  return (
    <section className="about">
      {page.sections.map((section) => (
        <div key={section.heading}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ))}
      <nav aria-label="Flere ferjetider">
        <ul>
          {SEO_LINKS.filter((link) => link.path !== page.path).map((link) => (
            <li key={link.path}>
              <a href={link.path}>{link.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
