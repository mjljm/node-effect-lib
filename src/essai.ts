const TypeId: unique symbol = Symbol.for(moduleTag + 'TypeId');
type TypeId = typeof TypeId;

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

// All negative possible paths types
export type not
