import { getHealth } from "./src/client";

async function main(): Promise<void> {
  try {
    const { data } = await getHealth();

    console.log("Health endpoint response:", data);
  } catch (error) {
    console.error("Failed to reach health endpoint:", error);
  }
}

void main();
