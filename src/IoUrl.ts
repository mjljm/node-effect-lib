import { MError } from '@mjljm/effect-lib';
import { Context, Effect, Layer } from 'effect';
import { fileURLToPath } from 'node:url';

export interface ServiceInterface {
	/**
	 * Port of Node Js's url.fileURLToPath function
	 * @param url See Node Js's url.fileURLToPath function
	 * @returns
	 */
	fileURLToPath: (
		url: Parameters<typeof fileURLToPath>[0]
	) => Effect.Effect<never, MError.FunctionPort, string>;
}

export const Service = Context.Tag<ServiceInterface>(
	Symbol.for('#internal/IoUrl.ts')
);

export const live = Layer.succeed(Service, {
	fileURLToPath: (url) =>
		Effect.try({
			try: () => fileURLToPath(url),
			catch: (e) =>
				new MError.FunctionPort({
					originalError: e,
					originalFunctionName: 'url.fileURLToPath',
					moduleName: import.meta.url,
					libraryName: 'node-effect-lib'
				})
		})
});
