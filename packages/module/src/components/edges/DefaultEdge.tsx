import { css } from '@patternfly/react-styles';
import _ from 'lodash';
import { observer } from 'mobx-react';
import * as React from 'react';
import { ConnectDragSource, EDGE_HANDLER_PREFIX, OnSelect } from '../../behavior';
import { TOP_LAYER } from '../../const';
import styles from '../../css/topology-components';
import { Point } from '../../geom';
import { Edge, EdgeTerminalType, isNode, NodeStatus } from '../../types';
import { getClosestVisibleParent, useHover } from '../../utils';
import { getEdgeAnimationDuration, getEdgeStyleClassModifier } from '../../utils/style-utils';
import { Layer } from '../layers';
import DefaultConnectorTag from './DefaultConnectorTag';
import DefaultConnectorTerminal from './terminals/DefaultConnectorTerminal';
import { getConnectorStartPoint } from './terminals/terminalUtils';

interface DefaultEdgeProps {
  /** Additional content added to the edge */
  children?: React.ReactNode;
  /** Additional classes added to the edge */
  className?: string;
  /** The graph edge element to represent */
  element: Edge;
  /** Flag indicating if the user is dragging the edge */
  dragging?: boolean;
  /** The duration in seconds for the edge animation. Defaults to the animationSpeed set on the Edge's model */
  animationDuration?: number;
  /** The terminal type to use for the edge start */
  startTerminalType?: EdgeTerminalType;
  /** Additional classes added to the start terminal */
  startTerminalClass?: string;
  /** The status to indicate on the start terminal */
  startTerminalStatus?: NodeStatus;
  /** The size of the start terminal */
  startTerminalSize?: number;
  /** The terminal type to use for the edge end */
  endTerminalType?: EdgeTerminalType;
  /** Additional classes added to the end terminal */
  endTerminalClass?: string;
  /** The status to indicate on the end terminal */
  endTerminalStatus?: NodeStatus;
  /** The size of the end terminal */
  endTerminalSize?: number;
  /** Tag to show for the terminal */
  tag?: string;
  /** Additional classes added to the tag */
  tagClass?: string;
  /** The status to indicate on the tag */
  tagStatus?: NodeStatus;
  /** Function to call for showing a remove indicator on the edge. Part of WithRemoveConnectorProps  */
  onShowRemoveConnector?: () => void;
  /** Function to call for removing the remove indicator on the edge. Part of WithRemoveConnectorProps  */
  onHideRemoveConnector?: () => void;
  /** Ref to use to start the drag of the start of the edge. Part of WithSourceDragProps */
  sourceDragRef?: ConnectDragSource;
  /** Ref to use to start the drag of the end of the edge. Part of WithTargetDragProps */
  targetDragRef?: ConnectDragSource;
  /** Flag indicating if the element is selected. Part of WithSelectionProps */
  selected?: boolean;
  /** Function to call when the element should become selected (or deselected). Part of WithSelectionProps */
  onSelect?: OnSelect;
  /** Function to call to show a context menu for the edge  */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** Flag indicating that the context menu for the edge is currently open  */
  contextMenuOpen?: boolean;
}

interface EdgeHandlerProps extends DefaultEdgeProps {
  elements: Edge[];
  firstOrLast: boolean;
  current: Point;
  next: Point;
}

const EdgeHandler: React.FunctionComponent<EdgeHandlerProps> = ({
  firstOrLast,
  current,
  next,
  elements,
  element,
  dragging,
  sourceDragRef,
  targetDragRef,
  animationDuration,
  onShowRemoveConnector,
  onHideRemoveConnector,
  startTerminalType = EdgeTerminalType.none,
  startTerminalClass,
  startTerminalStatus,
  startTerminalSize = 14,
  endTerminalType = EdgeTerminalType.directional,
  endTerminalClass,
  endTerminalStatus,
  endTerminalSize = 14,
  tag,
  tagClass,
  tagStatus,
  className,
  selected,
  onSelect,
  onContextMenu
}) => {
  const [hover, hoverRef] = useHover();

  // eslint-disable-next-line patternfly-react/no-layout-effect
  React.useLayoutEffect(() => {
    if (hover && !dragging) {
      onShowRemoveConnector && onShowRemoveConnector();
    } else {
      onHideRemoveConnector && onHideRemoveConnector();
    }
  }, [hover, dragging, onShowRemoveConnector, onHideRemoveConnector]);

  const groupClassName = css(
    styles.topologyEdge,
    className,
    dragging && 'pf-m-dragging',
    hover && !dragging && 'pf-m-hover',
    selected && !dragging && 'pf-m-selected'
  );
  const linkClassName = css(styles.topologyEdgeLink, getEdgeStyleClassModifier(element.getEdgeStyle()));
  const edgeAnimationDuration = animationDuration ??
    elements.reduce((prev, curr) => prev + getEdgeAnimationDuration(curr.getEdgeAnimationSpeed()), 0) / elements.length;

  const bgStartPoint =
    !startTerminalType || startTerminalType === EdgeTerminalType.none
      ? [current.x, current.y]
      : getConnectorStartPoint(next, current, startTerminalSize);
  const bgEndPoint =
    !endTerminalType || endTerminalType === EdgeTerminalType.none
      ? [next.x, next.y]
      : getConnectorStartPoint(current, next, endTerminalSize);

  return (
    <Layer id={dragging || hover ? TOP_LAYER : undefined}>
      <g
        id={`${EDGE_HANDLER_PREFIX}${JSON.stringify(elements.map(e => e.getId()))}`}
        ref={hoverRef}
        data-test-id="edge-handler"
        className={groupClassName}
        onClick={onSelect}
        onContextMenu={onContextMenu}
      >
        <path
          className={css(styles.topologyEdgeBackground)}
          d={`M${bgStartPoint[0]} ${bgStartPoint[1]} L${bgEndPoint[0]} ${bgEndPoint[1]}`}
          onMouseEnter={onShowRemoveConnector}
          onMouseLeave={onHideRemoveConnector}
        />
        <path
          className={linkClassName}
          d={`M${current.x} ${current.y} L${next.x} ${next.y}`}
          style={{ animationDuration: `${edgeAnimationDuration}s` }}
        />
        {tag && firstOrLast && (
          <DefaultConnectorTag
            className={tagClass}
            startPoint={current}
            endPoint={next}
            tag={tag}
            status={tagStatus}
          />
        )}
        <DefaultConnectorTerminal
          className={startTerminalClass}
          startPoint={next}
          endPoint={current}
          size={startTerminalSize}
          dragRef={sourceDragRef}
          terminalType={startTerminalType}
          status={startTerminalStatus}
          highlight={dragging || hover}
        />
        <DefaultConnectorTerminal
          className={endTerminalClass}
          isTarget
          dragRef={targetDragRef}
          startPoint={current}
          endPoint={next}
          size={endTerminalSize}
          terminalType={endTerminalType}
          status={endTerminalStatus}
          highlight={dragging || hover}
        />
      </g>
    </Layer>
  );
};

const DefaultEdge: React.FunctionComponent<DefaultEdgeProps> = (props) => {
  // If the edge connects to nodes in a collapsed group don't draw
  const sourceParent = getClosestVisibleParent(props.element.getSource());
  const targetParent = getClosestVisibleParent(props.element.getTarget());
  if (isNode(sourceParent) && sourceParent.isCollapsed() && sourceParent === targetParent) {
    return null;
  }

  const handlers: React.ReactNode[] = [];
  const sortedEdges = props.element.getGraph().getEdges(true);
  const allPoints = [props.element.getStartPoint(), ...props.element.getBendpoints(), props.element.getEndPoint()];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const current = allPoints[i];
    const next = allPoints[i + 1];

    const firstOrLast = i === 0 || i === allPoints.length - 2;
    const elements = firstOrLast ? [props.element] :
      sortedEdges
        .filter(e =>
          e.getBendpoints().find(p => current.equals(p)) &&
          e.getBendpoints().find(p => next.equals(p))
        );

    if (firstOrLast || _.first(elements) === props.element) {
      handlers.push(
        <EdgeHandler
          {...props}
          firstOrLast={firstOrLast}
          current={current}
          next={next}
          elements={elements}
        />
      );
    }
  }

  return (
    <>
      {...handlers}
      {props.children}
    </>
  );
};

export default observer(DefaultEdge);
