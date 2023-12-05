import { IoPath } from '#mjljm/node-effect-lib/index';
import { Context, Effect, Layer } from 'effect';
import { homedir } from 'node:os';

export interface ServiceInterface {
	/**
	 * User's home directory
	 */
	readonly homeDir: string;
	/**
	 * System root directory
	 */
	readonly rootDir: string;
}

export const Service = Context.Tag<ServiceInterface>(
	Symbol.for('#internal/IoOs.ts')
);

export const live: Layer.Layer<
	IoPath.ServiceInterface,
	never,
	ServiceInterface
> = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const ioPath = yield* _(IoPath.Service);
		const homeDir = homedir();
		const rootDir = ioPath.parse(homeDir).root;

		return { homeDir, rootDir };
	})
);
