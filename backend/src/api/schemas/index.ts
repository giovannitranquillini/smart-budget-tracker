export const CreateBudgetCategoryInput = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    },
    response: {
        201: {},
        500: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        }
    }
};

export const CreateBudgetRecordFromAudioInput = {
    // No body schema: the file is consumed as a stream via request.file(), so
    // request.body stays undefined and any JSON body validation would reject
    // every upload before the handler runs. The handler checks for the file.
    consumes: ['multipart/form-data'],
    response: {
        202: {
            type: 'object',
            properties: {
                jobId: { type: 'string' }
            }
        },
        400: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        },
        500: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        }
    }
};

export const CreateBudgetRecordInput = {
    body: {
        type: 'object',
        properties: {
            amount: { type: 'number' },
            description: { type: 'string' },
            categoryId: { type: 'string' }
        },
        required: ['amount', 'description', 'categoryId']
    },
    response: {
        201: {},
        500: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        }
    }
};