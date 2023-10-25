import { FunctionPortError } from '@mjljm/effect-lib/Errors';
import { Context, Effect, Layer } from 'effect';
import { fileURLToPath } from 'node:url';

const implementation = () => ({
	/**
	 * Port of Node Js's url.fileURLToPath function
	 * @param url See Node Js's url.fileURLToPath function
	 * @returns
	 */
	fileURLToPath: (url: Parameters<typeof fileURLToPath>[0]) =>
		Effect.try({
			try: () => fileURLToPath(url),
			catch: (e) =>
				new FunctionPortError({
					originalError: e,
					originalFunctionName: 'url.fileURLToPath',
					moduleName: import.meta.url,
					libraryName: 'node-effect-lib'
				})
		})
});

// type Interface = typeof implementation works but leads to verbose type display
export interface Interface extends Readonly<ReturnType<typeof implementation>> {}

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/IoUrl.ts'));

export const live = Layer.succeed(Tag, implementation());
