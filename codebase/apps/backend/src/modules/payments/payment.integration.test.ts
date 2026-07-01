import { fileURLToPath } from "node:url";
import { runner } from "node-pg-migrate";
import { Client } from "pg";
import pino from "pino";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../../app/createApp.js";
import { parseEnvironment, type Environment } from "../../app/config/environment.js";
import { createDatabase, type Database } from "../../shared/database/database.js";

const baseEnvironment = parseEnvironment(process.env);
let database: Database;
let environment: Environment;
let adminClient: Client;

interface AuthBody {
  data: { accessToken: string; user: { id: string } };
}

interface PaymentBody {
  data: {
    appReportedStatus: string;
    id: string;
    upiUri: string;
    verificationStatus: string;
  };
}

function databaseUrl(baseUrl: string, name: string) {
  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

describe("Direct UPI payment workflow", () => {
  beforeAll(async () => {
    const name = `nidhiflow_upi_${Date.now()}`;
    const adminUrl = new URL(baseEnvironment.DATABASE_URL);
    adminUrl.pathname = "/postgres";
    adminClient = new Client({
      connectionString: adminUrl.toString(),
      ssl: baseEnvironment.DATABASE_SSL ? { rejectUnauthorized: true } : false,
    });
    await adminClient.connect();
    await adminClient.query(`CREATE DATABASE ${name} TEMPLATE template0`);
    await runner({
      checkOrder: false,
      databaseUrl: databaseUrl(baseEnvironment.DATABASE_URL, name),
      dir: fileURLToPath(new URL("../../../migrations", import.meta.url)),
      direction: "up",
      log: () => undefined,
      migrationsTable: "pgmigrations",
      singleTransaction: false,
    });
    environment = {
      ...baseEnvironment,
      APP_ENV: "test",
      DATABASE_URL: databaseUrl(baseEnvironment.DATABASE_URL, name),
    };
    database = createDatabase(environment);
  });

  afterAll(async () => {
    await database.close();
    const name = new URL(environment.DATABASE_URL).pathname.slice(1);
    await adminClient.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [name],
    );
    await adminClient.query(`DROP DATABASE IF EXISTS ${name}`);
    await adminClient.end();
  });

  it("keeps an app-reported success unverified and owner scoped", async () => {
    const app = createApp({ database, environment, logger: pino({ enabled: false }) });
    const registration = await request(app).post("/api/v1/auth/register").send({
      displayName: "UPI User",
      email: "upi@example.com",
      locale: "en-IN",
      password: "StrongSecret1234",
      preferredCurrency: "INR",
      theme: "light",
      timezone: "Asia/Kolkata",
    });
    expect(registration.status, JSON.stringify(registration.body)).toBe(201);
    const registrationBody = registration.body as AuthBody;
    const token = registrationBody.data.accessToken;
    const userId = registrationBody.data.user.id;

    const unauthenticated = await request(app).post("/api/v1/payments/create").send({});
    expect(unauthenticated.status).toBe(401);

    const created = await request(app)
      .post("/api/v1/payments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "125.50",
        currency: "INR",
        note: "Changed client note",
        payeeName: "Changed client name",
        payeeUpiId: "merchant@bank",
        qrUpiUri:
          "upi://pay?pa=merchant%40bank&pn=Cafe&am=125.50&tn=Lunch&cu=INR&mc=5812&mode=02&orgid=000000&tr=MERCHANT-1&sign=abc%2B123",
        selectedUpiApp: "Google Pay",
        source: "QR_SCAN",
      });

    expect(created.status).toBe(201);
    const createdBody = created.body as PaymentBody;
    expect(createdBody.data.upiUri).toBe(
      "upi://pay?pa=merchant%40bank&pn=Cafe&am=125.50&tn=Lunch&cu=INR&mc=5812&mode=02&orgid=000000&tr=MERCHANT-1&sign=abc%2B123",
    );
    expect(createdBody.data.verificationStatus).toBe("UNVERIFIED");

    const mismatch = await request(app)
      .post("/api/v1/payments/update-status")
      .set("Authorization", `Bearer ${token}`)
      .send({
        appReportedStatus: "SUCCESS",
        paymentId: createdBody.data.id,
        selectedUpiApp: "PhonePe",
      });
    expect(mismatch.status).toBe(409);

    const updated = await request(app)
      .post("/api/v1/payments/update-status")
      .set("Authorization", `Bearer ${token}`)
      .send({
        appReportedStatus: "SUCCESS",
        paymentId: createdBody.data.id,
        rawResponse: "Status=SUCCESS&ApprovalRefNo=123",
        selectedUpiApp: "Google Pay",
      });
    expect(updated.status).toBe(200);
    const updatedBody = updated.body as PaymentBody;
    expect(updatedBody.data.appReportedStatus).toBe("SUCCESS");
    expect(updatedBody.data.verificationStatus).toBe("UNVERIFIED");

    const list = await request(app)
      .get(`/api/v1/payments/user/${userId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect((list.body as { data: unknown[] }).data).toHaveLength(1);

    const manual = await request(app)
      .post("/api/v1/payments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "10.00",
        currency: "INR",
        payeeUpiId: "friend@bank",
        selectedUpiApp: "BHIM",
        source: "MANUAL_ENTRY",
      });
    expect(manual.status).toBe(201);
    expect((manual.body as PaymentBody).data.upiUri).toContain("tr=NDF");

    const invalid = await request(app)
      .post("/api/v1/payments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "1.234",
        currency: "INR",
        payeeUpiId: "not-upi",
        selectedUpiApp: "BHIM",
        source: "MANUAL_ENTRY",
      });
    expect(invalid.status).toBe(422);

    const missingOriginalQr = await request(app)
      .post("/api/v1/payments/create")
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: "10.00",
        currency: "INR",
        payeeUpiId: "merchant@bank",
        selectedUpiApp: "PhonePe",
        source: "QR_SCAN",
      });
    expect(missingOriginalQr.status).toBe(422);
  });
});
