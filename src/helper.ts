import config from "./config";

export function createServerURL(path: string) {
  return encodeURIComponent(config.backend.domain + path);
}

