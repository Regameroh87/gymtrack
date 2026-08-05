// Verifica la firma SigV4 de migrate-videos-to-r2.mjs contra los vectores de
// prueba publicados por AWS. R2 habla el mismo protocolo que S3, así que si la
// firma reproduce los ejemplos de la documentación de AWS, sirve para R2.
//
// Uso:  node --test scripts/migrate-videos-to-r2.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { sigV4 } from "./migrate-videos-to-r2.mjs";

// Credenciales de ejemplo de la documentación de AWS (no son reales).
const ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

// "Example: GET Object" de la guía de Signature Version 4 (transferencia del
// payload en un solo chunk).
test("GET Object con header Range", () => {
  const { signature } = sigV4({
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    headers: {
      host: "examplebucket.s3.amazonaws.com",
      range: "bytes=0-9",
      "x-amz-content-sha256": EMPTY_SHA256,
      "x-amz-date": "20130524T000000Z",
    },
    payloadHash: EMPTY_SHA256,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: "us-east-1",
    service: "s3",
    amzDate: "20130524T000000Z",
  });

  assert.equal(
    signature,
    "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41"
  );
});

// "Example: PUT Object" de la misma guía: es la operación que usa el script
// para subir cada video, con content-type y un payload no vacío firmados.
test("PUT Object con payload", () => {
  const payloadHash = createHash("sha256").update("Welcome to Amazon S3.").digest("hex");

  const { signature } = sigV4({
    method: "PUT",
    url: "https://examplebucket.s3.amazonaws.com/test%24file.text",
    headers: {
      date: "Fri, 24 May 2013 00:00:00 GMT",
      host: "examplebucket.s3.amazonaws.com",
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": "20130524T000000Z",
      "x-amz-storage-class": "REDUCED_REDUNDANCY",
    },
    payloadHash,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: "us-east-1",
    service: "s3",
    amzDate: "20130524T000000Z",
  });

  assert.equal(
    signature,
    "98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd"
  );
});

// El orden de los headers en la firma canónica es alfabético, no el de
// inserción: mandarlos desordenados tiene que dar la misma firma.
test("el orden de inserción de los headers no cambia la firma", () => {
  const base = {
    method: "GET",
    url: "https://examplebucket.s3.amazonaws.com/test.txt",
    payloadHash: EMPTY_SHA256,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
    region: "us-east-1",
    service: "s3",
    amzDate: "20130524T000000Z",
  };

  const ordenado = sigV4({
    ...base,
    headers: {
      host: "examplebucket.s3.amazonaws.com",
      range: "bytes=0-9",
      "x-amz-content-sha256": EMPTY_SHA256,
      "x-amz-date": "20130524T000000Z",
    },
  });

  const desordenado = sigV4({
    ...base,
    headers: {
      "x-amz-date": "20130524T000000Z",
      range: "bytes=0-9",
      "x-amz-content-sha256": EMPTY_SHA256,
      host: "examplebucket.s3.amazonaws.com",
    },
  });

  assert.equal(ordenado.signature, desordenado.signature);
});
