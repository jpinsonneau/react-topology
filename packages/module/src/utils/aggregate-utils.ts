import { BaseEdge } from '../elements';
import Point from '../geom/Point';
import { Node, Edge, GraphElement, ModelKind } from '../types';
import { distanceToPoint, getLinesIntersection } from './anchor-utils';

interface Aggregate {
  pos: Point;
  edge: BaseEdge;
  segments: [Point, Point][] | null;
}

/**
 * Get parent at specific depth
 * @param element 
 * @param depth 
 * @param includeGraph 
 * @returns 
 */
export const getParentAtDepth = (element: GraphElement, depth: number, includeGraph = true) => {
  let curr: GraphElement | null = element;
  while (curr && depth > 0) {
    if (curr.hasParent() && (includeGraph || curr.getParent().getKind() !== ModelKind.graph)) {
      curr = curr.getParent();
      depth--;
    } else {
      curr = null;
    }
  }
  return curr;
};

/**
 * Get element subnodes recursively
 * @param element 
 * @returns 
 */
export const getElementChildNodes = (element: GraphElement) => {
  const nodes: Node[] = [];

  element.getChildren().forEach(child => {
    if (child.getKind() === ModelKind.node) {
      const childNode = child as Node;
      if (childNode.isGroup()) {
        nodes.push(...getElementChildNodes(child));
      } else {
        nodes.push(childNode);
      }
    }
  });

  return nodes;
}


/**
 * Returns edge aggregated positions and groups segments ordered by edge direction
 * The groups are recursively traversed from deepest source group to destination until root is reached
 * then from destination group -> source
 * 
 * @param edge 
 * @returns 
 */
const getAggregatedPositions = (edge: BaseEdge) => {
  const srcAggregates: Aggregate[] = [];
  const tgtAggregates: Aggregate[] = [];

  const edges = edge.getGraph().getEdges();

  let topReached = false;
  let nestingDepth = 1;
  let curr: GraphElement | null = null;

  function getEdgePeer(e: Edge | BaseEdge) {
    return topReached ? e.getTarget() : e.getSource()
  }

  function setCurr() {
    if (edge.getSource().getParent() !== edge.getTarget().getParent()) {
      const peer = getEdgePeer(edge);
      curr = getParentAtDepth(peer, nestingDepth, !topReached);
    } else {
      curr = null;
    }
  }

  for (let i = 0; i < 2; i++) {
    setCurr();
    while (curr) {
      const relatedPoints: Node[] = [];
      edges.forEach(e => {
        const parent = getParentAtDepth(getEdgePeer(e), nestingDepth);
        if (parent === curr) {
          const childNodes = getElementChildNodes(parent);
          childNodes.forEach(c => {
            if (!relatedPoints.includes(c)) {
              relatedPoints.push(c);
            }
          });
        }
      });

      let pos: Point | null = null;
      relatedPoints.forEach(p => {
        const pointPos = p.getPosition().clone();
        const dimensions = p.getDimensions();
        pointPos.translate(dimensions.width / 2, dimensions.height / 2);

        if (pos) {
          pos.setLocation((pos.x + pointPos.x) / 2, (pos.y + pointPos.y) / 2);
        } else {
          pos = new Point(pointPos.x, pointPos.y);
        }
      });


      if (pos) {
        const agg = {
          pos,
          edge,
          segments: curr.getLastSegments()?.map(s => [new Point(s[0][0], s[0][1]), new Point(s[1][0], s[1][1])])
        } as Aggregate;
        if (topReached) {
          tgtAggregates.push(agg);
        } else {
          srcAggregates.push(agg);
        }
      }

      nestingDepth++;
      setCurr();
    }

    // graph root has been reached, moving now from tgt to src
    topReached = true;
    nestingDepth = 1;
  }

  return [...srcAggregates, ...tgtAggregates.reverse()];
};

/**
 * Returns the edge bendpoints aggregated per group
 * 
 * Example from A to E taking B,C,D positions in count:
 * 
 * Group 1 | root | Group 2
 * ------------------------
 *      A  |      |
 *        \|      |
 * B - - - x      |
 *        /| \    |
 *      C  |  \   |
 *         |   \  |
 *         |    \ |
 *         |     \|
 *         |      x - > E
 *         |     /|
 *         |    / |
 *         |   D  |
 * ------------------------
 * @param edge 
 * @returns 
 */
export const getAggregatedEdgeBendpoints = (edge: BaseEdge) => {
  const allPoints: Point[] = [];
  const aggregatedPositions = getAggregatedPositions(edge);

  for (let i = 0; i < aggregatedPositions.length; i++) {
    // check intersection between current aggregation and next one until target
    const nextAgg = i < aggregatedPositions.length - 1 ?
      aggregatedPositions[i + 1] : aggregatedPositions[i - 1];
    const segments = aggregatedPositions[i].segments ?
      aggregatedPositions[i].segments : nextAgg.segments;
    if (segments) {
      let bestDistance = Infinity;
      let point: Point | null = null;
      for (const points of segments) {
        const intersectPoint = getLinesIntersection(
          [aggregatedPositions[i].pos, nextAgg.pos],
          points
        );
        if (intersectPoint) {
          const intersectDistance = distanceToPoint(intersectPoint, aggregatedPositions[i].pos);
          if (intersectDistance < bestDistance) {
            point = intersectPoint;
            bestDistance = intersectDistance;
          }
        }
      }

      if (point) {
        allPoints.push(point);
      }
    }

  }

  return allPoints;
};