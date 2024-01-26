import config from "./config";

export function createServerURL(path: string) {
  return encodeURIComponent(config.backend.domain + path);
}

export function createFullName(firstName?: string, lastName?: string): string {
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  } else if (firstName) {
    return firstName;
  } else if (lastName) {
    return lastName;
  } else {
    return "";
  }
}
