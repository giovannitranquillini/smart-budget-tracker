import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { sendMessage } from "@core/messaging/amqp.js";
import logger from "@core/lib/logger.js";

// Temporary storage shared with the AI group: the OCR worker
// reads the file from the path published on the queue.
const IMAGE_STORAGE_PATH = path.resolve(
    process.env.IMAGE_STORAGE_PATH || path.join(process.cwd(), "..", "image_files")
);

const IMAGE_PROCESSING_QUEUE = "image.processing";

/**
 * ImageService is a collection of function handling all the image processing related tasks.
 *
 * - It stores image files in a temporary location.
 * - It sends messages to a RabbitMQ queue to request OCR of the image files.
 */
export const ImageService = () => {

    /**
     * Stores an image file and returns its path and ID.
     *
     * @param params.filename The name of the image file.
     * @param params.content The content of the image file as a Buffer.
     *
     * @returns An object containing the file path and a unique image ID.
     */
    async function storeImage(params: { filename: string; content: Buffer }): Promise<{ filePath: string; imageId: string }> {
        logger.info(`[ImageService] Storing image file.`);

        await mkdir(IMAGE_STORAGE_PATH, { recursive: true });

        const extension = path.extname(params.filename) || ".jpg";
        const imageId = randomUUID();
        const filePath = path.join(IMAGE_STORAGE_PATH, `${imageId}${extension}`);

        await writeFile(filePath, params.content);

        logger.info(`[ImageService] Image file stored at ${filePath}.`);

        return {filePath, imageId};
    }

    /**
     * Requests image processing of an image file.
     * It sends a message to the RabbitMQ queue with the job ID and file path.
     *
     * @param jobId The ID of the job for which to request image processing.
     * @param filePath The path to the image file to be analyzed.
     */
    async function requestOcr(jobId: string, filePath: string) {
        logger.info(`[ImageService] Publishing ${filePath} to queue "${IMAGE_PROCESSING_QUEUE}".`);
        sendMessage(IMAGE_PROCESSING_QUEUE, JSON.stringify({ jobId: jobId, filePath: filePath }));
    }

    return {
        storeImage,
        requestOcr
    }
}
