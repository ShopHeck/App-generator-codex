/**
 * Supabase Storage service for persisting export artifacts.
 *
 * Uploads gzip archive buffers to Supabase Storage and returns signed
 * download URLs that expire after `signedUrlTtlSeconds` seconds.
 *
 * Bucket name is configurable via the STORAGE_BUCKET env var (default:
 * "exports").  The bucket must exist and have the correct RLS / access
 * policies before calling upload().
 *
 * Required env vars (when using defaults):
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key
 *   STORAGE_BUCKET            — storage bucket name (default: "exports")
 */

export class StorageService {
  /**
   * @param {object} opts
   * @param {import('@supabase/supabase-js').SupabaseClient} opts.supabaseClient
   * @param {string}  [opts.bucket]                — bucket name (default: "exports")
   * @param {number}  [opts.signedUrlTtlSeconds]    — URL validity (default: 3600)
   */
  constructor({ supabaseClient, bucket, signedUrlTtlSeconds } = {}) {
    if (!supabaseClient) {
      throw new Error("StorageService requires a supabaseClient.");
    }

    this.storage = supabaseClient.storage;
    this.bucket = bucket ?? process.env.STORAGE_BUCKET ?? "exports";
    this.signedUrlTtlSeconds = signedUrlTtlSeconds ?? 3600;
  }

  /**
   * Upload a Buffer to Supabase Storage and return metadata including a
   * signed download URL.
   *
   * @param {object}       opts
   * @param {string}       opts.tenantId    — used to scope the storage path
   * @param {string}       opts.projectId
   * @param {string}       opts.jobId       — export job id (used in filename)
   * @param {Buffer}       opts.data        — gzip archive
   * @param {string}       [opts.format]    — "zip" | "tar" (default "zip")
   * @returns {Promise<{ storagePath: string, storageUrl: string, expiresAt: string }>}
   */
  async upload({ tenantId, projectId, jobId, data, format = "zip" }) {
    if (!tenantId || !projectId || !jobId || !Buffer.isBuffer(data)) {
      throw new Error("upload requires tenantId, projectId, jobId, and a Buffer.");
    }

    const storagePath = `${tenantId}/${projectId}/${jobId}.${format}.gz`;

    const { error: uploadError } = await this.storage
      .from(this.bucket)
      .upload(storagePath, data, {
        contentType: "application/gzip",
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData, error: urlError } = await this.storage
      .from(this.bucket)
      .createSignedUrl(storagePath, this.signedUrlTtlSeconds);

    if (urlError) {
      throw new Error(`Signed URL creation failed: ${urlError.message}`);
    }

    const expiresAt = new Date(Date.now() + this.signedUrlTtlSeconds * 1000).toISOString();

    return {
      storagePath,
      storageUrl: urlData.signedUrl,
      expiresAt
    };
  }

  /**
   * Delete a stored artifact by its storage path.
   * Used by the expiry worker to clean up expired exports.
   *
   * @param {string} storagePath
   */
  async delete(storagePath) {
    const { error } = await this.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }
}
