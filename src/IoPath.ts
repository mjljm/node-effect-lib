import * as PlatformNodeFs from '@effect/platform-node/FileSystem';
import * as PlatformNodePath from '@effect/platform-node/Path';
import { BadArgument, PlatformError } from '@effect/platform/Error';
import { Context, Effect, Equal, Hash, Layer, Option, Predicate, ReadonlyArray, pipe } from 'effect';
import { ParsedPath } from 'path';

const moduleTag = '@mjljm/node-effect-lib/IoPath/';

const PlatformNodePathService = PlatformNodePath.Path;
const PlatformNodeFsService = PlatformNodeFs.FileSystem;

const TypeId: unique symbol = Symbol.for(moduleTag + 'TypeId');
type TypeId = typeof TypeId;

/**
 * Utility types and functions
 */
export type DevelopPath<P> = P extends GenericPath<infer X, infer Y, infer Z>
	? Z extends unknown
		? Y extends unknown
			? X extends unknown
				? GenericPath<X, Y, Z>
				: never
			: never
		: never
	: never;

type DeveloppedPath = DevelopPath<Path>;

/**
 * Type of the path link. `Unknown` means we ignore whether the link is symbolic or real. `Symbolic` means the path of the link will be modified by fs.realPath. `Real` means the path of the link will not be modified by fs.realPath (except if it is a relative link).
 */
type PathLinkType = 'real' | 'symbolic' | 'unknown';
/**
 * Position of the path link. Unknown means we ignore whether the link is absolute or relative
 */
type PathPositionType = 'absolute' | 'relative' | 'unknown';
/**
 * Target of the path link. Unknown means we ignore whether the link is a file or a folder
 */
type PathTargetType = 'file' | 'folder' | 'unknown';

/**
 * A GenericPath represents a filesystem path to a file or a folder that can be real or symbolic, relative or absolute.
 * */
export interface GenericPath<L extends PathLinkType, P extends PathPositionType, T extends PathTargetType>
	extends Equal.Equal {
	readonly [TypeId]: TypeId;
	readonly path: string;
	readonly pathLink: L;
	readonly pathPosition: P;
	readonly pathTarget: T;
}

// All possible paths types: no variable set - 1 possibility
export type Path = GenericPath<PathLinkType, PathPositionType, PathTargetType>;

// All possible paths types: 1 variable set - 6 possibilities
export type FilePath = GenericPath<PathLinkType, PathPositionType, 'file'>;
export type FolderPath = GenericPath<PathLinkType, PathPositionType, 'folder'>;
export type RelativePath = GenericPath<PathLinkType, 'relative', PathTargetType>;
export type AbsolutePath = GenericPath<PathLinkType, 'absolute', PathTargetType>;
export type SymbolicPath = GenericPath<'symbolic', PathPositionType, PathTargetType>;
export type RealPath = GenericPath<'real', PathPositionType, PathTargetType>;

// All possible paths types: 2 variables set - 12 possibilities
export type AbsoluteFilePath = GenericPath<PathLinkType, 'absolute', 'file'>;
export type RelativeFilePath = GenericPath<PathLinkType, 'relative', 'file'>;
export type AbsoluteFolderPath = GenericPath<PathLinkType, 'absolute', 'folder'>;
export type RelativeFolderPath = GenericPath<PathLinkType, 'relative', 'folder'>;
export type SymbolicRelativePath = GenericPath<'symbolic', 'relative', PathTargetType>;
export type RealRelativePath = GenericPath<'real', 'relative', PathTargetType>;
export type SymbolicAbsolutePath = GenericPath<'symbolic', 'absolute', PathTargetType>;
export type RealAbsolutePath = GenericPath<'real', 'absolute', PathTargetType>;
export type SymbolicFilePath = GenericPath<'symbolic', PathPositionType, 'file'>;
export type SymbolicFolderPath = GenericPath<'symbolic', PathPositionType, 'folder'>;
export type RealFilePath = GenericPath<'real', PathPositionType, 'file'>;
export type RealFolderPath = GenericPath<'real', PathPositionType, 'folder'>;

// All possible paths types: 3 variables set - 8 possibilities
export type RealRelativeFilePath = GenericPath<'real', 'relative', 'file'>;
export type RealAbsoluteFilePath = GenericPath<'real', 'absolute', 'file'>;
export type RealAbsoluteFolderPath = GenericPath<'real', 'absolute', 'folder'>;
export type RealRelativeFolderPath = GenericPath<'real', 'relative', 'folder'>;
export type SymbolicAbsoluteFilePath = GenericPath<'symbolic', 'absolute', 'file'>;
export type SymbolicAbsoluteFolderPath = GenericPath<'symbolic', 'absolute', 'folder'>;
export type SymbolicRelativeFilePath = GenericPath<'symbolic', 'relative', 'file'>;
export type SymbolicRelativeFolderPath = GenericPath<'symbolic', 'relative', 'folder'>;

// All negative possible negative paths types
export type NotFilePath = Exclude<DeveloppedPath, DevelopPath<FilePath>>;
export type NotFolderPath = Exclude<DeveloppedPath, DevelopPath<FolderPath>>;
export type NotRelativePath = Exclude<DeveloppedPath, DevelopPath<RelativePath>>;
export type NotAbsolutePath = Exclude<DeveloppedPath, DevelopPath<AbsolutePath>>;
export type NotSymbolicPath = Exclude<DeveloppedPath, DevelopPath<SymbolicPath>>;
export type NotRealPath = Exclude<DeveloppedPath, DevelopPath<RealPath>>;

export type NotAbsoluteFilePath = Exclude<DeveloppedPath, DevelopPath<AbsoluteFilePath>>;
export type NotRelativeFilePath = Exclude<DeveloppedPath, DevelopPath<RelativeFilePath>>;
export type NotAbsoluteFolderPath = Exclude<DeveloppedPath, DevelopPath<AbsoluteFolderPath>>;
export type NotRelativeFolderPath = Exclude<DeveloppedPath, DevelopPath<RelativeFolderPath>>;
export type NotSymbolicRelativePath = Exclude<DeveloppedPath, DevelopPath<SymbolicRelativePath>>;
export type NotRealRelativePath = Exclude<DeveloppedPath, DevelopPath<RealRelativePath>>;
export type NotSymbolicAbsolutePath = Exclude<DeveloppedPath, DevelopPath<SymbolicAbsolutePath>>;
export type NotRealAbsolutePath = Exclude<DeveloppedPath, DevelopPath<RealAbsolutePath>>;
export type NotSymbolicFilePath = Exclude<DeveloppedPath, DevelopPath<SymbolicFilePath>>;
export type NotSymbolicFolderPath = Exclude<DeveloppedPath, DevelopPath<SymbolicFolderPath>>;
export type NotRealFilePath = Exclude<DeveloppedPath, DevelopPath<RealFilePath>>;
export type NotRealFolderPath = Exclude<DeveloppedPath, DevelopPath<RealFolderPath>>;

export type NotRealRelativeFilePath = Exclude<DeveloppedPath, DevelopPath<RealRelativeFilePath>>;
export type NotRealAbsoluteFilePath = Exclude<DeveloppedPath, DevelopPath<RealAbsoluteFilePath>>;
export type NotRealAbsoluteFolderPath = Exclude<DeveloppedPath, DevelopPath<RealAbsoluteFolderPath>>;
export type NotRealRelativeFolderPath = Exclude<DeveloppedPath, DevelopPath<RealRelativeFolderPath>>;
export type NotSymbolicAbsoluteFilePath = Exclude<DeveloppedPath, DevelopPath<SymbolicAbsoluteFilePath>>;
export type NotSymbolicAbsoluteFolderPath = Exclude<DeveloppedPath, DevelopPath<SymbolicAbsoluteFolderPath>>;
export type NotSymbolicRelativeFilePath = Exclude<DeveloppedPath, DevelopPath<SymbolicRelativeFilePath>>;
export type NotSymbolicRelativeFolderPath = Exclude<DeveloppedPath, DevelopPath<SymbolicRelativeFolderPath>>;

/**
 * Type guards
 * The underlying path is not modified. The result is based only on the pathLink, pathPosition and pathTarget fields
 */
export const isPath = (u: unknown): u is Path => Predicate.hasProperty(u, TypeId);

export const isFilePath = (u: Path): u is FilePath => u.pathTarget === 'file';
export const isFolderPath = (u: Path): u is FolderPath => u.pathTarget === 'folder';
export const isRelativePath = (u: Path): u is RelativePath => u.pathPosition === 'relative';
export const isAbsolutePath = (u: Path): u is AbsolutePath => u.pathPosition === 'absolute';
export const isSymbolicPath = (u: Path): u is SymbolicPath => u.pathLink === 'symbolic';
export const isRealPath = (u: Path): u is RealPath => u.pathLink === 'real';
export const isAbsoluteFilePath = (u: Path): u is AbsoluteFilePath =>
	u.pathPosition === 'absolute' && u.pathTarget === 'file';
export const isRelativeFilePath = (u: Path): u is RelativeFilePath =>
	u.pathPosition === 'relative' && u.pathTarget === 'file';
export const isAbsoluteFolderPath = (u: Path): u is AbsoluteFolderPath =>
	u.pathPosition === 'absolute' && u.pathTarget === 'folder';
export const isRelativeFolderPath = (u: Path): u is RelativeFolderPath =>
	u.pathPosition === 'relative' && u.pathTarget === 'folder';
export const isSymbolicRelativePath = (u: Path): u is SymbolicRelativePath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'relative';
export const isRealRelativePath = (u: Path): u is RealRelativePath =>
	u.pathLink === 'real' && u.pathPosition === 'relative';
export const isSymbolicAbsolutePath = (u: Path): u is SymbolicAbsolutePath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'absolute';
export const isRealAbsolutePath = (u: Path): u is RealAbsolutePath =>
	u.pathLink === 'real' && u.pathPosition === 'absolute';
export const isSymbolicFilePath = (u: Path): u is SymbolicFilePath =>
	u.pathLink === 'symbolic' && u.pathTarget === 'file';
export const isSymbolicFolderPath = (u: Path): u is SymbolicFolderPath =>
	u.pathLink === 'symbolic' && u.pathTarget === 'folder';
export const isRealFilePath = (u: Path): u is RealFilePath => u.pathLink === 'real' && u.pathTarget === 'file';
export const isRealFolderPath = (u: Path): u is RealFolderPath => u.pathLink === 'real' && u.pathTarget === 'folder';
export const isRealRelativeFilePath = (u: Path): u is RealRelativeFilePath =>
	u.pathLink === 'real' && u.pathPosition === 'relative' && u.pathTarget === 'file';
export const isRealAbsoluteFilePath = (u: Path): u is RealAbsoluteFilePath =>
	u.pathLink === 'real' && u.pathPosition === 'absolute' && u.pathTarget === 'file';
export const isRealAbsoluteFolderPath = (u: Path): u is RealAbsoluteFolderPath =>
	u.pathLink === 'real' && u.pathPosition === 'absolute' && u.pathTarget === 'folder';
export const isRealRelativeFolderPath = (u: Path): u is RealRelativeFolderPath =>
	u.pathLink === 'real' && u.pathPosition === 'relative' && u.pathTarget === 'folder';
export const isSymbolicAbsoluteFilePath = (u: Path): u is SymbolicAbsoluteFilePath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'absolute' && u.pathTarget === 'file';
export const isSymbolicAbsoluteFolderPath = (u: Path): u is SymbolicAbsoluteFolderPath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'absolute' && u.pathTarget === 'folder';
export const isSymbolicRelativeFilePath = (u: Path): u is SymbolicRelativeFilePath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'relative' && u.pathTarget === 'file';
export const isSymbolicRelativeFolderPath = (u: Path): u is SymbolicRelativeFolderPath =>
	u.pathLink === 'symbolic' && u.pathPosition === 'relative' && u.pathTarget === 'folder';

/**
 * Constructors
 */

const prototype = {
	[Equal.symbol](this: Path, that: Equal.Equal): boolean {
		return isPath(that) ? this.path === that.path : false;
	},
	[Hash.symbol](this: Path): number {
		return Hash.hash(this.path);
	}
};
const GenericPath = <L extends PathLinkType, P extends PathPositionType, T extends PathTargetType>({
	path,
	pathLink,
	pathPosition,
	pathTarget
}: {
	path: string;
	pathLink: L;
	pathPosition: P;
	pathTarget: T;
}): GenericPath<L, P, T> =>
	Object.create(prototype, {
		[TypeId]: { value: TypeId },
		path: { value: path },
		pathLink: { value: pathLink },
		pathPosition: { value: pathPosition },
		pathTarget: { value: pathTarget }
	}) as unknown as GenericPath<L, P, T>;
export const Path = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'unknown', pathTarget: 'unknown' });
export const FilePath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'unknown', pathTarget: 'file' });
export const FolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'unknown', pathTarget: 'folder' });
export const RelativePath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'relative', pathTarget: 'unknown' });
export const AbsolutePath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'absolute', pathTarget: 'unknown' });
export const SymbolicPath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'unknown', pathTarget: 'unknown' });
export const RealPath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'unknown', pathTarget: 'unknown' });
export const AbsoluteFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'absolute', pathTarget: 'file' });
export const RelativeFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'relative', pathTarget: 'file' });
export const AbsoluteFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'absolute', pathTarget: 'folder' });
export const RelativeFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'unknown', pathPosition: 'relative', pathTarget: 'folder' });
export const SymbolicRelativePath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'relative', pathTarget: 'unknown' });
export const RealRelativePath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'relative', pathTarget: 'unknown' });
export const SymbolicAbsolutePath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'absolute', pathTarget: 'unknown' });
export const RealAbsolutePath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'absolute', pathTarget: 'unknown' });
export const SymbolicFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'unknown', pathTarget: 'file' });
export const SymbolicFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'unknown', pathTarget: 'folder' });
export const RealFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'unknown', pathTarget: 'file' });
export const RealFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'unknown', pathTarget: 'folder' });
export const RealRelativeFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'relative', pathTarget: 'file' });
export const RealAbsoluteFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'absolute', pathTarget: 'file' });
export const RealAbsoluteFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'absolute', pathTarget: 'folder' });
export const RealRelativeFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'real', pathPosition: 'relative', pathTarget: 'folder' });
export const SymbolicAbsoluteFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'absolute', pathTarget: 'file' });
export const SymbolicAbsoluteFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'absolute', pathTarget: 'folder' });
export const SymbolicRelativeFilePath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'relative', pathTarget: 'file' });
export const SymbolicRelativeFolderPath = (path: string) =>
	GenericPath({ path, pathLink: 'symbolic', pathPosition: 'relative', pathTarget: 'folder' });

export interface ServiceInterface {
	/**
	 * Join all arguments together and normalize the resulting path.
	 *
	 */
	readonly joinSymbolicPaths: <
		P1 extends Exclude<PathPositionType, 'unknown'>,
		T3 extends Exclude<PathTargetType, 'unknown'>
	>(params: {
		readonly firstSegment: GenericPath<'symbolic', P1, 'folder'>;
		readonly middleSegments: ReadonlyArray<GenericPath<'symbolic', 'relative', 'folder'>>;
		readonly lastSegment: GenericPath<'symbolic', 'relative', T3>;
	}) => GenericPath<'symbolic', P1, T3>;

	/**
	 * Join all arguments together and normalize the resulting path.
	 *
	 */
	readonly joinRealPaths: <
		P1 extends Exclude<PathPositionType, 'unknown'>,
		T3 extends Exclude<PathTargetType, 'unknown'>
	>(params: {
		readonly firstSegment: GenericPath<'real', P1, 'folder'>;
		readonly middleSegments: ReadonlyArray<GenericPath<'real', 'relative', 'folder'>>;
		readonly lastSegment: GenericPath<'real', 'relative', T3>;
	}) => GenericPath<'real', P1, T3>;

	/**
	 * Join all arguments together and normalize the resulting path.
	 *
	 */
	readonly join: <
		P1 extends Exclude<PathPositionType, 'unknown'>,
		T3 extends Exclude<PathTargetType, 'unknown'>
	>(params: {
		readonly firstSegment: GenericPath<PathLinkType, P1, 'folder'>;
		readonly middleSegments: ReadonlyArray<GenericPath<PathLinkType, 'relative', 'folder'>>;
		readonly lastSegment: GenericPath<PathLinkType, 'relative', T3>;
	}) => GenericPath<'unknown', P1, T3>;

	/**
	 * If lastSegment isn't already absolute, previousSegments are prepended in right to left order,
	 * until an absolute path is found. If after using all previousSegments paths still no absolute path is found,
	 * the current working directory is used as well. The resulting path is normalized,
	 * and trailing slashes are removed unless the path gets resolved to the root directory.
	 */
	readonly resolve: <T2 extends Exclude<PathTargetType, 'unknown'>>(params: {
		readonly previousSegments: ReadonlyArray<GenericPath<PathLinkType, PathPositionType, 'folder'>>;
		readonly lastSegment: GenericPath<PathLinkType, PathPositionType, T2>;
	}) => GenericPath<'unknown', 'absolute', T2>;

	/**
	 * The underlying path is converted to an absolute path based on the current directory.
	 */
	readonly toAbsolutePath: <L extends PathLinkType, T extends PathTargetType>(
		path: GenericPath<L, Exclude<PathPositionType, 'absolute'>, T>
	) => GenericPath<L, 'absolute', T>;
	/**
	 * The underlying path is converted to a path relative to the current working directory .
	 */
	readonly toRelativePath: <L extends PathLinkType, T extends PathTargetType>(
		path: GenericPath<L, Exclude<PathPositionType, 'relative'>, T>
	) => GenericPath<L, 'relative', T>;
	/**
	 * The underlying path is converted to a fully resolved path.
	 */
	readonly toRealAbsolutePath: <T extends PathTargetType>(
		path: GenericPath<'real', Exclude<PathPositionType, 'absolute'>, T> | GenericPath<'symbolic', PathPositionType, T>
	) => Effect.Effect<never, PlatformError, GenericPath<'real', 'absolute', T>>;
	/**
	 * The underlying path is not modified. Fs stat is called and if the path is a file, the pathTarget field is updated accordingly.
	 */
	readonly toFilePath: <L extends PathLinkType, P extends PathPositionType>(
		folderPath: GenericPath<L, P, 'folder'>
	) => Effect.Effect<never, PlatformError, Option.Option<GenericPath<L, P, 'file'>>>;
	/**
	 * The underlying path is not modified. Fs stat is called and if the path is a folder, the pathTarget field is updated accordingly.
	 */
	readonly toFolderPath: <L extends PathLinkType, P extends PathPositionType>(
		filePath: GenericPath<L, P, 'file'>
	) => Effect.Effect<never, PlatformError, Option.Option<GenericPath<L, P, 'folder'>>>;
	/**
	 * Solves the relative path from {from} to {to}. If to or from is the zero-length string, the current working directory is used instead. At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve.
	 */
	readonly relativeSymbolicPaths: <T2 extends PathTargetType>(params: {
		from: GenericPath<'symbolic', PathPositionType, PathTargetType>;
		to: GenericPath<'symbolic', PathPositionType, T2>;
	}) => GenericPath<'symbolic', 'relative', T2>;

	/**
	 * Solves the relative path from {from} to {to}. If to or from is the zero-length string, the current working directory is used instead. At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve.
	 */
	readonly relativeRealPaths: <T2 extends PathTargetType>(params: {
		from: GenericPath<'real', PathPositionType, PathTargetType>;
		to: GenericPath<'real', PathPositionType, T2>;
	}) => GenericPath<'real', 'relative', T2>;

	/**
	 * Solves the relative path from {from} to {to}. If to or from is the zero-length string, the current working directory is used instead. At times we have two absolute paths, and we need to derive the relative path from one to the other. This is actually the reverse transform of path.resolve.
	 */
	readonly relative: <T2 extends PathTargetType>(params: {
		from: GenericPath<PathLinkType, PathPositionType, PathTargetType>;
		to: GenericPath<PathLinkType, PathPositionType, T2>;
	}) => GenericPath<'unknown', 'relative', T2>;

	/**
	 * Return all the segments of a path but the last.
	 */
	readonly dirname: <L extends PathLinkType, P extends PathPositionType>(
		path: GenericPath<L, P, PathTargetType>
	) => GenericPath<L, P, 'folder'>;

	/**
	 * Return the last segment of a path.
	 */
	readonly lastSegment: {
		(path: FilePath, suffix?: string): string;
		(path: FolderPath): string;
	};
	/**
	 * Return the extension of the path, from the last '.' to end of string in the last portion of the path.
	 * If there is no '.' in the last portion of the path or the first character of it is '.', then it returns an empty string.
	 */
	readonly extname: (path: FilePath) => string;
	/**
	 * Returns an object from a path string - the opposite of format().
	 *
	 */
	readonly parse: (path: Path) => ParsedPath;
	/**
	 * The platform-specific file separator. '\\' or '/'.
	 */
	readonly sep: string;
	readonly fromFileUrl: (url: URL) => Effect.Effect<never, BadArgument, RealAbsoluteFilePath>;
	readonly toFileUrl: (path: Path) => Effect.Effect<never, BadArgument, URL>;
}

export const Service = Context.Tag<ServiceInterface>(Symbol.for(moduleTag + 'Service'));

export const live = Layer.effect(
	Service,
	Effect.gen(function* (_) {
		const path = yield* _(PlatformNodePathService);
		const fs = yield* _(PlatformNodeFsService);

		const joinAnyPath =
			<L extends PathLinkType>(pathLink: L) =>
			<P1 extends Exclude<PathPositionType, 'unknown'>, T3 extends Exclude<PathTargetType, 'unknown'>>({
				firstSegment,
				middleSegments,
				lastSegment
			}: {
				readonly firstSegment: GenericPath<PathLinkType, P1, 'folder'>;
				readonly middleSegments: ReadonlyArray<GenericPath<PathLinkType, 'relative', 'folder'>>;
				readonly lastSegment: GenericPath<PathLinkType, 'relative', T3>;
			}) =>
				GenericPath({
					path: path.join(
						firstSegment.path,
						...pipe(
							middleSegments,
							ReadonlyArray.map((g) => g.path)
						),
						lastSegment.path
					),
					pathLink,
					pathPosition: firstSegment.pathPosition,
					pathTarget: lastSegment.pathTarget
				});

		const relativeAnyPath =
			<L extends PathLinkType>(pathLink: L) =>
			<T2 extends PathTargetType>({
				from,
				to
			}: {
				from: GenericPath<PathLinkType, PathPositionType, PathTargetType>;
				to: GenericPath<PathLinkType, PathPositionType, T2>;
			}) =>
				GenericPath({
					path: path.relative(from.path, to.path),
					pathLink,
					pathPosition: 'relative',
					pathTarget: to.pathTarget
				});

		return {
			joinSymbolicPaths: joinAnyPath('symbolic'),
			joinRealPaths: joinAnyPath('real'),
			join: joinAnyPath('unknown'),
			resolve: <T2 extends Exclude<PathTargetType, 'unknown'>>({
				previousSegments,
				lastSegment
			}: {
				readonly previousSegments: ReadonlyArray<GenericPath<PathLinkType, PathPositionType, 'folder'>>;
				readonly lastSegment: GenericPath<PathLinkType, PathPositionType, T2>;
			}) =>
				GenericPath({
					path: path.resolve(
						...pipe(
							previousSegments,
							ReadonlyArray.map((g) => g.path)
						),
						lastSegment.path
					),
					pathLink: 'unknown',
					pathPosition: 'absolute',
					pathTarget: lastSegment.pathTarget
				}),
			toAbsolutePath: <L extends PathLinkType, T extends PathTargetType>(
				p: GenericPath<L, Exclude<PathPositionType, 'absolute'>, T>
			) =>
				GenericPath({
					path: path.resolve(p.path),
					pathLink: p.pathLink,
					pathPosition: 'absolute',
					pathTarget: p.pathTarget
				}),
			toRelativePath: <L extends PathLinkType, T extends PathTargetType>(
				p: GenericPath<L, Exclude<PathPositionType, 'relative'>, T>
			) =>
				GenericPath({
					path: path.relative('', p.path),
					pathLink: p.pathLink,
					pathPosition: 'relative',
					pathTarget: p.pathTarget
				}),
			toRealAbsolutePath: <T extends PathTargetType>(
				p: GenericPath<'real', Exclude<PathPositionType, 'absolute'>, T> | GenericPath<'symbolic', PathPositionType, T>
			) =>
				pipe(
					fs.realPath(p.path),
					Effect.map((realPath) =>
						GenericPath({
							path: realPath,
							pathLink: 'real',
							pathPosition: 'absolute',
							pathTarget: p.pathTarget
						})
					)
				),
			toFilePath: <L extends PathLinkType, P extends PathPositionType>(folderPath: GenericPath<L, P, 'folder'>) =>
				pipe(
					folderPath.path,
					fs.stat,
					Effect.map((stat) =>
						stat.type === 'File'
							? Option.some(
									GenericPath({
										path: folderPath.path,
										pathLink: folderPath.pathLink,
										pathPosition: folderPath.pathPosition,
										pathTarget: 'file'
									})
							  )
							: Option.none()
					)
				),
			toFolderPath: <L extends PathLinkType, P extends PathPositionType>(filePath: GenericPath<L, P, 'file'>) =>
				pipe(
					filePath.path,
					fs.stat,
					Effect.map((stat) =>
						stat.type === 'Directory'
							? Option.some(
									GenericPath({
										path: filePath.path,
										pathLink: filePath.pathLink,
										pathPosition: filePath.pathPosition,
										pathTarget: 'folder'
									})
							  )
							: Option.none()
					)
				),
			relativeSymbolicPaths: relativeAnyPath('symbolic'),
			relativeRealPaths: relativeAnyPath('real'),
			relative: relativeAnyPath('unknown'),
			dirname: <L extends PathLinkType, P extends PathPositionType>(p: GenericPath<L, P, PathTargetType>) =>
				GenericPath({
					path: path.dirname(p.path),
					pathLink: p.pathLink,
					pathPosition: p.pathPosition,
					pathTarget: 'folder'
				}),
			lastSegment: (p, suffix?: string) => path.basename(p.path, suffix),
			extname: (p) => path.extname(p.path),
			parse: (p) => path.parse(p.path),
			sep: path.sep,
			fromFileUrl: (url) =>
				pipe(
					path.fromFileUrl(url),
					Effect.map((s) => RealAbsoluteFilePath(s))
				),
			toFileUrl: (p) => path.toFileUrl(p.path)
		};
	})
);
