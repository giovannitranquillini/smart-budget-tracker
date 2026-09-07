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
    consumes: ['multipart/form-data'],
    body: {
        type: 'object',
        properties: {
            audio: { type: 'string', format: 'binary' }
        },
        required: ['audio']
    },
    response: {
        202: {
            type: 'object',
            properties: {
                status: { type: 'string' }
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