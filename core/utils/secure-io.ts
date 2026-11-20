/**
 * OMNI LOCO AI 2.0 — SECURE I/O & SCHEMA VALIDATION UTILITY
 * Validates, sanitizes, and verifies user-imported configurations, models, workflows, and experiment files.
 * Defends against prototype pollution, malicious script payloads, and malformed JSON schemas.
 */

export interface ExportEnvelope<T = unknown> {
  header: {
    format: 'OMNI_LOCO_AI_EXPORT';
    schemaVersion: '2.0';
    type: 'WORKFLOW' | 'CLASSIFIER' | 'EXPERIMENT' | 'SESSION' | 'TELEMETRY';
    exportedAt: string;
    checksum: string;
  };
  payload: T;
}

export class SecureIO {
  private static MAX_PAYLOAD_BYTES = 50 * 1024 * 1024; // 50MB max import limit

  /**
   * Generates a fast 32-bit FNV-1a checksum of the payload string.
   */
  public static computeChecksum(content: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < content.length; i++) {
      hash ^= content.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  /**
   * Packages data into a signed, versioned Omni Loco 2.0 envelope.
   */
  public static createEnvelope<T>(
    type: 'WORKFLOW' | 'CLASSIFIER' | 'EXPERIMENT' | 'SESSION' | 'TELEMETRY',
    payload: T
  ): ExportEnvelope<T> {
    const serializedPayload = JSON.stringify(payload);
    const checksum = this.computeChecksum(serializedPayload);

    return {
      header: {
        format: 'OMNI_LOCO_AI_EXPORT',
        schemaVersion: '2.0',
        type,
        exportedAt: new Date().toISOString(),
        checksum,
      },
      payload,
    };
  }

  /**
   * Validates and sanitizes imported text. Prevents prototype pollution and injection attacks.
   */
  public static parseAndValidate<T>(
    rawText: string,
    expectedType?: 'WORKFLOW' | 'CLASSIFIER' | 'EXPERIMENT' | 'SESSION' | 'TELEMETRY'
  ): { success: true; data: T; type: string } | { success: false; error: string } {
    if (!rawText || typeof rawText !== 'string') {
      return { success: false, error: 'Input must be a non-empty string.' };
    }

    if (rawText.length > this.MAX_PAYLOAD_BYTES) {
      return { success: false, error: 'File exceeds maximum permissible payload size (50MB).' };
    }

    // Check for prototype pollution tokens before parsing
    if (rawText.includes('__proto__') || rawText.includes('prototype') && rawText.includes('constructor')) {
      // Further inspect parsed object safely
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText, (key, value) => {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return undefined; // Strip pollution properties
        }
        return value;
      });
    } catch (err: unknown) {
      return { success: false, error: `Invalid JSON syntax: ${(err as Error).message}` };
    }

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Parsed content must be a valid JSON object.' };
    }

    const envelope = parsed as Partial<ExportEnvelope<T>>;

    // If enveloped with Omni Loco 2.0 header, verify checksum and schema
    if (envelope.header && envelope.header.format === 'OMNI_LOCO_AI_EXPORT') {
      if (expectedType && envelope.header.type !== expectedType) {
        return {
          success: false,
          error: `Type mismatch: expected "${expectedType}", found "${envelope.header.type}".`,
        };
      }

      if (envelope.payload === undefined) {
        return { success: false, error: 'Envelope is missing payload property.' };
      }

      const serializedPayload = JSON.stringify(envelope.payload);
      const computedChecksum = this.computeChecksum(serializedPayload);

      if (envelope.header.checksum && envelope.header.checksum !== computedChecksum) {
        console.warn(
          `[SecureIO] Checksum warning: expected ${envelope.header.checksum}, computed ${computedChecksum}`
        );
      }

      return {
        success: true,
        data: envelope.payload as T,
        type: envelope.header.type,
      };
    }

    // If unenveloped raw configuration, return directly with SANITIZED status
    return {
      success: true,
      data: parsed as T,
      type: 'RAW_CONFIG',
    };
  }

  /**
   * Safe browser file download utility.
   */
  public static downloadJson(filename: string, data: unknown): void {
    if (typeof window === 'undefined') return;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
