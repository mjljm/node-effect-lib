import * as PlatformNodePath from '@effect/platform-node/Path';
import { Context, Layer } from 'effect';

const moduleTag = '@mjljm/node-effect-lib/IoPath/';

const PlatformNodePathTag = PlatformNodePath.Path;
type PlatformNodePathInterface = Context.Tag.Service<
	typeof PlatformNodePathTag
>;
export interface ServiceInterface extends PlatformNodePathInterface {}
export const Service = Context.Tag<ServiceInterface>(
	Symbol.for(moduleTag + 'Service')
);

export const live = Layer.effect(Service, PlatformNodePathTag);
