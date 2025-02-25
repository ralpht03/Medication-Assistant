// src/lib/azure/table-service.ts
import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";

export class AzureTableService {
  private tableClient: TableClient;

  constructor(tableName: string) {
    const credential = new AzureNamedKeyCredential(
      process.env.AZURE_STORAGE_ACCOUNT!,
      process.env.AZURE_STORAGE_ACCOUNT_KEY!
    );
    
    this.tableClient = new TableClient(
      `https://${process.env.AZURE_STORAGE_ACCOUNT}.table.core.windows.net`,
      tableName,
      credential
    );
  }

  async createEntity(entity: any) {
    return await this.tableClient.createEntity(entity);
  }

  async getEntity(partitionKey: string, rowKey: string) {
    return await this.tableClient.getEntity(partitionKey, rowKey);
  }

  async queryEntities(query: string) {
    const entities = [];
    const iterator = this.tableClient.listEntities({
      queryOptions: { filter: query }
    });
    for await (const entity of iterator) {
      entities.push(entity);
    }
    return entities;
  }

  async updateEntity(entity: any, mode: "Merge" | "Replace" = "Merge") {
    return await this.tableClient.updateEntity(entity, mode);
  }

  async deleteEntity(partitionKey: string, rowKey: string) {
    return await this.tableClient.deleteEntity(partitionKey, rowKey);
  }
}