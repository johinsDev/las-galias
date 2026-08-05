import type { Core } from "@strapi/strapi";

const JOB_RUN_UID = "api::job-run.job-run";

/** How many entries to keep. Older ones are pruned so the table cannot grow forever. */
const KEEP = 200;

type Status = "ok" | "error" | "skipped";

/**
 * Records one run of an automated task so it can be read from the Content
 * Manager instead of `docker compose logs` over SSH.
 *
 * Logging must never be the reason a job fails, so every write is swallowed:
 * the task's own result is what matters, not our bookkeeping.
 */
export async function recordJobRun(
  strapi: Core.Strapi,
  task: string,
  status: Status,
  message: string,
  durationMs?: number,
): Promise<void> {
  try {
    await strapi.documents(JOB_RUN_UID).create({
      data: {
        task,
        status,
        // The Content Manager renders this in a table; a wall of text there is
        // unreadable and an ERP stack trace can be thousands of characters.
        message: message.slice(0, 1000),
        ranAt: new Date().toISOString(),
        ...(durationMs !== undefined ? { durationMs } : {}),
      },
    });

    const total = await strapi.documents(JOB_RUN_UID).count({});
    if (total > KEEP) {
      const stale = await strapi.documents(JOB_RUN_UID).findMany({
        sort: "ranAt:desc",
        start: KEEP,
        limit: total - KEEP,
        fields: ["task"],
      });
      for (const entry of stale) {
        await strapi.documents(JOB_RUN_UID).delete({ documentId: entry.documentId });
      }
    }
  } catch (err) {
    strapi.log.debug(`Could not record job run "${task}": ${String(err)}`);
  }
}

/**
 * Wraps a task: logs to stdout as before AND leaves a row behind. Returns the
 * task's value, or undefined when it threw — the caller decides what that means.
 */
export async function runTracked<T>(
  strapi: Core.Strapi,
  task: string,
  fn: () => Promise<T>,
  describe?: (result: T) => string,
): Promise<T | undefined> {
  const startedAt = Date.now();
  try {
    const result = await fn();
    const message = describe ? describe(result) : "OK";
    await recordJobRun(strapi, task, "ok", message, Date.now() - startedAt);
    return result;
  } catch (err) {
    const message = String(err);
    strapi.log.error(`${task} failed: ${message}`);
    await recordJobRun(strapi, task, "error", message, Date.now() - startedAt);
    return undefined;
  }
}
