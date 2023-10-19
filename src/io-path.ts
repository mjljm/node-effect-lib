import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as NodePath from 'node:path';

export class IoPathError extends Data.TaggedError('IoPathError')<{
	message: string;
}> {}

const implementation = {
	/**
	 * Port of Node Js's path.join function
	 * @param paths See Node Js's path.join function
	 * @returns
	 */
	join: (...paths: Array<string>) =>
		Effect.try({
			try: () => NodePath.join(...paths),
			catch: (e) => new IoPathError({ message: `join: ${(e as Error).message}` })
		}),
	/**
	 * Port of Node Js's path.dirname function
	 * @param path See Node Js's path.dirname function
	 * @returns
	 */
	dirname: (path: string) =>
		Effect.try({
			try: () => NodePath.dirname(path),
			catch: (e) => new IoPathError({ message: `dirname: ${(e as Error).message}` })
		}),
	/**
	 * Port of Node Js's path.resolve function
	 * @param paths See Node Js's path.resolve function
	 * @returns
	 */
	resolve: (...paths: Array<string>) =>
		Effect.try({
			try: () => NodePath.resolve(...paths),
			catch: (e) => new IoPathError({ message: `resolve: ${(e as Error).message}` })
		})
};

export type Interface = typeof implementation;

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-path.ts'));

export const live = Layer.succeed(Tag, implementation);
