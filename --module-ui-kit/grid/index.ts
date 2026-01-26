/**
 * Grid System Exports
 *
 * Bootstrap-like 12-column responsive grid system.
 *
 * @example
 * import { Container, Row, Col } from '@ui-kit'
 *
 * <Container>
 *   <Row gutter="lg">
 *     <Col span={{ default: 12, sm: 6, lg: 3 }}>Card 1</Col>
 *     <Col span={{ default: 12, sm: 6, lg: 3 }}>Card 2</Col>
 *   </Row>
 * </Container>
 */

// Components
export { Col, type ColProps } from './col'
export { Container, type ContainerProps } from './container'
export { Row, type RowProps } from './row'

// Types
export type {
  AlignItems,
  Breakpoint,
  ColOffset,
  ColOrder,
  ColSpan,
  GutterSize,
  JustifyContent,
  ResponsiveValue
} from './types'
