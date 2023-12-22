import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import { Chunk, Context, Effect, Equal, Equivalence, Layer, Predicate, ReadonlyArray } from 'effect';
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
	 * Memoized version of stat.
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
		readonly filePath: IoPath.FilePath;
		readonly encoding?: string;
	}) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Memoized version of readFileString. Options need to be passed in the exact same way for caching to operate. Calling this function once without encoding and once with encoding:'utf-8' will result in two different calls
	 */
	readonly cachedReadFileString: (params: {
		readonly filePath: IoPath.RealAbsoluteFilePath;
		readonly encoding?: string;
	}) => Effect.Effect<never, PlatformError, string>;

	/**
	 * Lists the contents of a directory. Returns the filename and the stats of that filename. If resolveSymLinks=true, the info returned is not that of the filename but that of the fully resolved version of filename
	 */
	readonly readDirectory: (params: {
		readonly folderPath: IoPath.FolderPath;
		readonly resolveSymLinks: boolean;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency };
	}) => Effect.Effect<never, PlatformError, Chunk.Chunk<[filename: string, stat: PlatformNodeFs.File.Info]>>;

	/**
	 * Memoized version of readDirectory.
	 */
	readonly cachedReadDirectory: (params: {
		readonly folderPath: IoPath.RealAbsoluteFolderPath;
		readonly resolveSymLinks: boolean;
		readonly concurrencyOptions?: { readonly concurrency?: Concurrency };
	}) => Effect.Effect<never, PlatformError, Chunk.Chunk<[filename: string, stat: PlatformNodeFs.File.Info]>>;
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
				return yield* _(finalPath.path, fs.stat);
			});

		const cachedStat = yield* _(
			Effect.cachedFunction(
				stat as ServiceInterface['cachedStat'],
				Equivalence.make(
					(self, that) => Equal.equals(self.path, that.path) && self.resolveSymLinks === that.resolveSymLinks
				)
			)
		);

		const readFileString: ServiceInterface['readFileString'] = ({ encoding, filePath }) =>
			fs.readFileString(filePath.path, encoding);

		const cachedReadFileString = yield* _(
			Effect.cachedFunction(
				readFileString as ServiceInterface['cachedReadFileString'],
				Equivalence.make((self, that) => Equal.equals(self.filePath, that.filePath) && self.encoding === that.encoding)
			)
		);

		const readDirectory: ServiceInterface['readDirectory'] = ({ folderPath, resolveSymLinks, concurrencyOptions }) =>
			Effect.gen(function* (_) {
				const paths = yield* _(fs.readDirectory(folderPath.path));
				const stats = yield* _(
					paths,
					ReadonlyArray.map((path) =>
						stat({
							path: ioPath.resolve({
								previousSegments: ReadonlyArray.of(folderPath),
								lastSegment: IoPath.RelativeFilePath(path)
							}),
							resolveSymLinks
						})
					),
					Effect.allWith(concurrencyOptions)
				);

				return Chunk.zip(Chunk.unsafeFromArray(paths), Chunk.unsafeFromArray(stats));
			});

		const cachedReadDirectory = yield* _(
			Effect.cachedFunction(
				readDirectory as ServiceInterface['cachedReadDirectory'],
				Equivalence.make(
					(self, that) =>
						Equal.equals(self.folderPath, that.folderPath) && self.resolveSymLinks === that.resolveSymLinks
				)
			)
		);

		const glob = ({
			dirPath,
			filesInclude = () => true,
			dirsExclude = () => false,
			resolveSymLinks,
			concurrencyOptions,
			cacheDirectoryContents = false
		}: {
			folderPath: IoPath.FolderPath;
			filesInclude: Predicate.Predicate<string>;
			dirsExclude: Predicate.Predicate<string>;
			resolveSymLinks: boolean | undefined;
			concurrencyOptions?: { readonly concurrency?: Concurrency | undefined } | undefined;
			cacheDirectoryContents?: boolean;
		}) =>
			pipe(
				new FullStatParams({ path: dirPath, memoize }),
				fullStat,
				Effect.flatMap((dirInfo) =>
					MEffect.treeUnfold<never, MError.General | PlatformError, Chunk.Chunk<PathInfo.Type>, PathInfo.Type>(
						dirInfo,
						(nextSeed, isCircular) =>
							pipe(
								isCircular
									? new MError.General({
											message: `Circularity detected in ${moduleTag}readDirRecursivelyWithFilters from directory: ${dirInfo.absolutePath}`
									  })
									: nextSeed.stat.type === 'Directory'
									  ? Effect.map(
												readDirectoryWithInfoAndFilters(
													new readDirectoryWithInfoAndFiltersParams({
														dirPath: nextSeed.absolutePath,
														options: { recursive: false, resolveSymLinks },
														filesInclude,
														dirsExclude,
														concurrencyOptions,
														memoize
													})
												),
												(files) => Chunk.partition(files, (pathInfo) => pathInfo.stat.type === 'Directory')
									    )
									  : new MError.General({
												message: `${moduleTag}readDirRecursivelyWithFilters was called with a path that is not a directory: ${dirInfo.absolutePath}`
									    })
							),
						memoize,
						undefined,
						concurrencyOptions
					)
				),
				Effect.map(Tree.reduce(Chunk.empty<PathInfo.Type>(), (acc, a) => Chunk.appendAll(acc, a)))
			);
		return {
			stat,
			cachedStat,
			readFileString,
			cachedReadFileString,
			readDirectory,
			cachedReadDirectory
		};
	})
);
