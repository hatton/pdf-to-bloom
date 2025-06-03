import * as fs from "fs/promises"; // Use promises API for async file operations
import * as path from "path";
import os from "os"; // For temporary directory creation
import chalk from "chalk";
import { Language } from "@pdf-to-bloom/lib";

// --- Helper Functions from original code, slightly adapted for async/promises ---

export function getApiKeys(options: any) {
  const mistralKey = options.mistralApiKey || process.env.MISTRAL_API_KEY;
  const openrouterKey = options.openrouterKey || process.env.OPENROUTER_KEY;
  return { mistralKey, openrouterKey };
}

export async function createTempDir(): Promise<string> {
  // Creates a unique temporary directory
  return fs.mkdtemp(path.join(os.tmpdir(), "pdf-to-bloom-"));
}

export async function cleanUpTempDir(dirPath: string) {
  if (dirPath && (await fileExists(dirPath))) {
    await fs.rm(dirPath, { recursive: true, force: true });
    console.log(chalk.gray(`Cleaned up temporary directory: ${dirPath}`));
  }
}

export async function copyFileToDest(src: string, dest: string) {
  await fs.mkdir(path.dirname(dest), { recursive: true }); // Ensure target directory exists
  await fs.copyFile(src, dest);
}

export function createLogCallback(showVerbose: boolean) {
  return (log: any) => {
    switch (log.level) {
      case "error":
        console.error(chalk.red(`❌ ${log.message}`));
        break;
      case "info":
        console.info(chalk.blue(`${log.message}`));
        break;
      case "warn":
        console.warn(chalk.yellow(`⚠️ ${log.message}`));
        break;

      case "verbose":
        if (showVerbose) {
          console.log(chalk.gray(`${log.message}`));
        }
        break;
    }
  };
}
export async function isDirectory(inputPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(inputPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

// More robust check for YAML front matter presence
export async function checkIfEnriched(filePath: string): Promise<boolean> {
  if (!(await fileExists(filePath))) return false;
  const content = await fs.readFile(filePath, "utf-8");
  // Check for '---' at the very beginning (trimmed), followed by content, then another '---'
  // (which typically implies a YAML block end marker, on a new line or not)
  return content.trim().startsWith("---") && content.includes("---", 3);
}

export function getFileNameWithoutExtension(filePath: string): string {
  return path.parse(filePath).name;
}

export function getFileExtension(filePath: string): string {
  return path.parse(filePath).ext;
}

export async function findMarkdownFileInDirectory(
  dirPath: string
): Promise<string | null> {
  const files = await fs.readdir(dirPath);
  const mdFiles = files.filter((f) => f.toLowerCase().endsWith(".md"));
  if (mdFiles.length === 0) {
    return null;
  } else if (mdFiles.length === 1) {
    return path.join(dirPath, mdFiles[0]);
  } else {
    // If multiple .md files exist, warn and pick the first one as per original code.
    // In a real-world scenario, you might want to throw an error or ask the user to specify.
    console.warn(
      chalk.yellow(
        `Warning: Multiple .md files found in ${dirPath}. Using the first one: ${mdFiles[0]}`
      )
    );
    return path.join(dirPath, mdFiles[0]);
  }
}
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/* example Bloom Collection Settings:
<?xml version="1.0" encoding="utf-8"?>
<Collection version="0.2">
  <Language1Name>Edolo</Language1Name>
  <Language1Iso639Code>etr</Language1Iso639Code>
  <Language2Name>Tok Pisin</Language2Name>
  <Language2Iso639Code>tpi</Language2Iso639Code>
  <Language3Name>English</Language3Name>
  <Language3Iso639Code>en</Language3Iso639Code>
</Collection>
*/
export async function readBloomCollectionSettingsIfFound(
  folderPath: string
): Promise<{ l1?: Language; l2?: Language; l3?: Language } | null> {
  const settingsFilePath = path.join(folderPath, "collection-settings.xml");
  if (!(await fileExists(settingsFilePath))) {
    return null; // No settings file found
  }

  try {
    const content = await fs.readFile(settingsFilePath, "utf-8");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "application/xml");

    const l1Name = xmlDoc.querySelector("Language1Name")?.textContent;
    const l1IsoCode = xmlDoc.querySelector("Language1Iso639Code")?.textContent;
    const l2Name = xmlDoc.querySelector("Language2Name")?.textContent;
    const l2IsoCode = xmlDoc.querySelector("Language2Iso639Code")?.textContent;
    const l3Name = xmlDoc.querySelector("Language3Name")?.textContent;
    const l3IsoCode = xmlDoc.querySelector("Language3Iso639Code")?.textContent;

    return {
      l1: l1Name && l1IsoCode ? { tag: l1IsoCode, name: l1Name } : undefined,
      l2: l2Name && l2IsoCode ? { tag: l2IsoCode, name: l2Name } : undefined,
      l3: l3Name && l3IsoCode ? { tag: l3IsoCode, name: l3Name } : undefined,
    };
  } catch (error) {
    console.error(
      chalk.red(`Error reading Bloom collection settings: ${error}`)
    );
    throw error;
    return null;
  }
}
