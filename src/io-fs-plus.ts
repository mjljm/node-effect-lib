import * as FileSystem from '@effect/platform/FileSystem';
import * as IoFs from '@mjljm/node-effect-lib/io-fs';
import * as IoPath from '@mjljm/node-effect-lib/io-path';
import * as Context from 'effect/Context';
import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as E from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as O from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as RA from 'effect/ReadonlyArray';
import * as Stream from 'effect/Stream';
import type * as NodeFs from 'node:fs';
import * as NodeFsPromises from 'node:fs/promises';

export class IoFsPlusError extends Data.TaggedError('IoFsPlusError')<{
	message: string;
}> {}

export interface FileInfo {
	readonly fullName: string;
	readonly baseName: string;
	readonly dirName: string;
	stat: FileSystem.File.Info;
}

const readDirectoryWithInfo =
	(ioFs: IoFs.Interface, ioPath: IoPath.Interface) =>
	(path: string, options?: FileSystem.ReadDirectoryOptions) =>
		pipe(
			ioFs.readDirectory(path, options),
			Effect.flatMap((files) =>
				pipe(
					files,
					RA.map((relativeName) =>
						pipe(ioPath.join(path, relativeName), (fullName) =>
							pipe(
								ioFs.stat(fullName),
								Effect.map(
									(stat) =>
										({
											fullName,
											baseName: ioPath.basename(fullName),
											dirName: ioPath.dirname(fullName),
											stat
										}) as FileInfo
								)
							)
						)
					),
					Effect.allWith({ concurrency: 'unbounded' })
				)
			)
		);

const implementation = (ioFs: IoFs.Interface, ioPath: IoPath.Interface) => ({
	/**
	 * Port of Node js fsPromises.watch function - Only the function that returns FileChangeInfo<string>'s has been ported.
	 * @param filename The file or directory to watch
	 * @param options See Node js's WatchOptions.
	 * @returns
	 */

	watch: (filename: string, options?: NodeFs.WatchOptions | BufferEncoding) =>
		Stream.fromAsyncIterable(
			NodeFsPromises.watch(filename, options),
			(e) => new IoFsPlusError({ message: `watch: ${(e as Error).message}` })
		),

	/**
	 * List the contents of a directory.
	 * You can recursively list the contents of nested directories by setting the recursive option.
	 *
	 * @returns an object containing the file's complete name, base name, dir name and stats.
	 */
	readDirectoryWithInfo: readDirectoryWithInfo(ioFs, ioPath),
	/**
	 * Reads recursively the contents of a directory. Only directories that fulfill the predicate are opened recursively. Much faster than reading all subdirectories and filtering afterwards.
	 * @param path The path of the directory to read
	 * @param f The predicate function to apply. Receives the directory path as input
	 * @returns
	 */
	readDirRecursivelyWithFilter: (path: string, f: Predicate.Predicate<string>) =>
		Effect.map(
			Effect.iterate(
				{ paths: [path], projectConfigs: RA.empty<FileInfo>() },
				{
					while: (sInit) => sInit.paths.length > 0,
					body: (sInit) =>
						pipe(
							sInit.paths,
							RA.filterMap((path) =>
								f(path)
									? O.some(readDirectoryWithInfo(ioFs, ioPath)(path, { recursive: false }))
									: O.none()
							),
							Effect.allWith({ concurrency: 'unbounded' }),
							Effect.map((files) =>
								pipe(
									files,
									RA.flatten,
									RA.partitionMap((file) =>
										file.stat.type === 'Directory' ? E.left(file.fullName) : E.right(file)
									),
									(t) => ({
										paths: t[0],
										projectConfigs: RA.appendAll(sInit.projectConfigs, t[1])
									})
								)
							)
						)
				}
			),
			(sLast) => sLast.projectConfigs
		)
});

// type Interface = typeof implementation works but leads to verbose type display
export interface Interface extends Readonly<ReturnType<typeof implementation>> {}

export const Tag = Context.Tag<Interface>(Symbol.for('@mjljm/node-effect-lib/io-fs-plus.ts'));

export const live = Layer.effect(
	Tag,
	Effect.gen(function* (_) {
		const ioFs = yield* _(IoFs.Tag);
		const ioPath = yield* _(IoPath.Tag);
		return implementation(ioFs, ioPath);
	})
);
