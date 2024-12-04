import {
    useDeleteManyMutation,
    useInsertMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import {
    useRemoveFiles,
    useUpload,
} from "@supabase-cache-helpers/storage-react-query";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";

interface FileOperationsOptions {
    folder: "rules" | "examples";
    bucketName: string;
    userId: string;
    gameId: string;
    gameName: string;
}

interface FileUploadResult {
    imagePath: string;
    error?: Error;
}

interface StorageResult {
    error?: {
        message: string;
    };
}

interface UploadingFiles {
    [fileName: string]: boolean;
}

interface DeletingFiles {
    [filePath: string]: boolean;
}

export function useGameImageOperations(
    { folder, bucketName, userId, gameId, gameName }: FileOperationsOptions,
) {
    const [uploadingFiles, setUploadingFiles] = useState<UploadingFiles>({});
    const [deletingFiles, setDeletingFiles] = useState<DeletingFiles>({});

    const { mutateAsync: upload } = useUpload(
        supabase.storage.from(bucketName),
        {
            buildFileName: ({ fileName, path }) => `${path}/${fileName}`,
        },
    );

    const { mutateAsync: remove } = useRemoveFiles(
        supabase.storage.from(bucketName),
    );

    // Database mutation for rules_images
    const rulesImagesMutation = useInsertMutation(
        supabase.from("rules_images"),
        ["id"],
        "id, image_path",
        {
            onError: (error: Error) => {
                console.error("Error inserting rules images:", error);
            },
            revalidateTables: [
                {
                    table: "games",
                },
            ],
        },
    );

    // Database mutation for example_images
    const exampleImagesMutation = useInsertMutation(
        supabase.from("example_images"),
        ["id"],
        "id, image_path",
        {
            onError: (error: Error) => {
                console.error("Error inserting example images:", error);
            },
            revalidateTables: [
                {
                    table: "games",
                },
            ],
        },
    );

    // Add delete mutations for database
    const rulesImagesDeleteMutation = useDeleteManyMutation(
        supabase.from("rules_images"),
        ["id"],
        "id",
        {
            onError: (error: Error) => {
                console.error("Error deleting rules images:", error);
            },
        },
    );

    const exampleImagesDeleteMutation = useDeleteManyMutation(
        supabase.from("example_images"),
        ["id"],
        "id",
        {
            onError: (error: Error) => {
                console.error("Error deleting example images:", error);
            },
        },
    );

    const generateFileName = (extension: string) => {
        const uniqueId = uuidv4();
        const timestamp = Date.now();
        const safeFolderName = folder.toLowerCase();
        return `${safeFolderName}_${timestamp}_${uniqueId}.${extension}`;
    };

    const generateObjectPath = (fileName: string) => {
        const safeGameName = gameName.toLowerCase().replace(/[^a-z0-9]/g, "-");
        return `user.${userId}/game.${safeGameName}.${gameId}/${folder}/${fileName}`;
    };

    const uploadToStorage = async (
        files: File[],
    ): Promise<FileUploadResult[]> => {
        try {
            const filesWithPaths = files.map((f) => {
                const extension = f.name.split(".").pop() || "jpg";
                const fileName = generateFileName(extension);
                const objectPath = generateObjectPath(fileName);

                console.log("fileName", fileName);

                const renamedFile = new File([f], fileName, {
                    type: f.type,
                });

                return {
                    file: renamedFile,
                    objectPath,
                    fileName,
                };
            });

            const safeGameName = gameName.toLowerCase().replace(
                /[^a-z0-9]/g,
                "-",
            );

            console.log("filesWithPaths", filesWithPaths);
            const results = await upload({
                files: filesWithPaths.map((f) => f.file),
                path: `user.${userId}/game.${safeGameName}.${gameId}/${folder}`,
            });

            return results.map((result, index) => ({
                imagePath: filesWithPaths[index].objectPath,
                error: result.error
                    ? new Error(result.error.message)
                    : undefined,
            }));
        } catch (error) {
            return files.map(() => ({
                imagePath: "",
                error: error instanceof Error
                    ? error
                    : new Error("Unknown upload error"),
            }));
        }
    };

    const addFiles = async (
        files: Array<File>,
    ) => {
        // Set uploading state for each file
        const newUploadingFiles = files.reduce((acc, file) => {
            acc[file.name] = true;
            return acc;
        }, {} as UploadingFiles);
        setUploadingFiles(newUploadingFiles);

        try {
            const uploadResults = await uploadToStorage(files);

            const successfulUploads = uploadResults.filter((result) =>
                !result.error
            );

            if (successfulUploads.length === 0) {
                throw new Error("No files were successfully uploaded");
            }

            // Insert into database with appropriate mutation
            let data;
            if (folder === "rules") {
                const dbRecords = successfulUploads.map((
                    { imagePath },
                    index,
                ) => ({
                    game_id: gameId,
                    image_path: imagePath,
                    display_order: index,
                }));
                data = await rulesImagesMutation.mutateAsync(dbRecords);
            } else {
                const dbRecords = successfulUploads.map((
                    { imagePath },
                ) => ({
                    game_id: gameId,
                    image_path: imagePath,
                }));
                data = await exampleImagesMutation.mutateAsync(dbRecords);
            }

            return {
                data,
                failedUploads: uploadResults.filter((result) => result.error),
            };
        } finally {
            // Clear uploading state
            setUploadingFiles({});
        }
    };

    const deleteFiles = async (filePaths: string[], imageIds: string[]) => {
        // Set deleting state for each file path
        const newDeletingFiles = filePaths.reduce((acc, path) => {
            acc[path] = true;
            return acc;
        }, {} as DeletingFiles);
        setDeletingFiles(newDeletingFiles);

        try {
            console.log("imageIds", imageIds);

            // Delete from storage
            const storageResults = (await remove(
                filePaths.map((path) => path),
            )) as StorageResult[];

            const successfulDeletes = storageResults.filter((result) =>
                !result.error
            );

            if (successfulDeletes.length === 0) {
                throw new Error("No files were successfully deleted");
            }

            // Delete from database
            const mutation = folder === "rules"
                ? rulesImagesDeleteMutation
                : exampleImagesDeleteMutation;

            await mutation.mutateAsync(
                imageIds.map((id) => ({ id })),
            );

            return {
                failedDeletes: [],
            };
        } finally {
            // Clear deleting state
            setDeletingFiles({});
        }
    };

    return {
        addFiles,
        deleteFiles,
        isUploading: Object.keys(uploadingFiles).length > 0,
        isDeleting: Object.keys(deletingFiles).length > 0,
        uploadingFiles,
        deletingFiles,
        isError: rulesImagesMutation.isError || exampleImagesMutation.isError ||
            rulesImagesDeleteMutation.isError ||
            exampleImagesDeleteMutation.isError,
        error: rulesImagesMutation.error || exampleImagesMutation.error ||
            rulesImagesDeleteMutation.error ||
            exampleImagesDeleteMutation.error,
    };
}
