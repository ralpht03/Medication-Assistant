import { NextResponse } from "next/server";
import { TableClient } from "@azure/data-tables";
import { Settings } from "@/lib/types";

const tableClient = TableClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!,
  "Settings"
);

interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
  language: string;
}

interface SettingsRequest {
  userId: string;
  preferences: UserPreferences;
}

export async function POST(request: Request) {
  try {
    const { userId, preferences }: SettingsRequest = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const settingsEntity = {
      partitionKey: "Settings",
      rowKey: `${Date.now()}_${userId}`,
      userId,
      notifications: JSON.stringify(preferences.notifications),
      timezone: preferences.timezone,
      language: preferences.language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create new settings entry
    await tableClient.createEntity(settingsEntity);

    return NextResponse.json({
      message: "Settings updated successfully",
      preferences
    });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Query the latest settings for the user
    const query = `userId eq '${userId}'`;
    let latestSettings: Settings | null = null;
    
    // Get all settings for the user and find the latest one
    for await (const setting of tableClient.listEntities<Settings>({
      queryOptions: { filter: query }
    })) {
      if (!latestSettings || setting.rowKey > latestSettings.rowKey) {
        latestSettings = setting;
      }
    }

    if (latestSettings) {
      const preferences: UserPreferences = {
        notifications: JSON.parse(latestSettings.notifications),
        timezone: latestSettings.timezone,
        language: latestSettings.language
      };

      return NextResponse.json({ preferences });
    }

    // If no settings exist, create default settings
    const defaultPreferences: UserPreferences = {
      notifications: {
        email: true,
        push: true,
        sms: false,
      },
      timezone: "America/New_York",
      language: "en",
    };

    const defaultSettings = {
      partitionKey: "Settings",
      rowKey: `${Date.now()}_${userId}`,
      userId,
      notifications: JSON.stringify(defaultPreferences.notifications),
      timezone: defaultPreferences.timezone,
      language: defaultPreferences.language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await tableClient.createEntity(defaultSettings);

    return NextResponse.json({ preferences: defaultPreferences });
  } catch (error) {
    console.error("Settings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
