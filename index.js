/**
 * Host half of the cognition HUD bundle.
 *
 * The HUD is a pure Client feature: the Web page already receives live
 * `assistant/live-chunk` transient events through `ctx.sessions`, so no Host
 * service, stream or persisted state is needed here.
 */
export function apply() {}
