import { LoaderComponent } from "@/types/dot-motion";
export { rgbaWithOpacity } from "@/lib/colors";

export function sanitizeName(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "dot-motion-loader";
}

export function getLabel(loader: LoaderComponent) {
  return loader.text?.enabled ? loader.text.content : "";
}
