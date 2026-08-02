import { metadata } from "next-sanity/studio";
import { viewport } from "next-sanity/studio";
import Studio from "./Studio";

export { metadata, viewport };

export default function StudioPage() {
  return <Studio />;
}
