import {
    useDirectory,
    useFileUrl,
    useRemoveFiles,
    useUpload,
} from "@supabase-cache-helpers/storage-react-query";
import { supabase } from "src/lib/supabase";
import { FileObject } from "@supabase/storage-js";

// Define the privacy enum if not exported by the package
enum StoragePrivacy {
    PUBLIC = "public",
    PRIVATE = "private",
}

/**
 * Hook for storage-related operations using Supabase Cache Helpers
 */
export const useStorage = () => {
    /**
     * Get a download URL for a file in storage
     */
    const getFileUrl = (
        bucket: string,
        path: string,
        options?: { enabled?: boolean; expiresIn?: number },
    ) => {
        return useFileUrl(
            supabase.storage.from(bucket),
            path,
            StoragePrivacy.PUBLIC,
            {
                enabled: options?.enabled !== false,
                // URL expires in 1 hour by default
                expiresIn: options?.expiresIn || 60 * 60,
                staleTime: 60 * 60 * 1000, // 1 hour
            },
        );
    };

    /**
     * Upload files to storage
     */
    const uploadFiles = (bucket: string) => {
        return useUpload(supabase.storage.from(bucket));
    };

    /**
     * Remove files from storage
     */
    const removeFiles = (bucket: string) => {
        return useRemoveFiles(supabase.storage.from(bucket));
    };

    /**
     * List contents of a bucket or folder
     */
    const listFiles = (
        bucket: string,
        path: string = "",
        options?: { enabled?: boolean },
    ) => {
        return useDirectory(
            supabase.storage.from(bucket),
            path,
            {
                enabled: options?.enabled !== false,
                staleTime: 60 * 1000, // 1 minute
            },
        );
    };

    return {
        getFileUrl,
        uploadFiles,
        removeFiles,
        listFiles,
    };
};
