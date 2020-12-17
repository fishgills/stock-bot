import yaml from "js-yaml";
import fs from "fs";
import axios from "axios";
import parser from "node-html-parser";
import url from "url";
import Table from "cli-table";
import puppeteer from "puppeteer";
import notifier from "node-notifier";

const width = 1920;
const height = 1080;

const config_path = "./config.yml";
const link_base =
  "https://secure.newegg.com/Shopping/AddtoCart.aspx?Submit=ADD&ItemList=";

console.log(`Loading config from`, config_path);
const config = yaml.safeLoad(fs.readFileSync(config_path, "utf-8")) as any;

console.log(config);

const delay = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const baseName = (str: string) => {
  let base = new String(str).substring(str.lastIndexOf("/") + 1);
  if (base.lastIndexOf(".") != -1)
    base = base.substring(0, base.lastIndexOf("."));
  return base;
};

const connectBrowser = async (url: string) => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      // "--user-data-dir=./bot-data",
      `--window-size=${width},${height}`,
    ],
    defaultViewport: {
      width,
      height,
    },
  });
  const page = await browser.newPage();
  await page.goto(url); // Goto add product

  const button = await page.waitForSelector(".item-added button.btn-primary", {
    visible: true,
  });
  await button.click();
  await delay(500);
  const checkout = await page.waitForSelector(
    ".summary-actions button.btn-primary",
    {
      visible: true,
    }
  );
  await checkout.click();
  await page.waitForNavigation({ waitUntil: "networkidle0" });
  const cvv = await page.waitForSelector("input.mask-cvv-4", {
    visible: true,
  });
  cvv.type("436");
  const [label] = await page.$x('//label[contains(., "Subscribe")]');
  if (label) {
    await label.click();
  }
};

const getStock = async () => {
  console.log("Get Stock started");

  const result = await axios.get(config.sites.newegg_3080, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/72.0",
    },
  });

  console.log("Got search result");

  const root = parser(result.data);
  const cells = root.querySelectorAll(".item-cell");

  const table = new Table({
    head: ["ID", "In Stock", "Name", "Link"],
    colWidths: [20, 10, 50, 150],
  });
  let inStock = false;

  for (let i = 0; cells[i]; i++) {
    let cell = cells[i];

    const anchor = cell.querySelector(".item-title");

    if (!anchor) {
      continue;
    }

    const title = anchor.childNodes[0].rawText;
    const link = anchor.getAttribute("href") as string;
    const parsed_url = url.parse(link, true);
    const item_id = parsed_url.query.Item
      ? parsed_url.query.Item
      : baseName(parsed_url.pathname as string);

    if (cell.querySelector(".item-operate .item-button-area button.btn")) {
      inStock = true;
    }

    table.push([item_id, inStock, title, link]);

    if (inStock) {
      const toopen = link_base + item_id;
      console.log(title);
      console.log("Open:", toopen);
      connectBrowser(toopen);
    }
  }

  console.log(table.toString());
  if (inStock) {
    notifier.notify("In Stock!");
    return 30000;
  } else {
    return 3000;
  }
};

const poll = async (fn: () => Promise<number>) => {
  let ms = await fn();
  while (true) {
    console.log("Loop");
    await wait(ms);
    ms = await fn();
  }
};

const wait = (ms = 1000) => {
  return new Promise((resolve) => {
    console.log(`waiting ${ms} ms...`);
    setTimeout(resolve, ms);
  });
};

(async () => {
  await poll(getStock);
})();
