import { TableClient, odata } from "@azure/data-tables";

export class AzureTableService {
  private tableClient: TableClient | null = null;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
    // Delay initialization until needed
  }

  private ensureClient() {
    if (this.tableClient) return;

    const connString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not defined');
    }

    try {
      this.tableClient = TableClient.fromConnectionString(connString, this.tableName);
    } catch (error) {
      console.error('Error initializing Azure Table Service:', error);
      throw new Error(`Failed to initialize Azure Table Service for table '${this.tableName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createEntity(entity: any) {
    this.ensureClient();
    return await this.tableClient!.createEntity(entity);
  }

  async getEntity(partitionKey: string, rowKey: string) {
    this.ensureClient();
    try {
      return await this.tableClient!.getEntity(partitionKey, rowKey);
    } catch (error) {
      console.error('Error getting entity:', error);
      return null;
    }
  }

  async queryEntities<T extends object>(query: string | ReturnType<typeof odata>): Promise<T[]> {
    this.ensureClient();
    try {
      console.log('Executing query:', query);
      const entities: T[] = [];
      const iterator = this.tableClient!.listEntities<T>({
        queryOptions: { filter: typeof query === 'string' ? query : String(query) }
      });

      for await (const entity of iterator) {
        entities.push(entity);
      }

      return entities;
    } catch (error) {
      console.error('Error querying entities:', error);
      return [];
    }
  }

  async updateEntity(entity: any, mode: "Merge" | "Replace" = "Merge") {
    this.ensureClient();
    return await this.tableClient!.updateEntity(entity, mode);
  }

  async deleteEntity(partitionKey: string, rowKey: string) {
    this.ensureClient();
    return await this.tableClient!.deleteEntity(partitionKey, rowKey);
  }
}
