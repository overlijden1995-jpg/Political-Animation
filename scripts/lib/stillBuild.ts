import * as React from 'react';

/**
 * Satori bridge: expand function components and fragments ourselves, then
 * declare a display for every container (satori requires it whenever an
 * element has more than one child).
 */
export type SatoriLeaf = React.ReactElement | string | number;
export type SatoriNode = SatoriLeaf | null;

export const toList = (children: React.ReactNode): React.ReactNode[] => {
  const raw = Array.isArray(children) ? children : [children];
  return raw.flat(Infinity) as React.ReactNode[];
};

/**
 * Expand function components and fragments ourselves, then declare a display
 * for every container. Satori requires explicit `display` on any element with
 * more than one child; our slides are print layout, so stacked children become
 * a column and inline text a wrapping row.
 */
export const buildList = (nodes: React.ReactNode): SatoriLeaf[] =>
  (toList(nodes).map(build) as Array<SatoriLeaf | SatoriLeaf[] | null>)
    .flat(Infinity)
    .filter((child): child is SatoriLeaf => child !== null);

export const build = (node: React.ReactNode): SatoriLeaf | SatoriLeaf[] | null => {
  if (node === null || node === undefined || node === false || node === true) return null;
  if (Array.isArray(node)) return buildList(node);
  if (typeof node === 'string' || typeof node === 'number') return node;
  if (!React.isValidElement(node)) return null;

  const element = node as React.ReactElement<{ children?: React.ReactNode; style?: React.CSSProperties }>;

  if (element.type === React.Fragment) return build(element.props.children);
  if (typeof element.type === 'function') {
    return build((element.type as (props: never) => React.ReactNode)(element.props as never));
  }
  if (typeof element.type !== 'string') return null;

  const children = buildList(element.props.children);

  const style: React.CSSProperties = { ...(element.props.style ?? {}) };

  /**
   * Satori has no inline formatting context: sibling <span> runs become flex
   * items and each one takes its own line. For proofing we collapse them into
   * one text run so line breaking matches the browser (the highlighter strike
   * is the only thing lost).
   */
  const inlineish = (child: SatoriLeaf) =>
    typeof child === 'string' ||
    typeof child === 'number' ||
    (React.isValidElement(child) && (child as React.ReactElement).type === 'span');

  const hasGap = Boolean(style.columnGap || style.rowGap || style.gap);
  if (children.length > 1 && children.every(inlineish) && !hasGap) {
    const textOf = (node: React.ReactNode): string => {
      if (typeof node === 'string' || typeof node === 'number') return String(node);
      if (!React.isValidElement(node)) return '';
      return toList((node.props as { children?: React.ReactNode }).children).map(textOf).join('');
    };
    return React.cloneElement(
      element,
      { style: { ...style, display: 'flex' } } as never,
      children.map(textOf).join(''),
    );
  }
  // Satori only understands flex | block | none.
  if (style.display && !['flex', 'none', 'block'].includes(String(style.display))) {
    style.display = 'flex';
  }
  if (!style.display && children.length >= 1) {
    const inline = children.every(
      (child) =>
        typeof child === 'string' ||
        typeof child === 'number' ||
        (React.isValidElement(child) && (child as React.ReactElement).type === 'span'),
    );
    style.display = 'flex';
    style.flexDirection = inline ? 'row' : 'column';
    if (inline) style.flexWrap = 'wrap';
  }

  return React.cloneElement(element, { style } as never, ...(children as React.ReactNode[]));
};


/**
 * Satori wants exactly one root element. Fragment expansion can return an
 * array, so wrap it explicitly at stage size.
 */
export const buildRoot = (
  element: React.ReactElement,
  width = 1920,
  height = 1080,
): React.ReactElement => {
  const built = build(element);
  return {
    type: 'div',
    key: 'deck-root',
    props: {
      style: { display: 'flex', width, height },
      children: toList(built).filter((child) => child !== null),
    },
  } as React.ReactElement;
};
