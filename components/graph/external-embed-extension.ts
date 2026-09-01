import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ExternalEmbedNode } from "./external-embed-node";

export interface ExternalEmbedAttributes {
  url: string;
  kind: "wikipedia" | "map" | "generic";
  title?: string;
  description?: string;
  thumbnail?: string;
  embedHtml?: string;
  width?: number;
  height?: number;
}

export const ExternalEmbed = Node.create({
  name: "externalEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: "" },
      kind: { default: "generic" },
      title: { default: undefined },
      description: { default: undefined },
      thumbnail: { default: undefined },
      embedHtml: { default: undefined },
      width: { default: undefined },
      height: { default: 320 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-external-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-external-embed": "" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ExternalEmbedNode);
  },
});
