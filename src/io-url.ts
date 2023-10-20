import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { fileURLToPath } from 'node:url';

export class IoUrlError extends Data.TaggedError('IoUrlError')<{
	message: string;
}> {}

const implementation = () => ({
	/**
	 * Port of Node Js's url.fileURLToPath function
	 * @param url See Node Js's url.fileURLToPath function
	 * @returns
	 */
	fileURLToPath: (url: Parameters<typeof fileURLToPath>[0]) =>
		Effect.try({
			try: () => fileURLToPath(url),
			catch: (e) => new IoUrlError({ message: `fileURLToPath: ${(e as Error).message}` })
		})
});

// type Interface = typeof implementation works but leads to verbose type display
export interface Interface extends Readonly<ReturnType<typeof implementation>> {}

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-url.ts'));

export const live = Layer.succeed(Tag, implementation());
