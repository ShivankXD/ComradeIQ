export interface MissionDagNode<Context, Result = unknown> {
  id: string;
  dependsOn: string[];
  run: (context: Context, upstream: Readonly<Record<string, Result>>) => Promise<Result>;
}

export class MissionDagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissionDagError";
  }
}

/** Validates and executes only ready nodes. Independent work is genuinely parallel. */
export async function executeMissionDag<Context, Result>(
  nodes: MissionDagNode<Context, Result>[],
  context: Context,
): Promise<Record<string, Result>> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) throw new MissionDagError("Mission DAG contains duplicate node ids.");
  for (const node of nodes) {
    for (const dependency of node.dependsOn) {
      if (!byId.has(dependency)) throw new MissionDagError(`Mission DAG node ${node.id} depends on an unknown node.`);
      if (dependency === node.id) throw new MissionDagError(`Mission DAG node ${node.id} cannot depend on itself.`);
    }
  }

  const pending = new Set(nodes.map((node) => node.id));
  const results: Record<string, Result> = {};

  while (pending.size) {
    const ready = nodes.filter((node) => pending.has(node.id) && node.dependsOn.every((dependency) => dependency in results));
    if (!ready.length) throw new MissionDagError("Mission DAG contains a dependency cycle.");

    const batch = await Promise.all(ready.map(async (node) => ({
      id: node.id,
      result: await node.run(context, Object.fromEntries(node.dependsOn.map((id) => [id, results[id]]))),
    })));
    for (const item of batch) {
      results[item.id] = item.result;
      pending.delete(item.id);
    }
  }

  return results;
}
