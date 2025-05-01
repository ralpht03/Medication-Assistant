// src/lib/azure/table-service.ts
import { TableClient, AzureNamedKeyCredential, odata } from "@azure/data-tables";

export class AzureTableService {
  private tableClient: TableClient;

  constructor(tableName: string) {
    // Check for required environment variable
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not defined');
    }
    
    try {
      // Use the connection string directly
      this.tableClient = TableClient.fromConnectionString(
        process.env.AZURE_STORAGE_CONNECTION_STRING,
        tableName
      );
    } catch (error) {
      console.error('Error initializing Azure Table Service:', error);
      throw new Error(`Failed to initialize Azure Table Service for table '${tableName}': ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createEntity(entity: any) {
    return await this.tableClient.createEntity(entity);
  }

  async getEntity(partitionKey: string, rowKey: string) {
    try {
      return await this.tableClient.getEntity(partitionKey, rowKey);
    } catch (error) {
      console.error('Error getting entity:', error);
      return null;
    }
  }

  async queryEntities<T extends object>(query: string | ReturnType<typeof odata>): Promise<T[]> {
    try {
      console.log('Executing query:', query);
      const entities: T[] = [];
      const iterator = this.tableClient.listEntities<T>({
        queryOptions: { filter: typeof query === 'string' ? query : String(query) }
      });
      
      for await (const entity of iterator) {
        entities.push(entity);
      }
      
      console.log(`Found ${entities.length} entities for query:`, query);
      return entities;
    } catch (error) {
      console.error('Error querying entities:', error);
      return [];
    }
  }

  async updateEntity(entity: any, mode: "Merge" | "Replace" = "Merge") {
    return await this.tableClient.updateEntity(entity, mode);
  }

  async deleteEntity(partitionKey: string, rowKey: string) {
    return await this.tableClient.deleteEntity(partitionKey, rowKey);
  }
}