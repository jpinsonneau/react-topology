import { css } from '@patternfly/react-styles';
import { observer } from 'mobx-react';
import * as React from 'react';
import { ConnectDragSource } from '../../../behavior/dnd-types';
import styles from '../../../css/topology-components';
import { Point } from '../../../geom';
import { EdgeTerminalType, NodeStatus } from '../../../types';
import { StatusModifier } from '../../../utils';
import ConnectorArrow from './ConnectorArrow';
import ConnectorArrowAlt from './ConnectorArrowAlt';
import ConnectorCircle from './ConnectorCircle';
import ConnectorCross from './ConnectorCross';
import ConnectorSquare from './ConnectorSquare';

interface EdgeConnectorArrowProps {
  startPoint: Point;
  endPoint: Point;
  className?: string;
  highlight?: boolean;
  isTarget?: boolean;
  status?: NodeStatus;
  terminalType?: EdgeTerminalType;
  size?: number;
  dragRef?: ConnectDragSource;
}

const DefaultConnectorTerminal: React.FunctionComponent<EdgeConnectorArrowProps> = ({
  className,
  startPoint,
  endPoint,
  isTarget = true,
  terminalType,
  status,
  ...others
}) => {
  let Terminal;
  switch (terminalType) {
    case EdgeTerminalType.directional:
      Terminal = ConnectorArrow;
      break;
    case EdgeTerminalType.directionalAlt:
      Terminal = ConnectorArrowAlt;
      break;
    case EdgeTerminalType.cross:
      Terminal = ConnectorCross;
      break;
    case EdgeTerminalType.square:
      Terminal = ConnectorSquare;
      break;
    case EdgeTerminalType.circle:
      Terminal = ConnectorCircle;
      break;
    default:
      return null;
  }
  if (!Terminal) {
    return null;
  }
  const classes = css(styles.topologyEdge, className, StatusModifier[status]);

  return <Terminal className={classes} startPoint={startPoint} endPoint={endPoint} isTarget={isTarget} {...others} />;
};

export default observer(DefaultConnectorTerminal);
