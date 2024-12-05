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
interface ImageItem {
    id: string;
    imagePath: string;
    status: "uploading" | "deleting" | "complete" | "error";
    previewUrl?: string;
    error?: Error;
}
interface FileOperationsOptions {
    folder: "rules" | "examples";
    bucketName: string;
    userId: string;
    gameId: string;
    gameName: string;
    initialImages?: ImageItem[];
}

interface FileUploadResult {
    imagePath: string;
    error?: Error;
}

export function useGameImageOperations(
    { folder, bucketName, userId, gameId, gameName, initialImages }:
        FileOperationsOptions,
) {
    const [images, setImages] = useState<ImageItem[]>(initialImages || []);

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

            // Add artificial delay for testing
            await new Promise((resolve) => setTimeout(resolve, 3000));
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
        // Create temporary entries for uploading files
        const uploadingImages = files.map((file) => ({
            id: uuidv4(),
            imagePath: "",
            status: "uploading" as const,
            previewUrl: URL.createObjectURL(file),
        }));

        setImages((prev) => [...prev, ...uploadingImages]);

        try {
            const uploadResults = await uploadToStorage(files);
            const successfulUploads = uploadResults.filter((result) =>
                !result.error
            );

            if (successfulUploads.length === 0) {
                throw new Error("No files were successfully uploaded");
            }

            let data;

            if (folder === "rules") {
                // Insert into database
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

            // Update images with completed status
            setImages((prev) => {
                const newImages = [...prev];
                uploadingImages.forEach((uploadingImage, index) => {
                    const result = uploadResults[index];
                    const imageIndex = newImages.findIndex((img) =>
                        img.id === uploadingImage.id
                    );

                    if (imageIndex !== -1) {
                        newImages[imageIndex] = {
                            ...uploadingImage,
                            id: data?.[index].id, // Use the DB-generated ID
                            imagePath: result.imagePath,
                            status: result.error ? "error" : "complete",
                            error: result.error,
                        };
                    }
                });
                return newImages;
            });

            return {
                data,
                failedUploads: uploadResults.filter((result) => result.error),
            };
        } catch (error) {
            // Mark failed uploads
            setImages((prev) =>
                prev.map((img) =>
                    uploadingImages.some((u) => u.id === img.id)
                        ? { ...img, status: "error", error: error as Error }
                        : img
                )
            );
            throw error;
        }
    };

    const deleteFiles = async (filePaths: string[], imageIds: string[]) => {
        // Mark images as deleting
        setImages((prev) =>
            prev.map((img) =>
                imageIds.includes(img.id) ? { ...img, status: "deleting" } : img
            )
        );

        try {
            const storageResults = await remove(filePaths);

            if (storageResults.length === 0) {
                throw new Error("No files were successfully deleted");
            }

            const mutation = folder === "rules"
                ? rulesImagesDeleteMutation
                : exampleImagesDeleteMutation;

            await mutation.mutateAsync(imageIds.map((id) => ({ id })));

            // Remove deleted images from state
            setImages((prev) =>
                prev.filter((img) => !imageIds.includes(img.id))
            );
        } catch (error) {
            // Revert status on error
            setImages((prev) =>
                prev.map((img) =>
                    imageIds.includes(img.id)
                        ? { ...img, status: "error", error: error as Error }
                        : img
                )
            );
            throw error;
        }
    };

    return {
        images,
        addFiles,
        deleteFiles,
    };
}
