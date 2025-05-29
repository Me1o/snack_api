import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import * as Sources from './sources.json';
import { Post, postCategory } from './entities/posts.entity';
import { paginate } from 'nestjs-prisma-pagination';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/10 * * * *')
  parsePosts() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Parser = require('rss-parser');
    const parser = new Parser();
    Sources.forEach(async (s) => {
      const feed = await parser.parseURL(s.url);
      let posts: Post[] = [];
      if (feed.link == 'https://www.ajnet.me') {
        //aljazeera feed
        posts = await this.parseAljazeeraFeed(feed.items);
        Logger.log(posts);
        posts.forEach((p) => this.savePostIfNotSaved(p));
      }
    });
  }

  async parseAljazeeraFeed(items: any): Promise<Post[]> {
    const posts: Post[] = [];
    await items.forEach(async (i: any) => {
      const post = new Post();
      post.source = 'aljazeera';
      post.title = i.title;
      post.text = i.contentSnippet;
      post.link = i.link;
      post.category = [postCategory.Politics];
      posts.push(post);
    });
    return posts;
  }

  @Cron('* * * * *')
  async getAljazeeraImage() {
    const post = await this.prisma.post.findFirst({
      where: { AND: [{ source: 'aljazeera' }, { imageUrl: '' }] },
    });
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

  async getPosts(page: number) {
    // const query = paginate(
    //   {
    //     page: 1,
    //     limit: 10,
    //     from: '2023-01-01T00:00:00.000Z',
    //     to: '2023-12-31T22:59:59.000Z',
    //     search: 'foo',
    //   },
    //   {
    //     dateAttr: 'at',
    //     enabled: false,
    //     includes: ['post', 'user.agent.auth'],
    //     search: ['fullname', 'reference'],
    //     orderBy: { fullname: 'asc' },
    //   },
    // );

    const query = paginate({
      page: page,
      limit: 10,
    });
    const result = await this.prisma.post.findMany(query);
    const total = await this.prisma.post.count;
    return { data: result, total: total, page: page };
  }

  // async get(token: number) {
  //   const session = await this.prisma.session.findUnique({
  //     where: { token: token },
  //   });
  //   return session;
  // }

  // start(dto: CreateSessionDto) {
  //   return this.prisma.session.create({
  //     data: {
  //       senderIP: dto.clientIP,
  //       senderClient: dto.clientName,
  //       fileName: dto.fileName,
  //       fileSize: dto.fileSize,
  //       fileURI: dto.fileURI,
  //       token: this.generateToken(),
  //     },
  //   });
  // }

  // join(dto: JoinSessionDto) {
  //   return this.prisma.session.update({
  //     where: { token: dto.token },
  //     data: {
  //       recieverIP: dto.clientIP,
  //       senderClient: dto.clientName,
  //       status: 'JOINED',
  //     },
  //   });
  // }

  // update(dto: UpdateSessionDto) {
  //   return this.prisma.session.update({
  //     where: { token: dto.token },
  //     data: {
  //       status: dto.status,
  //     },
  //   });
  // }

  // generateToken() {
  //   const minCeiled = Math.ceil(0);
  //   const maxFloored = Math.floor(99999);
  //   return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled);
  // }
}
