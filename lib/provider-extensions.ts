import { claudeCodeExtension, type InlineExtension } from "@earendil-works/pi-coding-agent";

/**
 * Built-in extensions that only register model providers. Every runtime that
 * lists or resolves models loads them, so the model selector, the default
 * model route, and a normal session agree on which models exist.
 *
 * `claude-code` runs the local Claude Code CLI (`claude -p`) under the user's
 * own login; Claude Code executes its tools itself and Pi only records them.
 */
export function createProviderExtensions(): InlineExtension[] {
  return [{ name: "claude-code", factory: claudeCodeExtension, builtin: true }];
}
