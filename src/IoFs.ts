import { IoOs, IoPath } from '#mjljm/node-effect-lib/index';
import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import { PlatformError } from '@effect/platform/Error';
import { Context, Effect, Equal, Equivalence, Layer } from 'effect';

const moduleTag = '@mjljm/node-effect-lib/IoFs/';
const PlatformNodeFsService = PlatformNodeFs.FileSystem;
type PlatformNodeFsInterface = Context.Tag.Service<typeof PlatformNodeFsService>;

interface ReadFileStringParams<P extends IoPath.FilePath> {
	readonly filePath: P;
	readonly encoding?: string;
}

interface StatParams<P extends IoPath.Path> {
	readonly path: P;
	readonly resolveSymLinks?: boolean;
}

export interface ServiceInterface {
	/**
	 * Get information about a file at `path`.
	 */
	readonly stat: (params: StatParams<IoPath.Path>) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;
	/**
	 * Memoized version of stat
	 */
	readonly cachedStat: (
		params: StatParams<IoPath.RealAbsolutePath>
	) => Effect.Effect<never, PlatformError, PlatformNodeFs.File.Info>;
	/**
	 * Read the contents of a file.
	 */
	readonly readFileString: (
		params: ReadFileStringParams<IoPath.FilePath>
	) => Effect.Effect<never, PlatformError, string>;
	/**
	 * Memoized version of readFileString
	 */
	readonly cachedReadFileString: (
		params: ReadFileStringParams<IoPath.RealAbsoluteFilePath>
	) => Effect.Effect<never, PlatformError, string>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const fs = yield* _(PlatformNodeFsService);
		const ioPath = yield* _(IoPath.Service);
		const ioOs = yield* _(IoOs.Service);

		const stat = ({ path, resolveSymLinks }: StatParams<IoPath.Path>) =>
			Effect.gen(function* (_) {
				const finalPath =
					// A revoir
					resolveSymLinks && IoPath.isSymbolicPath(path) ? yield* _(ioPath.toRealAbsolutePath(path)) : path;
				return yield* _(finalPath.path, fs.stat);
			});
		const cachedStatParamsEq = Equivalence.make<StatParams<IoPath.RealAbsolutePath>>(
			(self, that) => Equal.equals(self.path, that.path) && self.resolveSymLinks === that.resolveSymLinks
		);
		const cachedStat = yield* _(
			Effect.cachedFunction<never, PlatformError, StatParams<IoPath.RealAbsolutePath>, PlatformNodeFs.File.Info>(
				stat,
				cachedStatParamsEq
			)
		);
		const readFileString = ({ encoding, filePath }: ReadFileStringParams<IoPath.FilePath>) =>
			fs.readFileString(filePath.path, encoding);
		const cachedReadFileStringParamsEq = Equivalence.make<ReadFileStringParams<IoPath.RealAbsoluteFilePath>>(
			(self, that) => Equal.equals(self.filePath, that.filePath) && self.encoding === that.encoding
		);
		const cachedReadFileString = yield* _(
			Effect.cachedFunction<never, PlatformError, ReadFileStringParams<IoPath.RealAbsoluteFilePath>, string>(
				readFileString,
				cachedReadFileStringParamsEq
			)
		);
		/*const readFileString = ({ filePath, encoding }) =>
			memoize
				? // In case we use memoization, we make sure the path is absolute to avoid issues in case the
				  // current directory would change
				  cachedReadFileString(
						new ReadFileStringParams({
							filePath: ioPath.resolve(filePath),
							encoding,
							memoize
						})
				  )
				: fs.readFileString(filePath, encoding);*/

		return {
			stat,
			cachedStat,
			readFileString,
			cachedReadFileString
		};
	})
);
