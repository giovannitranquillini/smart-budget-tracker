export const CreateBudgetCategoryInput = {
    body: {
        type: 'object',
        properties: {
            name: { type: 'string' }
        },
        required: ['name']
    },
    response: {
        201: {}
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
        201: {}
    }
};