import { IoPath } from '#mjljm/node-effect-lib/index';
import { Context, Effect, Layer, pipe } from 'effect';
import { homedir } from 'node:os';

export interface ServiceInterface {
	readonly homeDir: string;
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
	Effect.map(IoPath.Service, (ioPath) =>
		pipe(
			{ homeDir: homedir() },
			({ homeDir }) => ({ homeDir, rootDir: ioPath.parse(homeDir).root }),
			({ homeDir, rootDir }) => ({
				/**
				 * User's home directory
				 */
				homeDir,
				/**
				 * System root directory
				 */
				rootDir
			})
		)
	)
);
