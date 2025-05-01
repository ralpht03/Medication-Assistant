// src/lib/azure/table-service.ts
import { TableClient, AzureNamedKeyCredential, odata } from "@azure/data-tables";

export class AzureTableService {
  private tableClient: TableClient | null = null;
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  private ensureClient() {
    if (!this.tableClient) {
      const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connStr) {
        throw new Error("Azure Storage connection string must be provided in the environment variables.");
      }
      this.tableClient = TableClient.fromConnectionString(connStr, this.tableName);
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
