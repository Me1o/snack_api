import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import * as Sources from './sources.json';
import { Post, postCategory } from './entities/posts.entity';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import OpenAI from 'openai';
import { env, title } from 'node:process';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from '@nestjs/cache-manager';

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  //@Cron('*/10 * * * *')
  @Cron('* * * * *')
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
      const isoDate = new Date(i.isoDate);
      const today = new Date();
      const minsAgo = new Date(today.getTime() - 10 * 60 * 1000);
      if (isoDate > minsAgo) {
        const post = new Post();
        post.source = source;
        post.title = i.title;
        post.text = i.contentSnippet;
        post.link = i.link;
        post.category = [];
        posts.push(post);
      }
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

  async getPosts(page: number, userId?: number, category?: postCategory) {
    const WhereOrs = [];

    if (userId || category) {
      let prefrences = {};
      if (userId) {
        prefrences = await this.prisma.preferences.findFirst({
          where: { userId: userId },
        });
      }
      let prefObject = {};
      if (category) {
        const key = category.toLowerCase();
        prefObject = {};
        prefObject[key] = prefrences[key];
      } else prefObject = prefrences;

      for (const [key, value] of Object.entries(prefObject)) {
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
          } else {
            WhereOrs.push({
              AND: [
                {
                  category: {
                    has: topic,
                  },
                },
                {
                  country: {
                    contains: '',
                  },
                },
              ],
            });
          }
        }
      }
    }

    const sharedWhereClause = {
      OR: WhereOrs,
    };

    const filter = sharedWhereClause.OR.length > 0 ? sharedWhereClause : {};

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
    const twentyFourHoursAgo = new Date(today.getTime() - 48 * 60 * 60 * 1000);
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
        '. what is this text about about and under what of the following categories does it fall: Politics, Sports, Culture, Economics, Entertainment, Science, Business, Technology, Legal. also, what country/ countries does this relate to (using ISO 3166-1 alpha-3 codes) or WORLD if no country. respond as {"country": "SDN, QAT", "category": "Sports, Politics"}';
      try {
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
      } catch (error) {
        Logger.error(error);
      }
    });
  }

  @Cron('*/8 * * * *')
  async tweet() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const countries = require('i18n-iso-countries');
    const today = new Date();
    const hourAgo = new Date(today.getTime() - 1 * 60 * 60 * 1000);
    const post = await this.prisma.post.findFirst({
      where: {
        AND: [
          { tweeted: false },
          {
            category: {
              isEmpty: false,
            },
          },
          {
            imageUrl: {
              not: 'null',
            },
          },
          {
            imageUrl: {
              not: '',
            },
          },
          {
            createdAt: {
              gte: hourAgo,
            },
          },
        ],
      },
    });
    if (!post) return;

    let tags = '';
    if (post.country != '') {
      const postCountries = post.country.split(',');
      postCountries.forEach((c) => {
        c = c.trim();
        let name = countries.getName(c, 'ar');
        if (name != 'undefined' && name != undefined) {
          name = name.trim();
          name = name.replaceAll(' ', '_');
          tags = tags + ' #' + name;
        }
      });
    }
    const tweet =
      post.title + ' ' + '\n' + tags + '\n' + 'المزيد علي: https://snakat.app/';

    const webhook =
      'https://maker.ifttt.com/trigger/hooked/json/with/key/bItr6_qmQgxJ6wy_UCo70i';

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: tweet, img: post.imageUrl }),
    });

    if (!response.ok) {
      throw new Error(
        `Webhook call failed: ${response.status} ${response.statusText}`,
      );
    }
    await this.prisma.post.update({
      where: { id: post.id },
      data: {
        tweeted: true,
      },
    });
  }

  async analize(id: string, ip: string) {
    const analysis = await this.cacheManager.get('analysis-' + id);
    let credit: number = await this.cacheManager.get('credit-' + ip);
    if (credit == undefined) {
      credit = 3;
    }
    if (analysis) return { data: analysis, ok: true, cached: true };
    if (credit == 0)
      return {
        data: 'لقد تجاوزت الحد، حاول مرة اخرى خلال ٥ دقائق',
        ok: false,
        cached: false,
      };
    const postId = parseInt(id);
    let verdict = '';
    const post = await this.prisma.post.findFirst({
      where: { id: postId },
    });
    if (!post) return { data: verdict, ok: false, cached: false };

    const openai = new OpenAI({
      apiKey: env.OPENAIKEY,
    });

    const query =
      'i will give you an article title and text, i need you to analyze it in arabic. title:' +
      post.title +
      ', text:' +
      post.text;

    try {
      const completion = openai.chat.completions.create({
        model: 'gpt-4o-mini',
        store: true,
        messages: [{ role: 'user', content: query }],
      });

      await completion.then(async (result) => {
        if (result.choices[0].message.refusal == null) {
          verdict = result.choices[0].message.content;
          await this.cacheManager.set('analysis-' + postId, verdict, 864000000);
        }
      });
      await this.cacheManager.set('credit-' + ip, credit - 1, 300000);
      return { data: verdict, ok: true, cached: false };
    } catch (error) {
      Logger.error(error);
      return { data: null, ok: false, cached: false };
    }
  }
}
