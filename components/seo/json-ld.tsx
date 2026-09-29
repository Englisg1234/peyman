export interface JsonLdProps {
  data: unknown;
}

/** Serializes structured data safely into a JSON-LD script (`<` escaped so it cannot close the tag). */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
