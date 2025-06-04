export const LICENSE_MAPPING: Record<string, string> = {
  "CC-BY": "http://creativecommons.org/licenses/by/4.0/",
  "CC-BY-SA": "http://creativecommons.org/licenses/by-sa/4.0/",
  "CC-BY-ND": "http://creativecommons.org/licenses/by-nd/4.0/",
  "CC-BY-NC": "http://creativecommons.org/licenses/by-nc/4.0/",
  "CC-BY-NC-SA": "http://creativecommons.org/licenses/by-nc-sa/4.0/",
  "CC-BY-NC-ND": "http://creativecommons.org/licenses/by-nc-nd/4.0/",
  CC0: "http://creativecommons.org/publicdomain/zero/1.0/",
};

export function mapLicense(license: string): string {
  // If it's already a URL, return as-is
  if (license.startsWith("http://") || license.startsWith("https://")) {
    return license;
  }

  // Look up in mapping, return mapped URL or original value
  return LICENSE_MAPPING[license] || license;
}
