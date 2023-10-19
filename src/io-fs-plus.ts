import * as IoFs from '@mjljm/node-effect-lib/io-fs';
import * as IoLogger from '@mjljm/node-effect-lib/io-logger';
import * as IoPath from '@mjljm/node-effect-lib/io-path';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as E from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as O from 'effect/Option';
import { Predicate } from 'effect/Predicate';
import * as RA from 'effect/ReadonlyArray';
import type * as NodeFS from 'node:fs';

export class IoFsPlusError extends Data.TaggedError('IoFsPlusError')<{
	message: string;
}> {}

const implementation = {
	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than reading all subdirectories and filtering afterwards.
	 * @param path The path of the directory to read
	 * @param options See Node js's ObjectEncodingOptions
	 * @param f The predicate function to apply. Receives the directory path as input
	 * @returns
	 */
	readDirRecursivelyWithFilter: (
		path: string,
		options: NodeFS.ObjectEncodingOptions,
		f: Predicate<string>
	) =>
		Effect.gen(function* ($) {
			const ioFs = yield* $(IoFs.Tag);
			const ioPath = yield* $(IoPath.Tag);

			const sLast = yield* $(
				Effect.iterate(
					{ paths: [path], projectConfigs: RA.empty<NodeFS.Dirent>() },
					{
						while: (sInit) => sInit.paths.length > 0,
						body: (sInit) =>
							pipe(
								sInit.paths,
								RA.filterMap((path) =>
									f(path) ? O.some(ioFs.readDir(path, { ...options, recursive: false })) : O.none()
								),
								Effect.allWith({ concurrency: 'unbounded' }),
								Effect.flatMap((da) =>
									pipe(
										da,
										RA.flatten,
										RA.partitionMap((d) =>
											d.isDirectory() ? E.left(ioPath.join(d.path, d.name)) : E.right(d)
										),
										(t) =>
											[
												Effect.all(t[0], { concurrency: 'unbounded' }),
												Effect.succeed(t[1])
											] as const,
										Effect.allWith({ concurrency: 'unbounded' }),
										Effect.map((sNext) => ({
											paths: sNext[0],
											projectConfigs: RA.appendAll(sInit.projectConfigs, sNext[1])
										}))
									)
								),
								// To do: use Effect stringify when possible
								Effect.tap((sNext) =>
									Effect.logDebug(
										new IoLogger.LoggerError('readDirRecursiveWithFilter loop', sNext)
									)
								)
							)
					}
				)
			);
			return sLast.projectConfigs;
		})
};

export type Interface = typeof implementation;

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-fs-plus.ts'));

export const live = Layer.succeed(Tag, implementation);
