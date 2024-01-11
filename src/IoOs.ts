import { IoPath } from '#mjljm/node-effect-lib/index';
import { PlatformError } from '@effect/platform/Error';
import { Context, Effect, Layer } from 'effect';
import { homedir } from 'node:os';

const moduleTag = '@mjljm/node-effect-lib/IoOs/';

export interface ServiceInterface {
	/**
	 * User's home directory
	 */
	readonly homeDir: IoPath.RealAbsoluteFolderPath;
	/**
	 * System root directory
	 */
	readonly rootDir: IoPath.RealAbsoluteFolderPath;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live: Layer.Layer<IoPath.ServiceInterface, PlatformError, ServiceInterface> = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const ioPath = yield* _(IoPath.Service);
		const homeDir = IoPath.unsafeRealAbsoluteFolderPath(homedir());
		const rootDir = IoPath.unsafeRealAbsoluteFolderPath(ioPath.parse(homeDir).root);

		return { homeDir, rootDir };
	})
);
