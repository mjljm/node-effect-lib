import * as PlatformNodePath from '@effect/platform-node/Path';
import { Context, Layer } from 'effect';

const PlatformPathTag = PlatformNodePath.Path;
type PlatformPathInterface = Context.Tag.Service<typeof PlatformPathTag>;
export interface ServiceInterface extends PlatformPathInterface {}
export const Service = Context.Tag<ServiceInterface>(
	Symbol.for('#internal/IoPath.ts')
);

export const live = Layer.effect(Service, PlatformPathTag);
