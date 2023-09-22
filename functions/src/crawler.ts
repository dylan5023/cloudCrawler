import * as puppeteer from "puppeteer";
import { Article } from "./types";
import { Database, db } from "./firebase";

export default class Crawler {
  // intialization browser
  async initBrowser() {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-sandbox",
        "--no-zygote",
        "--single-process",
        "--proxy-server='direct://'",
        "--proxy-bypass-list=*",
        "--deterministic-fetch",
      ],
    });
    return browser;
  }

  async getArticles(page: puppeteer.Page) {
    return page.evaluate(() => {
      const elements = document.querySelectorAll(
        "article h2, article h3, article div.h > img, article div.l > img, article div.hw > div > div.bl > a > p, article div.l.er.ie > a:nth-child(1)"
      );
      const titleEl = document.querySelectorAll("article h2");
      const descriptionEl = document.querySelectorAll("article h3");
      const mainImageUrlEl = document.querySelectorAll("article div.h > img");
      const avaterImageUrlEl = document.querySelectorAll("article div.l > img");
      const editorEl = document.querySelectorAll(
        "article div.hw > div > div.bl > a > p"
      );
      const linkEl = document.querySelectorAll(
        "article div.l.er.ie > a:nth-child(1) "
      );

      const articles: Article[] = [];

      let obj: Article = {};

      // check if the article already exists or not
      function checkObjectKey<T>(obj: T, key: keyof T) {
        if (obj[key] === undefined) {
          return true;
        } else {
          return false;
        }
      }

      function setObjectKey<T>(obj: T, key: keyof T, value: T[keyof T]) {
        if (checkObjectKey<T>(obj, key)) {
          obj[key] = value;
        } else {
          resetObject();
        }
      }

      // if the case A is agian, make reset object
      function resetObject() {
        articles.push(obj);
        obj = {};
      }
      elements.forEach((element) => {
        switch (element.nodeName) {
          case "A":
            setObjectKey(obj, "link", (element as any).href);
            break;
          case "IMG":
            if (element.className === "l hs bx hn ho ec") {
              setObjectKey(obj, "avatarImageUrl", (element as any)?.src);
            } else if (element.className === "bw lh") {
              obj.mainImageUrl = (element as any)?.src;
              setObjectKey(obj, "mainImageUrl", (element as any)?.src);
            }
            break;
          case "H2":
            setObjectKey(obj, "title", element.innerHTML);
            break;
          case "H3":
            setObjectKey(obj, "description", element.innerHTML);
            break;
          case "P":
            setObjectKey(obj, "editor", element.innerHTML);
            break;
          default:
            break;
        }
      });
      return articles;
    });
  }

  async start() {
    const browser = await this.initBrowser();
    const page = await browser.newPage();
    const database = new Database(db);

    //   goto page
    await page.goto("https://www.medium.com/tag/react/recommended", {
      waitUntil: "domcontentloaded",
    });
    const articles = await this.getArticles(page);

    // get the data as result
    const results = await Promise.all(
      articles.map(async (article) => {
        const checkExist = await database.getData(
          "article",
          "title",
          article.title as string
        );

        if (checkExist.length > 0) {
          return null;
        } else {
          const doc = await database.addData("articles", article);
          return doc.id;
        }
      })
    );

    console.log(results);
    await browser.close();
  }
}
