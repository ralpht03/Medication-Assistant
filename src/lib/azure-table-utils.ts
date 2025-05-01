import { TableClient, TableEntity } from "@azure/data-tables";


/**
 * Creates a TableClient for interacting with Azure Table Storage
 * Lazily loads the actual client to avoid process.env access during build.
 * @param tableName The name of the Azure Storage Table
 * @returns A proxy TableClient that initializes only when first used
 */
export const createTableClient = (tableName: string): TableClient => {
  let client: TableClient | null = null;

  return new Proxy({} as TableClient, {
    get(_, prop: keyof TableClient) {
      if (!client) {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
          throw new Error('Azure Storage connection string must be provided in the environment variables.');
        }
        try {
          client = TableClient.fromConnectionString(connectionString, tableName);
        } catch (error) {
          console.error(`Error initializing TableClient for ${tableName}:`, error);
          throw new Error(`Failed to initialize Azure Table Storage client for ${tableName}`);
        }
      }
      // @ts-ignore: we're dynamically delegating to the real client
      return client[prop];
    }
  });
};

/**
 * Helper function to handle API calls with error handling
 * @param apiFunction The async function to execute
 * @param errorMessage Optional custom error message
 * @returns Result of the API call
 */
export const callApi = async <T>(
  apiFunction: () => Promise<T>, 
  errorMessage: string = 'API call failed'
): Promise<T> => {
  try {
    return await apiFunction();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    throw new Error(`${errorMessage}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parse JSON string from Azure Table Storage
 * @param jsonString The JSON string to parse
 * @param defaultValue Default value to return if parsing fails
 * @returns Parsed object or default value
 */
export const parseJsonField = <T>(jsonString: string | undefined | null, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON from Azure Tables:', error);
    return defaultValue;
  }
};

/**
 * Creates a table if it doesn't already exist
 * @param tableName The name of the table to create
 * @returns Promise that resolves when the table is created
 */
export const ensureTableExists = async (tableName: string): Promise<void> => {
  const tableClient = createTableClient(tableName);
  
  try {
    await tableClient.createTable();
    console.log(`Table ${tableName} created successfully`);
  } catch (error: any) {
    // Error code 409 means the table already exists
    if (error.statusCode === 409) {
      console.log(`Table ${tableName} already exists`);
    } else {
      throw error;
    }
  }
};

/**
 * Class for simplified interactions with Azure Tables
 */
export class AzureTableService {
  private tableClient: TableClient;
  
  /**
   * Creates a new AzureTableService instance
   * @param tableName The name of the Azure Table
   */
  constructor(tableName: string) {
    this.tableClient = createTableClient(tableName);
  }
  
  /**
   * Gets an entity by partition key and row key
   * @param partitionKey Partition key
   * @param rowKey Row key
   * @returns The entity or null if not found
   */
  async getEntity<T extends object>(partitionKey: string, rowKey: string): Promise<T | null> {
    try {
      return await this.tableClient.getEntity<T>(partitionKey, rowKey);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Creates a new entity in the table
   * @param entity The entity to create
   * @returns The created entity
   */
  async createEntity<T extends TableEntity<object>>(entity: T): Promise<T> {
    await this.tableClient.createEntity(entity);
    return entity;
  }
  
  /**
   * Updates an entity in the table
   * @param entity The entity to update
   * @returns The updated entity
   */
  async updateEntity<T extends TableEntity<object>>(entity: T): Promise<T> {
    await this.tableClient.updateEntity(entity, "Merge");
    return entity;
  }
  
  /**
   * Deletes an entity from the table
   * @param partitionKey Partition key
   * @param rowKey Row key
   * @returns True if deleted, false if not found
   */
  async deleteEntity(partitionKey: string, rowKey: string): Promise<boolean> {
    try {
      await this.tableClient.deleteEntity(partitionKey, rowKey);
      return true;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
  
  /**
   * Queries entities from the table
   * @param filter OData filter string
   * @returns Array of entities
   */
  async queryEntities<T extends object>(filter: string): Promise<T[]> {
    const entities: T[] = [];
    const queryOptions = { filter };
    
    const queryResult = this.tableClient.listEntities<T>({ queryOptions });
    
    for await (const entity of queryResult) {
      entities.push(entity as T);
    }
    
    return entities;
  }
  
  /**
   * Gets the raw table client for direct operations
   * @returns TableClient instance
   */
  getTableClient(): TableClient {
    return this.tableClient;
  }
}