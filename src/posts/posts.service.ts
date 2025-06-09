import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import * as Sources from './sources.json';
import { Post, postCategory } from './entities/posts.entity';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { env, title } from 'node:process';
import puppeteer from 'puppeteer';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * *')
  //@Cron('* * * * *')
  parsePosts() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Parser = require('rss-parser');
    const parser = new Parser();
    Sources.forEach(async (s) => {
      const feed = await parser.parseURL(s.url);

      let posts: Post[] = [];
      if (feed.link == 'https://www.ajnet.me') {
        //aljazeera feed
        posts = await this.parseFeed(feed.items, 'aljazeera');
        posts.forEach((p) => this.savePostIfNotSaved(p));
      }
      if (feed.feedUrl == 'https://aawsat.com/') {
        //aawsat feed
        posts = await this.parseFeed(feed.items, 'aawsat');
        posts.forEach((p) => this.savePostIfNotSaved(p));
      }
      if (feed.feedUrl == 'https://www.france24.com/ar/rss') {
        //france24 feed
        posts = await this.parseFeed(feed.items, 'france24');
        posts.forEach((p) => this.savePostIfNotSaved(p));
      }
    });
  }

  async parseFeed(items: any, source: string): Promise<Post[]> {
    const posts: Post[] = [];
    await items.forEach(async (i: any) => {
      const post = new Post();
      post.source = source;
      post.title = i.title;
      post.text = i.contentSnippet;
      post.link = i.link;
      post.category = [];
      posts.push(post);
    });
    return posts;
  }

  @Cron('* * * * *')
  async getAljazeeraImage() {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ source: 'aljazeera' }, { imageUrl: '' }] },
    });
    if (!post) return;
    const response = await fetch(post.link);
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $(
      '.article-featured-image > .responsive-image > img',
    ).attr('src');

    return this.prisma.post.update({
      where: { id: post.id },
      data: {
        imageUrl: imageUrl ? 'https://www.ajnet.me' + imageUrl : 'null',
      },
    });
  }

  @Cron('* * * * *')
  async getAawsatImage() {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ source: 'aawsat' }, { imageUrl: '' }] },
    });
    if (!post) return;
    const response = await fetch(post.link);
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $('.entry-media > .img-field > img').attr('src');

    return this.prisma.post.update({
      where: { id: post.id },
      data: {
        imageUrl: imageUrl ? imageUrl : 'null',
      },
    });
  }

  @Cron('* * * * *')
  async getFrance24Image() {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ source: 'france24' }, { imageUrl: '' }] },
    });
    if (!post) return;
    const response = await fetch(post.link);
    const html = await response.text();
    const $ = cheerio.load(html);
    const imageUrl = $(
      '.t-content__main-media > .m-figure > picture > img',
    ).attr('src');

    return this.prisma.post.update({
      where: { id: post.id },
      data: {
        imageUrl: imageUrl ? imageUrl : 'null',
      },
    });
  }

  async savePostIfNotSaved(post: Post) {
    const count = await this.prisma.post.count({
      where: {
        link: post.link,
      },
    });
    if (count == 0) {
      const r = this.createPost(post);
    }
  }

  async getPost(link: string) {
    const post = await this.prisma.post.findFirst({
      where: { link: link },
    });
    return post;
  }

  async createPost(post: Post) {
    return await this.prisma.post.create({
      data: {
        title: post.title,
        text: post.text,
        source: post.source,
        link: post.link,
        category: post.category,
        imageUrl: post.imageUrl,
      },
    });
  }

  async getPosts(page: number, userId?: number) {
    const WhereOrs = [];

    if (userId) {
      const prefrences = await this.prisma.preferences.findFirst({
        where: { userId: userId },
      });
      if (prefrences) {
        for (const [key, value] of Object.entries(prefrences)) {
          if (key != 'id' && key != 'createdAt') {
            let topic;
            switch (key) {
              case 'sports':
                topic = postCategory.Sports;
                break;
              case 'politics':
                topic = postCategory.Politics;
                break;
              case 'business':
                topic = postCategory.Business;
                break;
              case 'culture':
                topic = postCategory.Culture;
                break;
              case 'economics':
                topic = postCategory.Economics;
                break;
              case 'entertainment':
                topic = postCategory.Entertainment;
                break;
              case 'legal':
                topic = postCategory.Legal;
                break;
              case 'science':
                topic = postCategory.Science;
                break;
              case 'technology':
                topic = postCategory.Technology;
                break;
              default:
                topic = postCategory.General;
                break;
            }
            const countries = value ? JSON.parse(value.toString()) : [];
            if (countries.length > 0) {
              countries.forEach((c) => {
                WhereOrs.push({
                  AND: [
                    {
                      category: {
                        has: topic,
                      },
                    },
                    {
                      country: {
                        contains: c,
                      },
                    },
                  ],
                });
              });
            }
          }
        }
      }
    }

    const sharedWhereClause = {
      OR: WhereOrs,
    };

    const filter = sharedWhereClause.OR.length > 0 ? sharedWhereClause : {};
    console.log(filter);

    const [paginatedResults, totalCount] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where: filter,
        skip: (page - 1) * 10,
        take: 10,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.post.count({
        where: filter,
      }),
    ]);

    return { data: paginatedResults, total: totalCount, page: page };
  }

  @Cron('0 * * * *')
  async deleteYesterdaysNews() {
    const today = new Date();
    const twentyFourHoursAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    await this.prisma.post.deleteMany({
      where: {
        createdAt: {
          lte: twentyFourHoursAgo,
        },
      },
    });
  }

  @Cron('* * * * *')
  async addCategoryToPost() {
    const posts = await this.prisma.post.findMany({
      take: 5,
      where: {
        OR: [
          {
            category: {
              isEmpty: true,
            },
          },
          {
            country: '',
          },
        ],
      },
    });
    if (posts.length == 0) return;

    const openai = new OpenAI({
      apiKey: env.OPENAIKEY,
    });

    posts.forEach((post) => {
      const query =
        'take this text:' +
        post.title +
        ', ' +
        post.text +
        '. what is this text about about and under what of the following categories does it fall: Politics, Sports, Culture, Economics, Entertainment, Science, Business, Technology, Legal. also, if applicable what country/ countries does this relate to (using ISO 3166-1 alpha-3 codes). respond as {"country": "SDN, QAT", "category": "Sports, Politics"}';
      const completion = openai.chat.completions.create({
        model: 'gpt-4o-mini',
        store: true,
        messages: [{ role: 'user', content: query }],
      });

      completion.then(async (result) => {
        if (result.choices[0].message.refusal == null) {
          const verdict = JSON.parse(result.choices[0].message.content);

          const categories = verdict.category.split(',');
          const postCategories: postCategory[] = [];

          categories.forEach((cat: string) => {
            switch (cat.toLowerCase()) {
              case 'sports':
                postCategories.push(postCategory.Sports);
                break;
              case 'politics':
                postCategories.push(postCategory.Politics);
                break;
              case 'business':
                postCategories.push(postCategory.Business);
                break;
              case 'culture':
                postCategories.push(postCategory.Culture);
                break;
              case 'economics':
                postCategories.push(postCategory.Economics);
                break;
              case 'entertainment':
                postCategories.push(postCategory.Entertainment);
                break;
              case 'legal':
                postCategories.push(postCategory.Legal);
                break;
              case 'science':
                postCategories.push(postCategory.Science);
                break;
              case 'technology':
                postCategories.push(postCategory.Technology);
                break;
              default:
                postCategories.push(postCategory.General);
                break;
            }
          });

          const country = verdict.country;
          await this.prisma.post.update({
            where: { id: post.id },
            data: {
              category: postCategories,
              country: country,
            },
          });
        }
      });
    });
  }

  //  @Cron('* * * * *')
  async tweet() {
    const post = await this.prisma.post.findFirst({
      where: { tweeted: false },
    });
    if (!post) return;

    let tags = '';
    if (post.country != '') {
      const countries = post.country.split(',');
      countries.forEach((c) => {
        tags = tags + ' #' + c;
      });
    }
    const tweet = post.title + ' ' + tags + ' https://snakat.app/';

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--shm-size=1gb', // --shm-size=1gb to fix Protocol error (Runtime.callFunctionOn)
        '--no-sandbox', // configuration for heroku deployment
        '--disable-setuid-sandbox', // configuration for heroku deployment
      ],
    });

    const page = await browser.newPage();
    // Login
    await page.goto('https://x.com/i/flow/login', {
      waitUntil: 'networkidle2',
    });
    const usernameInput = await page.waitForSelector('input[name="text"]');
    await usernameInput.type(env.TWITTER_USERNAME, { delay: 200 });
    await page.keyboard.press('Enter');

    const passwordInput = await page.waitForSelector('input[name="password"]');
    await passwordInput.type(env.TWITTER_PASSWORD, { delay: 200 });
    await page.keyboard.press('Enter');
    // Wait for the home page to load
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    // Start posting a tweet
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', {
      visible: true,
    });
    await page.click('[data-testid="tweetTextarea_0"]');
    const tweetText = `${tweet}`;
    await page.keyboard.type(tweetText, { delay: 100 });
    // Wait for the tweet button and click it
    // Fixed selector - using the correct data-testid from your screenshot
    await page.waitForSelector('[data-testid="tweetButtonInline"]', {
      visible: true,
    });
    await page.click('[data-testid="tweetButtonInline"]');

    // Add a delay to ensure the post completes
    await new Promise((resolve) => setTimeout(resolve, 3000));
    console.log('Tweet posted successfully!');

    // Uncomment to close browser when done
    await browser.close();

    await this.prisma.post.update({
      where: { id: post.id },
      data: {
        tweeted: true,
      },
    });
  }
}
