import { Children, isValidElement, type ReactNode } from "react";
import { homeBlocks } from "@/lib/home-blocks";
export function HomeOrder({
  children,
  order,
}: {
  children: ReactNode;
  order?: string[];
}) {
  const keys = [...new Set([...(order || []), ...homeBlocks])];
  return Children.toArray(children).sort((a, b) => {
    const key = (node: ReactNode) =>
      isValidElement<{ "data-home-block"?: string }>(node)
        ? keys.indexOf(node.props["data-home-block"] || "")
        : keys.length;
    return key(a) - key(b);
  });
}
