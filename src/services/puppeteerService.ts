import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import dns from "dns/promises";
import tls from "tls";

// Helper function to resolve domain information
const resolveDomain = async (domain: string) => {
  try {
    const records = await dns.resolveAny(domain);
    return records.map((record: any) => ({
      type: record.type,
      address: record.address || record.value,
    }));
  } catch (error) {
    console.error(`Failed to resolve domain: ${error}`);
    return [];
  }
};

// Helper function to fetch SSL certificate details
const getSSLCertificate = async (url: string) => {
  return new Promise((resolve, reject) => {
    const { hostname } = new URL(url);
    const socket = tls.connect(443, hostname, { servername: hostname }, () => {
      const cert = socket.getPeerCertificate();
      if (cert) {
        resolve({
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
        });
      } else {
        reject("No certificate found");
      }
      socket.end();
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
};

export const scanWebsite = async (url: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Ensure the screenshots directory exists
  const screenshotsDir = path.resolve("screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const httpTransactions: {
    url: string;
    method: string;
    status: number | null;
  }[] = [];

  page.on("request", (request) => {
    httpTransactions.push({
      url: request.url(),
      method: request.method(),
      status: null,
    });
  });

  page.on("response", (response) => {
    const transaction = httpTransactions.find((t) => t.url === response.url());
    if (transaction) {
      transaction.status = response.status();
    }
  });

  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    // Capture metadata
    const title = await page.title();
    const screenshotPath = path.join(screenshotsDir, `${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });

    const { hostname } = new URL(url);
    const domainInfo = await resolveDomain(hostname);
    const sslCertificate = await getSSLCertificate(url);

    const metadata = {
      url,
      title,
      screenshotPath,
      httpTransactions,
      domainInfo,
      sslCertificate,
    };

    await browser.close();
    return metadata;
  } catch (error: unknown) {
    await browser.close();
    throw new Error(
      `Failed to scan website: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};
