import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import { MEffect, MError, Tree } from '@mjljm/effect-lib';
import { Context, Effect, Equal, Equivalence, Layer, Option, Predicate, ReadonlyArray, Tuple, pipe } from 'effect';
import { Concurrency } from 'effect/Types';

const moduleTag = '@mjljm/node-effect-lib/IoFs/';
const PlatformNodeFsService = PlatformNodeFs.FileSystem;
type PlatformNodeFsInterface = Context.Tag.Service<typeof PlatformNodeFsService>;

export interface ServiceInterface {
	/**
	 * Get information about a path. If resolveSymLinks=true, the info returned is not that of `path` but that of the fully resolved version of `path`
	 */
	readonly stat: (
		params:
			| { readonly path: IoPath.RealPath; readonly resolveSymLinks: false }
			| { readonly path: IoPath.NotRealPath; readonly resolveSymLinks: boolean }
	) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;

	/**
	 * Memoized version of stat. We request the path to be an AbsolutePath (union of RealAbsolutePath and NotRealAbsolutePath) to avoid the following error: passing relative paths could lead to errors if the current directory changes. Note that calling stat with a symbolic link will not yield the same result as calling stat with the fully resolved path of that symbolic link. In the first case, it will indicate the path is symbolic. In the second, it will indicate what it really is.
	 */
	readonly cachedStat: (
		params:
			| { readonly path: IoPath.RealAbsolutePath; readonly resolveSymLinks: false }
			| { readonly path: IoPath.NotRealAbsolutePath; readonly resolveSymLinks: boolean }
	) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;

	/**
	 * Read the contents of a file. See default value for encoding in NodeJs readfile doc.
	 */
	readonly readFileString: (params: {
		readonly path: IoPath.FilePath;
		readonly encoding?: string;
	}) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Memoized version of readFileString. Options need to be passed in the exact same way for caching to operate. Calling this function once without encoding and once with encoding:'utf-8' will result in two different calls. We request the path to be a RealAbsoluteFilePath to avoid two possible errors: passing relative paths could lead to errors if the current directory changes ; passing symbolic paths could lead to caching twice the same contents if the two symbolic paths resolve to the same real path.
	 */
	readonly cachedReadFileString: (params: {
		readonly path: IoPath.RealAbsoluteFilePath;
		readonly encoding?: string;
	}) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory. Returns the filenames and the stats of those filenames. If resolveSymLinks=true, the info returned is not that of filename but that of the fully resolved version of filename
	 */
	readonly readDirectory: (params: {
		readonly path: IoPath.FolderPath;
		readonly resolveSymLinks: boolean;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	}) => Effect.Effect<never, PlatformError, ReadonlyArray<[name: string, stat: PlatformNodeFs.File.Info]>>;

	/**
	 * Memoized version of readDirectory.  We request the path to be a RealAbsoluteFolderPath to avoid two possible errors: passing relative paths could lead to errors if the current directory changes ; passing symbolic paths could lead to caching twice the same contents if two symbolic paths resolve to the same real path.
	 */
	readonly cachedReadDirectory: (params: {
		readonly path: IoPath.RealAbsoluteFolderPath;
		readonly resolveSymLinks: boolean;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
	}) => Effect.Effect<never, PlatformError, ReadonlyArray<[name: string, stat: PlatformNodeFs.File.Info]>>;

	readonly glob: (params: {
		readonly path: IoPath.RealAbsoluteFolderPath;
		readonly dirsExclude: Predicate.Predicate<string>;
		readonly resolveSymLinks: boolean;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
		readonly useCachedReadDirectory: boolean;
	}) => Effect.Effect<
		never,
		PlatformError | MError.General,
		ReadonlyArray<[filename: string, stat: PlatformNodeFs.File.Info]>
	>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const fs = yield* _(PlatformNodeFsService);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const stat: ServiceInterface['stat'] = ({ path, resolveSymLinks }) =>
			Effect.gen(function* (_) {
				const finalPath = resolveSymLinks ? yield* _(ioPath.toRealAbsolutePath(path)) : path;
				return yield* _(finalPath.value, fs.stat);
			});

		const cachedStat = yield* _(
			Effect.cachedFunction(
				stat as ServiceInterface['cachedStat'],
				Equivalence.make(
					(self, that) => Equal.equals(self.path, that.path) && self.resolveSymLinks === that.resolveSymLinks
				)
			)
		);

		const readFileString: ServiceInterface['readFileString'] = ({ encoding, path }) =>
			fs.readFileString(path.value, encoding);

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(
				readFileString as ServiceInterface['cachedReadFileString'],
				Equivalence.make((self, that) => Equal.equals(self.path, that.path) && self.encoding === that.encoding)
			)
		);

		const readDirectory: ServiceInterface['readDirectory'] = ({ concurrencyOptions, path, resolveSymLinks }) =>
			Effect.gen(function* (_) {
				const subPaths = yield* _(fs.readDirectory(path.value));
				const stats = yield* _(
					subPaths,
					ReadonlyArray.map((subPath) =>
						stat({
							path: ioPath.resolve({
								previousSegments: ReadonlyArray.of(path),
								lastSegment: IoPath.RelativeFilePath(subPath)
							}),
							resolveSymLinks
						})
					),
					Effect.allWith(concurrencyOptions)
				);

				return ReadonlyArray.zip(subPaths, stats);
			});

		const cachedReadDirectory = yield* _(
			Effect.cachedFunction(
				readDirectory as ServiceInterface['cachedReadDirectory'],
				Equivalence.make(
					(self, that) => Equal.equals(self.path, that.path) && self.resolveSymLinks === that.resolveSymLinks
				)
			)
		);

		const glob: ServiceInterface['glob'] = ({
			concurrencyOptions,
			dirsExclude,
			path,
			resolveSymLinks,
			useCachedReadDirectory
		}) =>
			pipe(
				MEffect.unfoldTree({
					seed: path,
					unfoldfunction: (nextSeed, isCircular) =>
						Effect.gen(function* (_) {
							if (isCircular)
								yield* _(
									new MError.General({
										message: `Circularity detected from directory:'${path.value}' in function 'glob' of module '${moduleTag}'. Path '${nextSeed.value}' was met twice.`
									})
								);
							const dirContents = yield* _(
								useCachedReadDirectory
									? cachedReadDirectory({ path: nextSeed, resolveSymLinks, concurrencyOptions })
									: readDirectory({ path: nextSeed, resolveSymLinks, concurrencyOptions })
							);

							return pipe(
								dirContents,
								ReadonlyArray.partition(([_, stat]) => stat.type === 'Directory'),
								([files, folders]) =>
									Tuple.make(
										files,
										ReadonlyArray.filterMap(folders, ([name]) =>
											pipe(
												name,
												Option.liftPredicate((name) => !dirsExclude(name)),
												Option.map((name) =>
													ioPath.joinRealPaths({
														firstSegment: nextSeed,
														middleSegments: ReadonlyArray.empty(),
														lastSegment: IoPath.RealRelativeFolderPath(name)
													})
												)
											)
										)
									)
							);
						}),
					memoize: false,
					concurrencyOptions
				}),
				Effect.map(
					Tree.reduce(ReadonlyArray.empty<[name: string, stat: PlatformNodeFs.File.Info]>(), (acc, a) =>
						ReadonlyArray.appendAll(acc, a)
					)
				)
			);

		return {
			stat,
			cachedStat,
			readFileString,
			cachedReadFileString,
			readDirectory,
			cachedReadDirectory,
			glob
		};
	})
);
