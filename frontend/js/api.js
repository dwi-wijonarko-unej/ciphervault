const API = (() => {
  const storedBaseUrl = localStorage.getItem("cv_api_base_url");
  const BASE_URL =
    storedBaseUrl && /^https?:\/\//.test(storedBaseUrl)
      ? storedBaseUrl
      : window.location.origin;
  const REQUEST_TIMEOUT_MS = 15000;
  let useMock = localStorage.getItem("cv_use_mock") === "1";

  function getToken() {
    return localStorage.getItem("cv_token");
  }

  function setToken(token) {
    localStorage.setItem("cv_token", token);
  }

  function clearToken() {
    localStorage.removeItem("cv_token");
  }

  function getHeaders(isFormData = false) {
    const headers = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  async function request(method, path, body = null, isFormData = false) {
    const isAuthPath = path.startsWith("/auth");
    if (useMock && !isAuthPath) {
      return mockHandler(method, path, body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: getHeaders(isFormData),
        body: body ? (isFormData ? body : JSON.stringify(body)) : null,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      throw {
        detail:
          error?.name === "AbortError"
            ? `Request timeout after ${REQUEST_TIMEOUT_MS / 1000}s`
            : `Cannot connect to API at ${BASE_URL}`,
        statusCode: 0,
      };
    }

    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : { detail: await res.text() };

    if (!res.ok) {
      const errorPayload = {
        ...payload,
        statusCode: res.status,
      };

      if (res.status === 401 && !isAuthPath) {
        clearToken();
        if (!window.location.pathname.endsWith("/login.html")) {
          window.location.href = "login.html";
        }
      }

      throw errorPayload;
    }
    return payload;
  }

  function mockHandler(method, path, body) {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          try {
            const result = MockRouter.handle(method, path, body);
            resolve(result);
          } catch (e) {
            reject(e);
          }
        },
        400 + Math.random() * 600,
      );
    });
  }

  return {
    getToken,
    setToken,
    clearToken,
    request,
    getBaseUrl: () => BASE_URL,
    setUseMock: (v) => {
      useMock = v;
    },
  };
})();

const MockRouter = (() => {
  let fileIdCounter = 10;
  let shareIdCounter = 5;

  const users = {
    demo: {
      id: 1,
      username: "demo",
      email: "demo@ciphervault.dev",
      password: "demo123",
      created_at: "2026-06-01T08:00:00Z",
    },
  };

  let currentUser = null;

  const files = [
    {
      id: 1,
      owner_id: 1,
      filename_original: "Proposal_Riset.pdf",
      filename_stored: "a1b2.enc",
      file_size_original: 2457600,
      file_size_encrypted: 2457900,
      mime_type: "application/pdf",
      created_at: "2026-07-01T10:30:00Z",
      updated_at: "2026-07-01T10:30:00Z",
    },
    {
      id: 2,
      owner_id: 1,
      filename_original: "Foto_Tim.jpg",
      filename_stored: "c3d4.enc",
      file_size_original: 4194304,
      file_size_encrypted: 4194600,
      mime_type: "image/jpeg",
      created_at: "2026-07-02T14:15:00Z",
      updated_at: "2026-07-02T14:15:00Z",
    },
    {
      id: 3,
      owner_id: 1,
      filename_original: "Laporan_Keuangan.xlsx",
      filename_stored: "e5f6.enc",
      file_size_original: 1048576,
      file_size_encrypted: 1048800,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      created_at: "2026-07-03T09:00:00Z",
      updated_at: "2026-07-03T09:00:00Z",
    },
    {
      id: 4,
      owner_id: 1,
      filename_original: "Source_Code_v2.zip",
      filename_stored: "g7h8.enc",
      file_size_original: 8388608,
      file_size_encrypted: 8389000,
      mime_type: "application/zip",
      created_at: "2026-07-04T16:45:00Z",
      updated_at: "2026-07-04T16:45:00Z",
    },
    {
      id: 5,
      owner_id: 1,
      filename_original: "README.md",
      filename_stored: "i9j0.enc",
      file_size_original: 3584,
      file_size_encrypted: 3800,
      mime_type: "text/markdown",
      created_at: "2026-07-05T11:20:00Z",
      updated_at: "2026-07-05T11:20:00Z",
    },
    {
      id: 6,
      owner_id: 1,
      filename_original: "presentasi_q3.pptx",
      filename_stored: "k1l2.enc",
      file_size_original: 5242880,
      file_size_encrypted: 5243200,
      mime_type:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      created_at: "2026-07-06T08:00:00Z",
      updated_at: "2026-07-06T08:00:00Z",
    },
    {
      id: 7,
      owner_id: 2,
      filename_original: "dokumentasi_api.html",
      filename_stored: "m3n4.enc",
      file_size_original: 12288,
      file_size_encrypted: 13100,
      mime_type: "text/html",
      created_at: "2026-07-04T11:00:00Z",
      updated_at: "2026-07-04T11:00:00Z",
    },
    {
      id: 8,
      owner_id: 2,
      filename_original: "logo_company.png",
      filename_stored: "o5p6.enc",
      file_size_original: 65536,
      file_size_encrypted: 65800,
      mime_type: "image/png",
      created_at: "2026-07-03T15:30:00Z",
      updated_at: "2026-07-03T15:30:00Z",
    },
  ];

  const shares = [
    {
      id: 1,
      file_id: 1,
      owner_id: 1,
      recipient_id: 2,
      access_token: "tok_abc123",
      created_at: "2026-07-03T12:00:00Z",
      expires_at: null,
    },
    {
      id: 2,
      file_id: 7,
      owner_id: 2,
      recipient_id: 1,
      access_token: "tok_def456",
      created_at: "2026-07-04T12:00:00Z",
      expires_at: null,
    },
    {
      id: 3,
      file_id: 8,
      owner_id: 2,
      recipient_id: 1,
      access_token: "tok_ghi789",
      created_at: "2026-07-05T09:00:00Z",
      expires_at: "2026-08-01T00:00:00Z",
    },
    {
      id: 4,
      file_id: 3,
      owner_id: 1,
      recipient_id: 3,
      access_token: "tok_jkl012",
      created_at: "2026-07-06T10:00:00Z",
      expires_at: null,
    },
  ];

  const activities = [
    {
      id: 1,
      user_id: 1,
      action: "upload",
      file_id: 5,
      file_name: "README.md",
      timestamp: "2026-07-05T11:20:00Z",
      details: "File uploaded — encrypted with UHC + hybrid AES/RSA",
    },
    {
      id: 2,
      user_id: 1,
      action: "share",
      file_id: 1,
      file_name: "Proposal_Riset.pdf",
      timestamp: "2026-07-03T12:00:00Z",
      details: "Shared with user budi",
    },
    {
      id: 3,
      user_id: 1,
      action: "upload",
      file_id: 4,
      file_name: "Source_Code_v2.zip",
      timestamp: "2026-07-04T16:45:00Z",
      details: "File uploaded — adaptive_split ratio 0.95",
    },
    {
      id: 4,
      user_id: 1,
      action: "verify",
      file_id: 2,
      file_name: "Foto_Tim.jpg",
      timestamp: "2026-07-05T14:00:00Z",
      details: "Integrity check passed (SHA-256)",
    },
    {
      id: 5,
      user_id: 1,
      action: "upload",
      file_id: 3,
      file_name: "Laporan_Keuangan.xlsx",
      timestamp: "2026-07-03T09:00:00Z",
      details: "File uploaded — security score 87/100",
    },
    {
      id: 6,
      user_id: 1,
      action: "delete",
      file_id: 6,
      file_name: "draft_old.txt",
      timestamp: "2026-07-06T07:30:00Z",
      details: "File deleted permanently",
    },
    {
      id: 7,
      user_id: 1,
      action: "share",
      file_id: 3,
      file_name: "Laporan_Keuangan.xlsx",
      timestamp: "2026-07-06T10:00:00Z",
      details: "Shared with user sari",
    },
    {
      id: 8,
      user_id: 1,
      action: "login",
      file_id: null,
      file_name: null,
      timestamp: "2026-07-06T08:15:00Z",
      details: "Login from 192.168.1.10",
    },
    {
      id: 9,
      user_id: 2,
      action: "download",
      file_id: 1,
      file_name: "Proposal_Riset.pdf",
      timestamp: "2026-07-04T10:30:00Z",
      details: "Downloaded shared file — RSA unwrap + AES decrypt",
    },
    {
      id: 10,
      user_id: 1,
      action: "upload",
      file_id: 6,
      file_name: "presentasi_q3.pptx",
      timestamp: "2026-07-06T08:00:00Z",
      details: "File uploaded — matrix_size AI selected n=8",
    },
  ];

  function getUser() {
    if (!currentUser) {
      const token = API.getToken();
      if (token && token.startsWith("demo_token")) {
        currentUser = users.demo;
      } else if (token) {
        // Auth routes can use real backend JWT, but non-auth features remain mocked.
        currentUser = users.demo;
      } else {
        throw {
          detail: "Not authenticated",
          error_code: "UNAUTHORIZED",
          statusCode: 401,
        };
      }
    }
    return currentUser;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  function parsePath(path) {
    const parts = path.split("?")[0].split("/").filter(Boolean);
    return {
      parts,
      query: Object.fromEntries(
        new URLSearchParams(path.split("?")[1] || "").entries(),
      ),
    };
  }

  return {
    handle(method, path, body) {
      const { parts, query } = parsePath(path);
      const user = () => getUser();

      // Auth
      if (path === "/auth/register" && method === "POST") {
        if (users[body.username])
          throw {
            detail: "Username already exists",
            error_code: "CONFLICT",
            statusCode: 409,
          };
        users[body.username] = {
          id: Object.keys(users).length + 1,
          username: body.username,
          email: body.email,
          password: body.password,
          created_at: new Date().toISOString(),
        };
        return {
          id: users[body.username].id,
          username: body.username,
          email: body.email,
          message: "Registration successful",
        };
      }

      if (path === "/auth/login" && method === "POST") {
        const u = users[body.username];
        if (!u || u.password !== body.password)
          throw {
            detail: "Invalid username or password",
            error_code: "INVALID_CREDENTIALS",
            statusCode: 401,
          };
        currentUser = u;
        API.setToken("mock_token_" + u.id);
        return {
          access_token: "mock_token_" + u.id,
          token_type: "bearer",
          user: { id: u.id, username: u.username, email: u.email },
        };
      }

      if (path === "/auth/me" && method === "GET") {
        const u = user();
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          created_at: u.created_at,
        };
      }

      // Files
      if (path === "/files" && method === "GET") {
        const u = user();
        const page = parseInt(query.page || "1");
        const perPage = parseInt(query.per_page || "20");
        const ownedFiles = files.filter((f) => f.owner_id === u.id);
        const total = ownedFiles.length;
        const paged = ownedFiles.slice((page - 1) * perPage, page * perPage);
        return {
          items: paged.map((f) => ({
            ...f,
            file_size_formatted: formatSize(f.file_size_original),
          })),
          total,
          page,
          per_page: perPage,
          total_pages: Math.ceil(total / perPage),
        };
      }

      if (path === "/files/shared" && method === "GET") {
        const u = user();
        const sharedFiles = shares
          .filter((s) => s.recipient_id === u.id)
          .map((s) => {
            const f = files.find((f) => f.id === s.file_id);
            return f
              ? {
                  ...f,
                  file_size_formatted: formatSize(f.file_size_original),
                  shared_by:
                    users[
                      Object.keys(users).find((k) => users[k].id === s.owner_id)
                    ]?.username || "unknown",
                  access_token: s.access_token,
                }
              : null;
          })
          .filter(Boolean);
        return { items: sharedFiles, total: sharedFiles.length };
      }

      if (path.startsWith("/files/search") && method === "GET") {
        const u = user();
        const q = (query.q || "").toLowerCase();
        const ownedFiles = files.filter(
          (f) =>
            f.owner_id === u.id &&
            f.filename_original.toLowerCase().includes(q),
        );
        return {
          items: ownedFiles.map((f) => ({
            ...f,
            file_size_formatted: formatSize(f.file_size_original),
          })),
          total: ownedFiles.length,
        };
      }

      const fileMatch = path.match(/^\/files\/(\d+)$/);
      if (fileMatch && method === "GET") {
        const u = user();
        const f = files.find((f) => f.id === parseInt(fileMatch[1]));
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id) {
          const shared = shares.find(
            (s) => s.file_id === f.id && s.recipient_id === u.id,
          );
          if (!shared)
            throw {
              detail: "Access denied",
              error_code: "FORBIDDEN",
              statusCode: 403,
            };
        }
        return { ...f, file_size_formatted: formatSize(f.file_size_original) };
      }

      const downloadMatch = path.match(/^\/files\/(\d+)\/download$/);
      if (downloadMatch && method === "GET") {
        const u = user();
        const fileId = parseInt(downloadMatch[1]);
        const f = files.find((f) => f.id === fileId);
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id) {
          const shared = shares.find(
            (s) => s.file_id === f.id && s.recipient_id === u.id,
          );
          if (!shared)
            throw {
              detail: "Access denied",
              error_code: "FORBIDDEN",
              statusCode: 403,
            };
        }
        return { ...f, download_url: "#", message: "Download started" };
      }

      if (path === "/files/upload" && method === "POST") {
        const u = user();
        fileIdCounter++;
        const newFile = {
          id: fileIdCounter,
          owner_id: u.id,
          filename_original: body?.filename || "uploaded_file.bin",
          filename_stored: `enc_${fileIdCounter}.enc`,
          file_size_original: body?.size || 0,
          file_size_encrypted: (body?.size || 0) + 256,
          mime_type: body?.type || "application/octet-stream",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        files.unshift(newFile);
        activities.push({
          user_id: u.id,
          action: "upload",
          file_id: newFile.id,
          timestamp: new Date().toISOString(),
        });
        return {
          id: newFile.id,
          filename_original: newFile.filename_original,
          file_size_formatted: formatSize(newFile.file_size_original),
          message: "File uploaded and encrypted successfully",
        };
      }

      const deleteMatch = path.match(/^\/files\/(\d+)$/);
      if (deleteMatch && method === "DELETE") {
        const u = user();
        const idx = files.findIndex((f) => f.id === parseInt(deleteMatch[1]));
        if (idx === -1)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (files[idx].owner_id !== u.id)
          throw {
            detail: "Access denied",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        files.splice(idx, 1);
        activities.push({
          user_id: u.id,
          action: "delete",
          file_id: parseInt(deleteMatch[1]),
          timestamp: new Date().toISOString(),
        });
        return { message: "File deleted successfully" };
      }

      const verifyMatch = path.match(/^\/files\/(\d+)\/verify$/);
      if (verifyMatch && method === "POST") {
        const u = user();
        const f = files.find((f) => f.id === parseInt(verifyMatch[1]));
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id)
          throw {
            detail: "Access denied",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        activities.push({
          user_id: u.id,
          action: "verify",
          file_id: f.id,
          timestamp: new Date().toISOString(),
        });
        return {
          status: "passed",
          message: "Integrity check passed. File is intact.",
        };
      }

      // Share
      const shareMatch = path.match(/^\/files\/(\d+)\/share$/);
      if (shareMatch && method === "POST") {
        const u = user();
        const fileId = parseInt(shareMatch[1]);
        const f = files.find((f) => f.id === fileId);
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id)
          throw {
            detail: "Only the file owner can share",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        const recipient = users[body.recipient_username];
        if (!recipient)
          throw {
            detail: "Recipient not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (recipient.id === u.id)
          throw {
            detail: "Cannot share with yourself",
            error_code: "BAD_REQUEST",
            statusCode: 400,
          };
        const existing = shares.find(
          (s) => s.file_id === fileId && s.recipient_id === recipient.id,
        );
        if (existing)
          throw {
            detail: "File already shared with this user",
            error_code: "CONFLICT",
            statusCode: 409,
          };
        shareIdCounter++;
        const newShare = {
          id: shareIdCounter,
          file_id: fileId,
          owner_id: u.id,
          recipient_id: recipient.id,
          access_token: "tok_" + Math.random().toString(36).slice(2),
          created_at: new Date().toISOString(),
          expires_at: body.expires_in_hours
            ? new Date(
                Date.now() + body.expires_in_hours * 3600000,
              ).toISOString()
            : null,
        };
        shares.push(newShare);
        activities.push({
          user_id: u.id,
          action: "share",
          file_id: fileId,
          timestamp: new Date().toISOString(),
        });
        return {
          id: newShare.id,
          access_token: newShare.access_token,
          recipient: { id: recipient.id, username: recipient.username },
          message: "File shared successfully",
        };
      }

      const shareListMatch = path.match(/^\/files\/(\d+)\/shares$/);
      if (shareListMatch && method === "GET") {
        const u = user();
        const fileId = parseInt(shareListMatch[1]);
        const f = files.find((f) => f.id === fileId);
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id)
          throw {
            detail: "Access denied",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        const fileShares = shares.filter((s) => s.file_id === fileId);
        return {
          items: fileShares.map((s) => ({
            ...s,
            recipient: Object.values(users).find(
              (u) => u.id === s.recipient_id,
            ),
          })),
        };
      }

      const revokeMatch = path.match(/^\/shares\/(\d+)$/);
      if (revokeMatch && method === "DELETE") {
        const u = user();
        const idx = shares.findIndex((s) => s.id === parseInt(revokeMatch[1]));
        if (idx === -1)
          throw {
            detail: "Share not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (shares[idx].owner_id !== u.id)
          throw {
            detail: "Access denied",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        shares.splice(idx, 1);
        activities.push({
          user_id: u.id,
          action: "revoke",
          file_id: parseInt(revokeMatch[1]),
          timestamp: new Date().toISOString(),
        });
        return { message: "Share access revoked successfully" };
      }

      // Activity
      if (path === "/activities" && method === "GET") {
        const u = user();
        const page = parseInt(query.page || "1");
        const perPage = parseInt(query.per_page || "20");
        const userActivities = activities.filter((a) => a.user_id === u.id);
        const total = userActivities.length;
        const paged = userActivities.slice(
          (page - 1) * perPage,
          page * perPage,
        );
        return {
          items: paged,
          total,
          page,
          per_page: perPage,
          total_pages: Math.ceil(total / perPage),
        };
      }

      // System
      if (path === "/system/config" && method === "GET") {
        return {
          ai_mode: "adaptive_split",
          layer2_algorithm: "hybrid",
          uhc_modulus: 257,
          uhc_matrix_size: "auto (4 or 8)",
          uhc_logistic_r: 3.99,
          session_key_bytes: 32,
          pbkdf2_iterations: 100000,
          rsa_key_size: 2048,
          max_file_size_mb: 100,
          storage_backend: "local_disk",
          database: "sqlite",
        };
      }

      if (path === "/system/status" && method === "GET") {
        return {
          rsa_status: "ready",
          rsa_key_size: 2048,
          rsa_fingerprint:
            "a1:b2:c3:d4:e5:f6:00:11:22:33:44:55:66:77:88:99:aa:bb:cc:dd:ee:ff:00:11:22:33:44:55:66:77:88:99",
          rsa_generated_at: "2026-07-01T00:00:00Z",
          storage_files: files.length,
          storage_used: "12.4 MB",
          storage_limit: "1 GB",
          database: "SQLite",
          uptime_hours: 124,
        };
      }

      const analyzeMatch = path.match(/^\/files\/(\d+)\/analyze$/);
      if (analyzeMatch && method === "POST") {
        const u = user();
        const fileId = parseInt(analyzeMatch[1]);
        const f = files.find((f) => f.id === fileId);
        if (!f)
          throw {
            detail: "File not found",
            error_code: "NOT_FOUND",
            statusCode: 404,
          };
        if (f.owner_id !== u.id)
          throw {
            detail: "Access denied",
            error_code: "FORBIDDEN",
            statusCode: 403,
          };
        const score = 78 + Math.floor(Math.random() * 18);
        return {
          file_id: fileId,
          filename: f.filename_original,
          score,
          metrics: {
            entropy: 7.92 + (Math.random() * 0.06 - 0.03),
            correlation: Math.random() * 0.02 - 0.01,
            avalanche: 48 + Math.floor(Math.random() * 6),
            npcr: 99.5 + Math.random() * 0.4,
            uaci: 32 + Math.random() * 3,
            bit_change: 49 + Math.floor(Math.random() * 4),
            chi_square: 240 + Math.floor(Math.random() * 30),
            mutual_info: 0.02 + Math.random() * 0.03,
            compression_ratio: 1.01 + Math.random() * 0.03,
          },
          analyzed_at: new Date().toISOString(),
        };
      }

      throw {
        detail: `Not found: ${method} ${path}`,
        error_code: "NOT_FOUND",
        statusCode: 404,
      };
    },
  };
})();
