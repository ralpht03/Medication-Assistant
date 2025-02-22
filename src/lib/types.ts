export interface Medication {
  partitionKey: string; // The partition key for the entity, used for grouping entities together (e.g., patientId)
  rowKey: string; // The row key for the entity, used for uniquely identifying the entity within the partition
  name: string; // Name of the medication
  dosage: string; // Dosage of the medication
  frequency: string; // Frequency of the medication
  time: string; // Time of day to take the medication
  instructions?: string; // Special instructions for taking the medication (optional)
}