import type { PluginServerContext } from "@getpaseo/plugin/server";
import { snippetsSettings } from "./shared/settings";

export default function contribute(server: PluginServerContext) {
  server.registerSettings(snippetsSettings);
  return () => {};
}
