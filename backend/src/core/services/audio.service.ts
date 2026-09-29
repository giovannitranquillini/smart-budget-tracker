import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { sendMessage } from "@core/messaging/amqp.js";
import logger from "@core/lib/logger.js";

// Temporary storage shared with the AI group: the speech-to-text worker
// reads the file from the path published on the queue.
const AUDIO_STORAGE_PATH = path.resolve(
    process.env.AUDIO_STORAGE_PATH || path.join(process.cwd(), "..", "audio_files")
);

const AUDIO_PROCESSING_QUEUE = "audio_processing_queue";

/**
 * AudioService is a collection of function handling all the audio processing related tasks.
 * 
 * - It stores audio files in a temporary location.
 * - It sends messages to a RabbitMQ queue to request transcription of the audio files.
 */
export const AudioService = () => {

    /**
     * Stores an audio file and returns its path and ID.
     * 
     * @param params.filename The name of the audio file.
     * @param params.content The content of the audio file as a Buffer.
     * 
     * @returns An object containing the file path and a unique audio ID.
     */
    async function storeAudio(params: { filename: string; content: Buffer }): Promise<{ filePath: string; audioId: string }> {
        logger.info(`[AudioService] Storing audio file.`);

        await mkdir(AUDIO_STORAGE_PATH, { recursive: true });

        const extension = path.extname(params.filename) || ".webm";
        const audioId = randomUUID();
        const filePath = path.join(AUDIO_STORAGE_PATH, `${audioId}${extension}`);

        await writeFile(filePath, params.content);

        logger.info(`[AudioService] Audio file stored at ${filePath}.`);

        return {filePath, audioId};
    }

    /**
     * Requests transcription of an audio file. 
     * It sends a message to the RabbitMQ queue with the job ID and file path.
     * 
     * @param jobId The ID of the job for which to request transcription.
     * @param filePath The path to the audio file to be transcribed.
     */
    async function requestTranscription(jobId: string, filePath: string) {
        logger.info(`[AudioService] Publishing ${filePath} to queue "${AUDIO_PROCESSING_QUEUE}".`);
        sendMessage(AUDIO_PROCESSING_QUEUE, JSON.stringify({ jobId: jobId, filePath: filePath }));
    }

    return {
        storeAudio,
        requestTranscription
    }
}
