import "server-only";

import type { Appointment, Client, Tenant } from "@/server/models";

export type GoogleTokens = {
  accessToken?: string | null;
  refreshToken?: string | null;
  accessTokenExpiresAt?: Date | null;
};

export type RefreshedGoogleTokens = {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: Date;
};

export class GoogleCalendarNotConfiguredError extends Error {
  constructor(message = "Google Calendar is not configured for this user") {
    super(message);
    this.name = "GoogleCalendarNotConfiguredError";
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function hasUsableAccessToken(tokens: GoogleTokens): tokens is GoogleTokens & {
  accessToken: string;
  accessTokenExpiresAt: Date;
} {
  if (!tokens.accessToken || !tokens.accessTokenExpiresAt) {
    return false;
  }

  return tokens.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<RefreshedGoogleTokens> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to refresh Google access token");
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    refresh_token?: string;
  };

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    accessTokenExpiresAt: new Date(
      Date.now() + (payload.expires_in ?? 3600) * 1000,
    ),
  };
}

export async function resolveGoogleAccessToken(
  tokens: GoogleTokens,
): Promise<RefreshedGoogleTokens | null> {
  if (hasUsableAccessToken(tokens)) {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? undefined,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    };
  }

  if (!tokens.refreshToken) {
    return null;
  }

  return refreshGoogleAccessToken(tokens.refreshToken);
}

function toCalendarEvent(
  appointment: Appointment,
  tenant: Tenant,
  client: Client,
) {
  return {
    summary: appointment.title,
    description: [
      `Clinic: ${tenant.name}`,
      `Client: ${client.name}`,
      appointment.notes ? `Notes: ${appointment.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    start: {
      dateTime: appointment.startsAt.toISOString(),
      timeZone: appointment.timezone,
    },
    end: {
      dateTime: appointment.endsAt.toISOString(),
      timeZone: appointment.timezone,
    },
  };
}

async function calendarRequest<TResponse>(
  accessToken: string,
  path: string,
  init: RequestInit,
): Promise<TResponse> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Google Calendar request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  appointment: Appointment,
  tenant: Tenant,
  client: Client,
): Promise<string> {
  const event = await calendarRequest<{ id: string }>(
    accessToken,
    "/calendars/primary/events",
    {
      method: "POST",
      body: JSON.stringify(toCalendarEvent(appointment, tenant, client)),
    },
  );

  return event.id;
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  calendarEventId: string,
  appointment: Appointment,
  tenant: Tenant,
  client: Client,
): Promise<void> {
  await calendarRequest(
    accessToken,
    `/calendars/primary/events/${encodeURIComponent(calendarEventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(toCalendarEvent(appointment, tenant, client)),
    },
  );
}

export async function cancelGoogleCalendarEvent(
  accessToken: string,
  calendarEventId: string,
): Promise<void> {
  await calendarRequest(
    accessToken,
    `/calendars/primary/events/${encodeURIComponent(calendarEventId)}`,
    {
      method: "DELETE",
    },
  );
}
