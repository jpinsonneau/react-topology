import { BaseEdge } from '../elements';
import Point from '../geom/Point';
import { Edge, GraphElement, ModelKind, Node } from '../types';
import { getLinesIntersection } from './anchor-utils';

interface Aggregate {
  pos: Point;
  segments: [Point, Point][];
}

const getParentAtDepth = (element: GraphElement, depth: number) => {
  let curr: GraphElement | null = element;
  while (curr && depth > 0) {
    if (curr.hasParent()) {
      curr = curr.getParent();
      depth--;
    } else {
      curr = null;
    }
  }
  return curr;
};

const getAggregatedPosition = (src: GraphElement, tgt: GraphElement, nestingDepth: number, edges: Edge[]) => {
  if (src !== tgt) {
    const segments = src.getKind() !== ModelKind.graph ? src.getLastSegments() : tgt.getLastSegments();
    if (!segments) {
      return null;
    }

    let pos: Point | null = null;
    edges.forEach(edge => {
      let found: Node | null;
      if (
        getParentAtDepth(edge.getSource(), nestingDepth) === src &&
        getParentAtDepth(edge.getTarget(), nestingDepth) === tgt
      ) {
        found = edge.getSource();
      } else if (
        getParentAtDepth(edge.getTarget(), nestingDepth) === src &&
        getParentAtDepth(edge.getSource(), nestingDepth) === tgt
      ) {
        found = edge.getTarget();
      }

      if (found) {
        const pointPos = found.getPosition().clone();
        if (!found.isGroup()) {
          const dimensions = edge.getSource().getDimensions();
          pointPos.translate(dimensions.width / 2, dimensions.height / 2);
        }

        if (pos) {
          pos.setLocation((pos.x + pointPos.x) / 2, (pos.y + pointPos.y) / 2);
        } else {
          pos = new Point(pointPos.x, pointPos.y);
        }
      }
    });

    if (pos) {
      return {
        pos,
        segments: segments.map(s => [new Point(s[0][0], s[0][1]), new Point(s[1][0], s[1][1])])
      } as Aggregate;
    }
  }
  return null;
};

const getAggregatedPositions = (src: GraphElement, tgt: GraphElement) => {
  const aggregates: Aggregate[] = [];
  const edges = src.getGraph().getEdges();

  let curr = src;
  const target = getParentAtDepth(tgt, 1);
  if (target) {
    let nestingDepth = 0;
    while (curr) {
      const srcAgg = getAggregatedPosition(curr, target, nestingDepth, edges);
      if (srcAgg) {
        aggregates.push(srcAgg);
      }
      const tgtAgg = getAggregatedPosition(target, curr, nestingDepth, edges);
      if (tgtAgg) {
        aggregates.push(tgtAgg);
      }
      nestingDepth++;
      curr = getParentAtDepth(src, nestingDepth);
    }
  }

  return aggregates;
};

const getAggregatedEdgeBendpoints = (edge: BaseEdge) => {
  const allPoints: Point[] = [];
  const aggregatedPositions = getAggregatedPositions(edge.getSource(), edge.getTarget());

  if (aggregatedPositions.length > 1) {
    for (let i = 0; i < aggregatedPositions.length; i++) {
      const nextAgg = i >= aggregatedPositions.length / 2 ? i - 1 : i + 1;
      const points = aggregatedPositions[i].segments;
      for (let j = 0; j < points.length; j++) {
        const nextPoint = j < points.length - 1 ? j + 1 : 0;
        const intersectPoint = getLinesIntersection(
          [aggregatedPositions[i].pos, aggregatedPositions[nextAgg].pos],
          [points[j][0], points[nextPoint][0]]
        );
        if (intersectPoint) {
          aggregatedPositions[i].pos = intersectPoint;
          break;
        }
      }
      allPoints.push(aggregatedPositions[i].pos);
    }
  }

  return allPoints;
};

export { getAggregatedEdgeBendpoints };
