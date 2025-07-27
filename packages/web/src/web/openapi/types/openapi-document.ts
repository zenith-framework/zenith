export interface OpenApiDocument {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    paths: Record<string, OpenApiPath>;
    components?: {
        schemas: Record<string, any>;
        responses?: Record<string, any>;
    };
}

export interface OpenApiPath {
    get?: OpenApiOperation;
    post?: OpenApiOperation;
    put?: OpenApiOperation;
    delete?: OpenApiOperation;
}

export interface OpenApiOperation {
    summary: string;
    description: string;
    requestBody?: OpenApiRequestBody;
    responses: Record<string, OpenApiResponse>;
    parameters?: OpenApiParameter[];
}

export interface OpenApiRequestBody {
    content: Record<string, OpenApiMediaType>;
}

export interface OpenApiMediaType {
    schema: any;
}

export interface OpenApiResponse {
    description?: string;
    content: Record<string, OpenApiMediaType>;
}

export interface OpenApiParameter {
    name: string;
    in: 'query' | 'path' | 'header' | 'cookie';
    required: boolean;
    schema: any;
}