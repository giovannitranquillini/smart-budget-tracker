export const CreateBudgetCategoryInput = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string', minLength: 1, pattern: '\\S' } // at least one non-blank character
        },
        required: ['name']
    },
    response: {
        201: {},
        409: {
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
            amount: { type: 'integer', minimum: 1 },
            type: { type: 'string', enum: ['income', 'outcome'] },
            description: { type: 'string' },
            categoryId: { type: 'string' }
        },
        required: ['amount', 'type', 'description', 'categoryId']
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

export const DeleteBudgetRecordInput = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        204: {},
        404: {
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

export const DeleteBudgetCategoryInput = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'string' }
        },
        required: ['id']
    },
    response: {
        204: {},
        404: {
            type: 'object',
            properties: {
                error: { type: 'string' }
            }
        },
        409: {
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
