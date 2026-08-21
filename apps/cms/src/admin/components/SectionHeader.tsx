import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Box, Flex, Typography } from "@strapi/design-system";
import { ChevronDown, ChevronRight } from "@strapi/icons";
import { styled } from "styled-components";

/**
 * A collapsible section heading inside the Content Manager form.
 *
 * Strapi 5 has no sections: `FormLayout` only ever starts a new card for a
 * dynamic zone, a non-repeatable component draws a grey box without a
 * description and never collapses, and the accordion belongs to repeatable
 * components — one per entry, not per group. The project form was thirty-one
 * fields in a single column.
 *
 * So a section is a field: a custom field (`global::section`) that stores
 * nothing, is `private` so it never reaches the API, and renders this header
 * instead of an input. Its title and description come from the same place as
 * every other label, `admin-labels.ts`.
 *
 * Collapsing hides the sibling rows below it, down to the next header. The
 * layout builder puts every header alone on its own row, so those siblings are
 * exactly the fields of the section. It only ever toggles `display` — nothing
 * is moved, so React keeps owning the DOM it rendered and the values of a
 * collapsed section are still in the form and still get saved.
 */

interface SectionHeaderProps {
  name: string;
  label?: string;
  hint?: string;
}

/** Where the open/closed choice of each section is remembered, per browser. */
const storageKey = (name: string) => `lasgalias:section:${name}`;

/**
 * The bar has to be findable from across the form, so it is a filled block with
 * an accent down its left edge rather than another outlined box: built out of
 * plain design-system props it came out the same colour as the panel behind it
 * and read as one more field. Colours come from the theme, so it follows the
 * admin into dark mode.
 */
const Header = styled(Flex)`
  border-left: 4px solid ${({ theme }) => theme.colors.primary600};
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral200};
  }
`;

/**
 * The rows this header owns: its own row's siblings, up to the next header.
 *
 * `FormLayout` renders panel > grid row > grid item > input, so the row is two
 * levels up. That is checked rather than assumed: if a Strapi upgrade changes
 * the shape, `display: grid` no longer matches, this returns nothing and the
 * section renders as a plain heading over the fields it names. Worse looking,
 * never broken.
 */
function ownedRows(node: HTMLElement | null): HTMLElement[] {
  const row = node?.parentElement?.parentElement;
  if (!row || !row.parentElement) return [];
  if (window.getComputedStyle(row).display !== "grid") return [];

  const rows: HTMLElement[] = [];
  let sibling = row.nextElementSibling;
  while (sibling) {
    if (sibling.querySelector("[data-section-header]")) break;
    rows.push(sibling as HTMLElement);
    sibling = sibling.nextElementSibling;
  }
  return rows;
}

const SectionHeader = ({ name, label, hint }: SectionHeaderProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(() => {
    // Closed by default: the point of a section is that an editor reads four
    // titles instead of thirty-one fields. A localStorage that throws (private
    // window, blocked storage) must not take the form down with it.
    try {
      return window.localStorage.getItem(storageKey(name)) === "open";
    } catch {
      return false;
    }
  });
  const [count, setCount] = useState(0);

  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      try {
        window.localStorage.setItem(storageKey(name), wasOpen ? "closed" : "open");
      } catch {
        // Not remembering the choice is not a reason to refuse to open.
      }
      return !wasOpen;
    });
  }, [name]);

  // The form re-renders on every keystroke, which restores the rows this hid;
  // running on every render is what keeps a closed section closed.
  useEffect(() => {
    const rows = ownedRows(ref.current);
    for (const row of rows) row.style.display = open ? "" : "none";
    setCount(rows.reduce((total, row) => total + row.childElementCount, 0));

    return () => {
      for (const row of rows) row.style.display = "";
    };
  });

  /**
   * A field that fails validation inside a closed section would reject the save
   * with the reason three sections away and invisible. Anything invalid forces
   * its section open.
   */
  useEffect(() => {
    if (open) return;
    const rows = ownedRows(ref.current);
    if (rows.length === 0) return;

    const panel = rows[0].parentElement;
    if (!panel) return;

    const observer = new MutationObserver(() => {
      if (rows.some((row) => row.querySelector('[aria-invalid="true"]'))) setOpen(true);
    });
    observer.observe(panel, { subtree: true, attributes: true, attributeFilter: ["aria-invalid"] });
    return () => observer.disconnect();
  }, [open]);

  return (
    <Box ref={ref} data-section-header paddingTop={4}>
      <Header
        tag="button"
        type="button"
        onClick={toggle}
        aria-expanded={open}
        direction="column"
        alignItems="stretch"
        gap={1}
        width="100%"
        background="neutral150"
        hasRadius
        padding={4}
        cursor="pointer"
      >
        <Flex gap={3} alignItems="center">
          {open ? (
            <ChevronDown fill="primary600" width="1.8rem" height="1.8rem" />
          ) : (
            <ChevronRight fill="primary600" width="1.8rem" height="1.8rem" />
          )}
          <Typography variant="delta" textColor="neutral800">
            {label ?? name}
          </Typography>
          {!open && count > 0 && <Badge>{count === 1 ? "1 campo" : `${count} campos`}</Badge>}
        </Flex>
        {hint && (
          <Typography variant="pi" textColor="neutral600" textAlign="left">
            {hint}
          </Typography>
        )}
      </Header>
    </Box>
  );
};

export default SectionHeader;
