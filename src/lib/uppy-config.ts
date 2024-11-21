import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { Session } from "@supabase/supabase-js";
export function setupUppy(
    allowMultiple: boolean,
    session: Session | null,
) {
    return new Uppy({
        restrictions: {
            maxFileSize: 10 * 1024 * 1024,
            maxNumberOfFiles: allowMultiple ? 10 : 1,
            allowedFileTypes: ["image/*"],
        },
        autoProceed: true,
    }).use(Tus, {
        endpoint:
            `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/upload/resumable`,
        headers: {
            authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        uploadDataDuringCreation: true,
        chunkSize: 6 * 1024 * 1024,
        allowedMetaFields: [
            "bucketName",
            "objectName",
            "contentType",
            "cacheControl",
        ],
    });
}
