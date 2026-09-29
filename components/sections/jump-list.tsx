export interface JumpListProps {
  label: string;
  items: ReadonlyArray<{ id: string; label: string }>;
}

/** In-page index as full-width rows (wraps on any width; never scrolls sideways). */
export function JumpList({ label, items }: JumpListProps) {
  return (
    <nav aria-label={label}>
      <p className="kicker">{label}</p>
      <ul className="jump">
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`}>{i.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
