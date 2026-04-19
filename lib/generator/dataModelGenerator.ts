import type { ProductSpec } from './specGenerator';

export type DataModelGeneratorInput = {
  spec: ProductSpec;
};

export type DataField = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required: boolean;
};

export type EntityModel = {
  entityName: string;
  fields: DataField[];
};

export type DataModelGeneratorOutput = {
  entities: EntityModel[];
};

export function generateDataModel(input: DataModelGeneratorInput): DataModelGeneratorOutput {
  if (!input || !input.spec) {
    throw new Error('generateDataModel requires spec.');
  }

  return {
    entities: [
      {
        entityName: 'User',
        fields: [
          { name: 'id', type: 'string', required: true },
          { name: 'createdAt', type: 'date', required: true },
        ],
      },
    ],
  };
}
