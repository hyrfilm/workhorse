// TaskExecutorMachineGraph.test.ts

import { test, expect, describe } from 'vitest';
import { DirectedGraphNode, getShortestPaths, toDirectedGraph } from '@xstate/graph';
import { taskExecutorMachine } from '@/machines/TaskExecutorMachine';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertPathMatches(path: any, name: string) {
  // eslint-disable-next-line
  expect(path?.state?.value?.toLowerCase()).toContain(name.toLowerCase());
}

function assertNodeMaches(node: DirectedGraphNode, childIndex: number, name: string) {
  expect(node.children[childIndex].id.toLowerCase()).toContain(name.toLowerCase());
}

function assertEdgeMaches(node: DirectedGraphNode, childIndex: number, names: string[]) {
  expect(node.children[childIndex].edges.length).toBe(names.length);
  node.children[childIndex].edges.forEach((edge, index) => {
    expect(edge.target.id.toLowerCase()).toContain(names[index].toLowerCase())
  });
}

describe('TaskExecutorMachine Graph Tests', () => {
  test('shortestPaths', () => {
    const paths = getShortestPaths(taskExecutorMachine);
    expect(paths.length).toBe(7);

    assertPathMatches(paths[0], 'ready');
    assertPathMatches(paths[1], 'reserving');
    assertPathMatches(paths[2], 'executing');
    assertPathMatches(paths[3], 'successful');
    assertPathMatches(paths[4], 'failed');
    assertPathMatches(paths[5], 'halted');
    assertPathMatches(paths[6], 'backingOff');
  });

  test('graph', () => {
    // Annoyingly always transitions don't seem to be represented by @state/graph for some reason

    const graph = toDirectedGraph(taskExecutorMachine);
    assertNodeMaches(graph, 0, 'idle');
    assertNodeMaches(graph, 1, 'ready');
    assertNodeMaches(graph, 2, 'reserving');
    assertEdgeMaches(graph, 2, ['executing', 'noReservation'])
    assertNodeMaches(graph, 3, 'executing');
    assertEdgeMaches(graph, 3, ['successful', 'failed'])
    // always transition: noReservation -> continue -> ready
    assertNodeMaches(graph, 4, 'noReservation');
 
    expect(graph.children[5].id).contains('taskFailed');
    expect(graph.children[5].edges[0].target.id).contains('backingOff');
    expect(graph.children[5].edges[1].target.id).contains('halted');

    expect(graph.children[6].id).contains('taskSuccessful');
    expect(graph.children[6].edges[0].target.id).contains('continue');
    expect(graph.children[6].edges[1].target.id).contains('halted');

    // always transition -> ready
    expect(graph.children[7].id).contains('continue');

    expect(graph.children[8].id).contains('backingOff');
    expect(graph.children[8].edges[0].target.id).contains('continue');

    expect(graph.children[9].id).contains('halted');

    expect(graph.children.length).toBe(10);
  });
});
